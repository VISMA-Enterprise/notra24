"""
HTTP sender — forwards parsed alarm events to n8n webhook.
"""

import logging
from typing import Optional

import aiohttp

logger = logging.getLogger("alarm-receiver.sender")


class WebhookSender:
    def __init__(self, webhook_url: str, timeout: int = 10):
        self.webhook_url = webhook_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def send(self, event: dict) -> bool:
        """Send event to n8n webhook. Returns True on success."""
        try:
            session = await self._get_session()
            async with session.post(
                self.webhook_url,
                json=event,
                headers={"Content-Type": "application/json"},
            ) as resp:
                if resp.status in (200, 201, 204):
                    logger.info(
                        f"Event sent: device={event.get('device_id')} "
                        f"type={event.get('event_type')} status={resp.status}"
                    )
                    return True
                else:
                    body = await resp.text()
                    logger.error(
                        f"Webhook returned {resp.status}: {body[:200]}"
                    )
                    return False
        except aiohttp.ClientError as e:
            logger.error(f"Webhook connection error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected send error: {e}")
            return False

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
