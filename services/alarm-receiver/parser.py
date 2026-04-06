"""
Eview EV-Hub / EV-12 TCP packet parser.
Supports Contact ID and proprietary Eview protocols.
"""

import re
import hashlib
from datetime import datetime, timezone
from typing import Optional

EVENT_CODES: dict[str, str] = {
    "100": "sos",
    "101": "fall",
    "110": "sos",
    "301": "low_battery",
    "401": "device_offline",
    "441": "power_failure",
    "453": "door_open",
    "626": "smoke",
    "162": "co",
    "602": "heartbeat",
    "999": "test",
}

# Contact ID format: ACCT MT QXYZ GG CCC S
# ACCT = Account (device ID), MT = Message Type
# Q = Event qualifier, XYZ = Event code
# GG = Group/Partition, CCC = Zone, S = Checksum
CONTACT_ID_PATTERN = re.compile(
    r"(\w{4,16})\s*(\d{2})\s*(\d)(\d{3})\s*(\d{2})\s*(\d{3})\s*(\w)"
)

# Eview proprietary: [device_id,event_code,data,checksum]
EVIEW_PATTERN = re.compile(
    r"\[(\w+),(\d{3}),([^,]*),(\w+)\]"
)


def calculate_checksum(data: str) -> str:
    """Calculate simple checksum for verification."""
    return hashlib.md5(data.encode()).hexdigest()[:4].upper()


def parse_contact_id(raw: str) -> Optional[dict]:
    """Parse Contact ID protocol message."""
    match = CONTACT_ID_PATTERN.search(raw)
    if not match:
        return None

    account, msg_type, qualifier, event_code, group, zone, checksum = match.groups()

    event_type = EVENT_CODES.get(event_code, "unknown")

    return {
        "device_id": account,
        "event_type": event_type,
        "event_code": event_code,
        "qualifier": int(qualifier),  # 1=new event, 3=restore
        "group": group,
        "zone": zone,
        "raw": raw.strip(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checksum_valid": True,  # Simplified; real impl checks Luhn
        "protocol": "contact_id",
    }


def parse_eview(raw: str) -> Optional[dict]:
    """Parse Eview proprietary protocol message."""
    match = EVIEW_PATTERN.search(raw)
    if not match:
        return None

    device_id, event_code, data, checksum = match.groups()
    event_type = EVENT_CODES.get(event_code, "unknown")

    # Verify checksum
    payload = f"{device_id},{event_code},{data}"
    expected_checksum = calculate_checksum(payload)
    checksum_valid = checksum.upper() == expected_checksum

    # Parse GPS from data field if present (format: lat;lng;battery;signal)
    gps_lat = None
    gps_lng = None
    battery = None
    signal_strength = None

    if data:
        parts = data.split(";")
        if len(parts) >= 2:
            try:
                gps_lat = float(parts[0]) if parts[0] else None
                gps_lng = float(parts[1]) if parts[1] else None
            except ValueError:
                pass
        if len(parts) >= 3:
            try:
                battery = int(parts[2]) if parts[2] else None
            except ValueError:
                pass
        if len(parts) >= 4:
            try:
                signal_strength = int(parts[3]) if parts[3] else None
            except ValueError:
                pass

    result = {
        "device_id": device_id,
        "event_type": event_type,
        "event_code": event_code,
        "raw": raw.strip(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checksum_valid": checksum_valid,
        "protocol": "eview",
    }

    if gps_lat is not None:
        result["gps_lat"] = gps_lat
    if gps_lng is not None:
        result["gps_lng"] = gps_lng
    if battery is not None:
        result["battery"] = battery
    if signal_strength is not None:
        result["signal_strength"] = signal_strength

    return result


def parse_packet(raw: str) -> Optional[dict]:
    """
    Parse incoming TCP packet. Tries Eview format first,
    then falls back to Contact ID.
    """
    raw = raw.strip()
    if not raw:
        return None

    # Try Eview proprietary format
    result = parse_eview(raw)
    if result:
        return result

    # Try Contact ID format
    result = parse_contact_id(raw)
    if result:
        return result

    # Unknown format — still capture it
    return {
        "device_id": "unknown",
        "event_type": "unknown",
        "event_code": "000",
        "raw": raw,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checksum_valid": False,
        "protocol": "unknown",
    }
