# Yuva Saarthi — Rate Limiting Middleware
# Reference: Phase 8 Security Hardening & Rate Limiting

import time
import threading
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException, status
from app.config import settings

class RateLimiter:
    """
    Sliding-window rate limiter for FastAPI routes.
    Tracks requests per client identifier (IP or user ID).
    """
    def __init__(self, limit: Optional[int] = None, window_seconds: int = 60):
        self._limit = limit
        self.window_seconds = window_seconds
        self._records = defaultdict(list)
        self._lock = threading.Lock()

    @property
    def limit(self) -> int:
        return self._limit if self._limit is not None else settings.rate_limit_per_minute

    def reset(self):
        """Reset all rate limiter records (useful for test suites)."""
        with self._lock:
            self._records.clear()

    def _get_client_key(self, request: Request) -> str:
        # Prefer authenticated dev header or authorization token snippet if available
        x_dev = request.headers.get("X-Dev-User-Id")
        if x_dev:
            return f"user:{x_dev}"
        
        auth = request.headers.get("Authorization")
        if auth and len(auth) > 15:
            return f"auth:{auth[-16:]}"

        # Fallback to client IP
        if request.client and request.client.host:
            return f"ip:{request.client.host}"
        
        return "ip:127.0.0.1"

    async def __call__(self, request: Request):
        limit = self.limit
        if limit <= 0:
            return  # Rate limiting disabled

        client_key = self._get_client_key(request)
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Filter out entries older than window
            timestamps = [ts for ts in self._records[client_key] if ts > cutoff]
            self._records[client_key] = timestamps

            if len(timestamps) >= limit:
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + self.window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {limit} requests per {self.window_seconds}s.",
                    headers={"Retry-After": str(retry_after)},
                )

            self._records[client_key].append(now)

# Default chat rate limiter instance
chat_rate_limiter = RateLimiter()
