"""In-process event bus: persists RunEvent rows and fans out to SSE subscribers.

Queues are only touched on the bound event loop's thread.
"""
from __future__ import annotations

import asyncio

from app.database import SessionLocal
from app.models.run_event import RunEvent

_loop: asyncio.AbstractEventLoop | None = None
_subscribers: dict[int, set[asyncio.Queue]] = {}


def bind_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def serialize(event: RunEvent) -> dict:
    return {
        "id": event.id,
        "run_id": event.run_id,
        "candidate_id": event.candidate_id,
        "type": event.type,
        "message": event.message,
        "data": event.data,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def subscribe(run_id: int) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(run_id, set()).add(q)
    return q


def unsubscribe(run_id: int, q: asyncio.Queue) -> None:
    subs = _subscribers.get(run_id)
    if subs is None:
        return
    subs.discard(q)
    if not subs:
        _subscribers.pop(run_id, None)


def _deliver(run_id: int, event: dict) -> None:
    for q in list(_subscribers.get(run_id, ())):
        q.put_nowait(event)


def publish(
    run_id: int,
    type: str,
    message: str,
    *,
    candidate_id: int | None = None,
    data: dict | None = None,
) -> dict:
    with SessionLocal() as db:
        row = RunEvent(
            run_id=run_id,
            candidate_id=candidate_id,
            type=type,
            message=message,
            data=data,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        event = serialize(row)

    loop = _loop
    if loop is None or loop.is_closed():
        return event
    try:
        running = asyncio.get_running_loop()
    except RuntimeError:
        running = None
    if running is loop:
        _deliver(run_id, event)
    else:
        try:
            loop.call_soon_threadsafe(_deliver, run_id, event)
        except RuntimeError:  # loop closed between check and call
            pass
    return event
