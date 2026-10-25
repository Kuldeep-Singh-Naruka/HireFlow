"""Retry helper for flaky LLM calls."""
from __future__ import annotations

import math
import time
from typing import Callable, TypeVar

import groq
import pydantic
from langchain_core.exceptions import OutputParserException

T = TypeVar("T")

MAX_RETRY_AFTER = 60.0

RETRYABLE = (
    groq.RateLimitError,
    groq.APIConnectionError,
    groq.APITimeoutError,
    groq.InternalServerError,
    pydantic.ValidationError,
    ValueError,
    OutputParserException,
)


def _retry_after(exc: Exception) -> float | None:
    headers = getattr(getattr(exc, "response", None), "headers", None)
    if not headers:
        return None
    try:
        value = float(headers.get("retry-after"))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value):
        return None
    return min(max(value, 0.0), MAX_RETRY_AFTER)


def call_with_retry(
    fn: Callable[[], T],
    *,
    attempts: int = 3,
    delays: tuple = (2, 4),
    on_retry: Callable[[int, Exception], None] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except RETRYABLE as exc:
            if attempt >= attempts:
                raise
            if on_retry is not None:
                on_retry(attempt, exc)
            delay = _retry_after(exc)
            if delay is None:
                delay = delays[min(attempt - 1, len(delays) - 1)]
            sleep(delay)
    raise AssertionError("unreachable")  # pragma: no cover
