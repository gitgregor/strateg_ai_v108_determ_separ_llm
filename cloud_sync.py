"""
Cloud Synchronization Engine for Strateg AI Cockpit v1.0.8
Synchronizes portfolio, active futures positions, order history, and workspace context
between desktop and mobile devices in real time via WebSockets and persistent cloud state.
"""

import json
import os
import time
import asyncio
from typing import Dict, Any, List, Optional, Set
from fastapi import WebSocket


CLOUD_STATE_FILE = os.path.join(os.path.dirname(__file__), "cloud_sync_state.json")


class CloudSyncManager:
    def __init__(self):
        self.active_websockets: Set[WebSocket] = set()
        self.connected_devices: Dict[str, Dict[str, Any]] = {}
        self.state_version: int = 1
        self.last_sync_timestamp: float = time.time()
        self.state: Dict[str, Any] = self._load_persisted_state()

    def _get_default_state(self) -> Dict[str, Any]:
        return {
            "version": 1,
            "last_updated": time.time(),
            "last_device_source": "system",
            "context": {
                "symbol": "BTC/USDT",
                "activeExchange": "Binance",
                "timeframe": "1d",
                "marketType": "FUTURES",
                "profile": "SIM",
                "isChartOpen": True
            },
            "portfolio": {
                "cash": 100000.0,
                "used_margin": 0.0,
                "total_equity": 100000.0,
                "unrealized_pnl": 0.0,
                "realized_pnl_total": 0.0
            },
            "active_positions": [],
            "closed_positions": [],
            "order_history": []
        }

    def _load_persisted_state(self) -> Dict[str, Any]:
        if os.path.exists(CLOUD_STATE_FILE):
            try:
                with open(CLOUD_STATE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.state_version = data.get("version", 1)
                    return data
            except Exception as e:
                print(f"[CloudSync] Error reading cloud state file: {e}. Using defaults.")
        return self._get_default_state()

    def persist_state(self):
        try:
            with open(CLOUD_STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[CloudSync] Error saving cloud state file: {e}")

    def register_device(self, device_id: str, device_type: str, client_ip: str = "") -> Dict[str, Any]:
        now = time.time()
        self.connected_devices[device_id] = {
            "device_id": device_id,
            "device_type": device_type,  # "desktop" or "mobile"
            "client_ip": client_ip,
            "connected_at": now,
            "last_seen": now
        }
        return self.connected_devices[device_id]

    def update_device_heartbeat(self, device_id: str):
        if device_id in self.connected_devices:
            self.connected_devices[device_id]["last_seen"] = time.time()

    def unregister_device(self, device_id: str):
        self.connected_devices.pop(device_id, None)

    def get_active_devices(self) -> List[Dict[str, Any]]:
        # Clean up stale devices (older than 45s)
        now = time.time()
        active = []
        stale_keys = []
        for dev_id, info in self.connected_devices.items():
            if now - info.get("last_seen", 0) < 45:
                active.append(info)
            else:
                stale_keys.append(dev_id)
        for k in stale_keys:
            self.connected_devices.pop(k, None)
        return active

    def get_state(self) -> Dict[str, Any]:
        return {
            **self.state,
            "version": self.state_version,
            "last_updated": self.last_sync_timestamp,
            "active_devices_count": len(self.get_active_devices()),
            "active_devices": self.get_active_devices()
        }

    def update_state(self, patch: Dict[str, Any], source_device_id: str = "unknown", source_type: str = "desktop") -> Dict[str, Any]:
        self.state_version += 1
        self.last_sync_timestamp = time.time()

        # Update nested context if provided
        if "context" in patch and isinstance(patch["context"], dict):
            self.state["context"].update(patch["context"])

        # Update portfolio if provided
        if "portfolio" in patch and isinstance(patch["portfolio"], dict):
            self.state["portfolio"].update(patch["portfolio"])

        # Update active_positions if provided
        if "active_positions" in patch:
            self.state["active_positions"] = patch["active_positions"]

        # Update closed_positions if provided
        if "closed_positions" in patch:
            self.state["closed_positions"] = patch["closed_positions"]

        # Update order_history if provided
        if "order_history" in patch:
            self.state["order_history"] = patch["order_history"]

        self.state["version"] = self.state_version
        self.state["last_updated"] = self.last_sync_timestamp
        self.state["last_device_source"] = f"{source_type}:{source_device_id}"

        # Persist to disk
        self.persist_state()

        # Update source device heartbeat
        self.update_device_heartbeat(source_device_id)

        return self.get_state()

    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)

    def unregister_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_state(self, message: Optional[Dict[str, Any]] = None):
        if not self.active_websockets:
            return

        payload = message or {
            "type": "CLOUD_SYNC_UPDATE",
            "state": self.get_state()
        }
        text = json.dumps(payload)

        stale = set()
        for ws in self.active_websockets:
            try:
                await ws.send_text(text)
            except Exception:
                stale.add(ws)

        for ws in stale:
            self.active_websockets.discard(ws)


cloud_sync_manager = CloudSyncManager()
