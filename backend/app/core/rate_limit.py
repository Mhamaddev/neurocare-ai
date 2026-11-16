"""Small in-memory request limiter for the two model endpoints.

Per client address, per process: enough to stop one visitor from flooding the
database or the model. Behind a reverse proxy every request shares the proxy's
address, so a public deployment should also limit at the proxy.
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimit:
    def __init__(self, limit: int, window_seconds: float = 60.0, clock=time.monotonic):
        self.limit, self.window, self.clock = limit, window_seconds, clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def __call__(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = self.clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry = max(1, int(self.window - (now - hits[0])) + 1)
                raise HTTPException(status_code=429, detail="Too many requests. Wait a moment and try again.",
                                    headers={"Retry-After": str(retry)})
            hits.append(now)
            # Forget idle clients so the table cannot grow without bound.
            if len(self._hits) > 10_000:
                for client in [name for name, seen in self._hits.items() if not seen or now - seen[-1] >= self.window]:
                    del self._hits[client]


# Saved predictions write a database row; previews only run the model.
limit_saved_predictions = RateLimit(limit=30)
limit_previews = RateLimit(limit=240)
