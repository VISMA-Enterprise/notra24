"""
Notra 24 Alarm Receiver — asyncio TCP server.
Receives alarm events from Eview EV-Hub/EV-12 devices,
parses them, and forwards to n8n via webhook.
"""

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

from parser import parse_packet
from sender import WebhookSender
from queue_manager import QueueManager

load_dotenv()

# ── Configuration ───────────────────────────────────────────────

TCP_PORT = int(os.getenv("TCP_PORT", "5001"))
TCP_HOST = os.getenv("TCP_HOST", "0.0.0.0")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://n8n:5678/webhook/alarm")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# ── Logging ─────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("alarm-receiver")

# ── Globals ─────────────────────────────────────────────────────

sender: WebhookSender
queue: QueueManager
shutdown_event = asyncio.Event()


# ── ACK Responses ───────────────────────────────────────────────

def build_ack(device_id: str, protocol: str) -> bytes:
    """Build acknowledgment response for the device."""
    if protocol == "eview":
        return f"[ACK,{device_id}]\r\n".encode()
    elif protocol == "contact_id":
        # Contact ID ACK = DUH + account + checksum
        return f"\x06{device_id}\r\n".encode()
    else:
        return b"\x06\r\n"


# ── TCP Handler ─────────────────────────────────────────────────

async def handle_connection(
    reader: asyncio.StreamReader, writer: asyncio.StreamWriter
):
    """Handle a single TCP connection from an Eview device."""
    addr = writer.get_extra_info("peername")
    logger.info(f"New connection from {addr}")

    try:
        while not shutdown_event.is_set():
            try:
                data = await asyncio.wait_for(reader.read(4096), timeout=120)
            except asyncio.TimeoutError:
                logger.debug(f"Connection timeout from {addr}")
                break

            if not data:
                break

            raw = data.decode("utf-8", errors="replace").strip()
            if not raw:
                continue

            logger.info(f"[RECV] {addr} → {raw}")

            # Parse the packet
            event = parse_packet(raw)
            if event is None:
                logger.warning(f"Unparseable packet from {addr}: {raw}")
                continue

            logger.info(
                f"[PARSED] device={event['device_id']} "
                f"type={event['event_type']} "
                f"code={event['event_code']} "
                f"protocol={event.get('protocol', 'unknown')}"
            )

            # Send ACK back to device (MANDATORY)
            ack = build_ack(event["device_id"], event.get("protocol", ""))
            writer.write(ack)
            await writer.drain()
            logger.debug(f"[ACK] Sent to {addr}")

            # Forward to n8n
            success = await sender.send(event)
            if not success:
                logger.warning(
                    f"Webhook delivery failed, queueing event "
                    f"device={event['device_id']}"
                )
                await queue.enqueue(event)

    except ConnectionResetError:
        logger.info(f"Connection reset by {addr}")
    except Exception as e:
        logger.error(f"Error handling {addr}: {e}", exc_info=True)
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        logger.info(f"Connection closed: {addr}")


# ── Server ──────────────────────────────────────────────────────

async def main():
    global sender, queue

    logger.info("=" * 60)
    logger.info("  NOTRA 24 — Alarm Receiver")
    logger.info(f"  Listening on {TCP_HOST}:{TCP_PORT}")
    logger.info(f"  Webhook: {N8N_WEBHOOK_URL}")
    logger.info("=" * 60)

    # Initialize components
    sender = WebhookSender(N8N_WEBHOOK_URL)
    queue = QueueManager()
    await queue.initialize()
    queue.set_send_callback(sender.send)
    await queue.start_retry_loop()

    # Start TCP server
    server = await asyncio.start_server(
        handle_connection, TCP_HOST, TCP_PORT
    )

    logger.info(f"TCP server running on {TCP_HOST}:{TCP_PORT}")

    # Graceful shutdown
    loop = asyncio.get_event_loop()

    def signal_handler():
        logger.info("Shutdown signal received...")
        shutdown_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, signal_handler)

    try:
        async with server:
            await shutdown_event.wait()
    finally:
        logger.info("Shutting down...")
        server.close()
        await server.wait_closed()
        await queue.close()
        await sender.close()
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
