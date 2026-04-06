"""
SQLite-based local queue for alarm events.
Ensures no events are lost when n8n is unreachable.
"""

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional

import aiosqlite

logger = logging.getLogger("alarm-receiver.queue")

MAX_QUEUE_SIZE = 10_000
DB_PATH = Path("/app/data/event_queue.db")
RETRY_INTERVAL = 30  # seconds


class QueueManager:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db: Optional[aiosqlite.Connection] = None
        self._retry_task: Optional[asyncio.Task] = None
        self._send_callback = None

    async def initialize(self):
        """Initialize the SQLite database."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = await aiosqlite.connect(str(self.db_path))
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS event_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload TEXT NOT NULL,
                created_at REAL NOT NULL,
                retry_count INTEGER DEFAULT 0,
                last_retry REAL
            )
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_queue_created
            ON event_queue(created_at)
        """)
        await self.db.commit()

        count = await self.get_count()
        if count > 0:
            logger.warning(f"Queue has {count} pending events from previous run")

    async def enqueue(self, event: dict) -> bool:
        """Add event to local queue. Returns False if queue is full."""
        if not self.db:
            raise RuntimeError("QueueManager not initialized")

        count = await self.get_count()
        if count >= MAX_QUEUE_SIZE:
            logger.error(f"Queue full ({MAX_QUEUE_SIZE}). Dropping event!")
            return False

        await self.db.execute(
            "INSERT INTO event_queue (payload, created_at) VALUES (?, ?)",
            (json.dumps(event), time.time()),
        )
        await self.db.commit()
        logger.info(f"Event queued. Queue size: {count + 1}")
        return True

    async def dequeue(self, event_id: int):
        """Remove successfully sent event from queue."""
        if not self.db:
            return
        await self.db.execute("DELETE FROM event_queue WHERE id = ?", (event_id,))
        await self.db.commit()

    async def get_pending(self, limit: int = 50) -> list[tuple[int, dict]]:
        """Get pending events ordered by creation time."""
        if not self.db:
            return []
        cursor = await self.db.execute(
            "SELECT id, payload FROM event_queue ORDER BY created_at ASC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            try:
                result.append((row[0], json.loads(row[1])))
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in queue entry {row[0]}, removing")
                await self.dequeue(row[0])
        return result

    async def update_retry(self, event_id: int):
        """Update retry count and timestamp."""
        if not self.db:
            return
        await self.db.execute(
            "UPDATE event_queue SET retry_count = retry_count + 1, last_retry = ? WHERE id = ?",
            (time.time(), event_id),
        )
        await self.db.commit()

    async def get_count(self) -> int:
        """Get number of events in queue."""
        if not self.db:
            return 0
        cursor = await self.db.execute("SELECT COUNT(*) FROM event_queue")
        row = await cursor.fetchone()
        return row[0] if row else 0

    def set_send_callback(self, callback):
        """Set the callback function used to send events."""
        self._send_callback = callback

    async def start_retry_loop(self):
        """Start background retry loop."""
        self._retry_task = asyncio.create_task(self._retry_loop())

    async def _retry_loop(self):
        """Periodically retry sending queued events."""
        while True:
            try:
                await asyncio.sleep(RETRY_INTERVAL)
                pending = await self.get_pending()
                if not pending:
                    continue

                logger.info(f"Retrying {len(pending)} queued events...")
                for event_id, event in pending:
                    if self._send_callback:
                        success = await self._send_callback(event)
                        if success:
                            await self.dequeue(event_id)
                            logger.info(f"Queued event {event_id} sent successfully")
                        else:
                            await self.update_retry(event_id)
                            logger.warning(f"Retry failed for event {event_id}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Retry loop error: {e}")

    async def close(self):
        """Cleanup resources."""
        if self._retry_task:
            self._retry_task.cancel()
            try:
                await self._retry_task
            except asyncio.CancelledError:
                pass
        if self.db:
            await self.db.close()
