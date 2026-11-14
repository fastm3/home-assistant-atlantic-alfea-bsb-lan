"""Shared, serialized HTTP access to the BSB-LAN JSON API.

BSB-LAN (ESP32) handles one bus request at a time. Every JSON read or write of
the integration goes through a single client per BSB-LAN address, so requests
are queued instead of colliding, with a short pause between two bus accesses.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterable
import time
from urllib.parse import urlparse

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

_MIN_GAP_SECONDS = 0.2
_DEFAULT_TIMEOUT = 8


def valid_base_url(value: str) -> bool:
    """Only allow an explicitly configured HTTP(S) BSB-LAN origin."""
    parsed = urlparse(str(value or "").strip())
    return (parsed.scheme in ("http", "https") and bool(parsed.hostname)
            and parsed.username is None and parsed.password is None
            and not parsed.query and not parsed.fragment)


class BsbHttpClient:
    """Queue every BSB-LAN JSON request behind one lock."""

    def __init__(self, hass: HomeAssistant, base_url: str) -> None:
        self._session = async_get_clientsession(hass)
        self._base = base_url.strip().rstrip("/")
        self._lock = asyncio.Lock()
        self._last_request = 0.0

    @property
    def base_url(self) -> str:
        return self._base

    async def _request(self, method: str, path: str, payload: dict | None, timeout: float):
        async with self._lock:
            wait = _MIN_GAP_SECONDS - (time.monotonic() - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                async with asyncio.timeout(timeout):
                    async with self._session.request(
                        method, f"{self._base}{path}", json=payload
                    ) as response:
                        response.raise_for_status()
                        return await response.json(content_type=None)
            finally:
                self._last_request = time.monotonic()

    async def get_jq(self, parameters: Iterable[int | str] | int | str,
                     timeout: float = _DEFAULT_TIMEOUT) -> dict:
        """Read one or several parameters with a single /JQ request."""
        if isinstance(parameters, (int, str)):
            query = str(parameters)
        else:
            query = ",".join(str(p) for p in parameters)
        data = await self._request("GET", f"/JQ={query}", None, timeout)
        return data if isinstance(data, dict) else {}

    async def get_path(self, path: str, timeout: float = _DEFAULT_TIMEOUT) -> dict:
        """Read-only GET of a fixed BSB-LAN JSON endpoint such as /JI."""
        if path not in ("/JI",):
            raise ValueError(f"Endpoint BSB-LAN non autorisé : {path}")
        data = await self._request("GET", path, None, timeout)
        return data if isinstance(data, dict) else {}

    async def post_js(self, payload: dict, timeout: float = _DEFAULT_TIMEOUT) -> dict:
        """Write through /JS. Only callers with confirmed readback may use it."""
        data = await self._request("POST", "/JS", payload, timeout)
        return data if isinstance(data, dict) else {}


def get_client(hass: HomeAssistant, base_url: str) -> BsbHttpClient | None:
    """Return the shared client for this BSB-LAN address, or None if unset."""
    if not valid_base_url(base_url):
        return None
    base = base_url.strip().rstrip("/")
    clients = hass.data.setdefault(DOMAIN, {}).setdefault("http_clients", {})
    client = clients.get(base)
    if client is None:
        client = clients[base] = BsbHttpClient(hass, base)
    return client


def entry_client(hass: HomeAssistant, entry) -> BsbHttpClient | None:
    """Shared client for the address configured in the entry options."""
    return get_client(hass, str(entry.options.get("bsb_base_url", "")))
