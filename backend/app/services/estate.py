"""Estate metadata and live device-to-location hydration.

Sensor-dependent fields remain unavailable until a validated Velxio reading is
received and mapped to a device location.
"""

from __future__ import annotations

import json
import copy
from pathlib import Path
from typing import Any

from app.core.supabase import get_client

_SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "seed.json"
SEED: dict[str, Any] = json.loads(_SEED_PATH.read_text(encoding="utf-8"))

SENSOR_TYPES: list[dict[str, str]] = SEED["SENSOR_TYPES"]
UTILITIES: list[dict[str, str]] = SEED["UTILITIES"]
STATUS_META: dict[str, Any] = SEED["STATUS_META"]

ACADEMIC_BLOCK_DEFS: list[dict[str, Any]] = [
    {
        "code": "LC",
        "name": "Learning Center",
        "category": "academic",
        "location": "Central Campus · Quad 1",
        "description": "Central library, primary digital learning commons, and tier-1 lecture complexes.",
        "status": "operational",
        "commissioned": "2023-01-15",
        "primary": False,
        "floors": [
            {"code": "3F", "name": "Floor 3", "short": "3", "status": "normal"},
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "normal"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
        ],
    },
    {
        "code": "IB",
        "name": "IB",
        "category": "academic",
        "location": "West Campus · Sector 2",
        "description": "International Block housing computing laboratories and postgraduate lecture halls.",
        "status": "operational",
        "commissioned": "2023-06-20",
        "primary": False,
        "floors": [
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "normal"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
        ],
    },
    {
        "code": "AS",
        "name": "AS",
        "category": "academic",
        "location": "Science Quadrant · Sector 3",
        "description": "Applied Sciences complex dedicated to physics, chemistry, and materials research.",
        "status": "operational",
        "commissioned": "2023-08-10",
        "primary": False,
        "floors": [
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "normal"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
        ],
    },
    {
        "code": "SF",
        "name": "Sunflower",
        "category": "academic",
        "location": "North Campus · Sector 4",
        "description": (
            "Primary academic and laboratory block. Highest connected load in the "
            "monitored estate; serves as the reference block for AIMDS anomaly baselines."
        ),
        "status": "operational",
        "commissioned": "2023-04-12",
        "primary": True,
        "floors": [
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "attention"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
            {"code": "BASE", "name": "Basement (B)", "short": "B", "status": "normal"},
        ],
    },
    {
        "code": "MECH",
        "name": "Mech",
        "category": "academic",
        "location": "Engineering Wing · Sector 5",
        "description": "Mechanical engineering laboratories, dynamics workshops, and thermal testbenches.",
        "status": "operational",
        "commissioned": "2022-11-05",
        "primary": False,
        "floors": [
            {"code": "3F", "name": "Floor 3", "short": "3", "status": "normal"},
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "normal"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
        ],
    },
    {
        "code": "RP",
        "name": "Research Park",
        "category": "academic",
        "location": "Innovation Hub · Sector 6",
        "description": "Advanced research park, startup incubator suites, and rapid prototyping labs.",
        "status": "operational",
        "commissioned": "2024-02-18",
        "primary": False,
        "floors": [
            {"code": "2F", "name": "Floor 2", "short": "2", "status": "normal"},
            {"code": "1F", "name": "Floor 1", "short": "1", "status": "normal"},
            {"code": "GF", "name": "Ground Floor (G)", "short": "G", "status": "normal"},
        ],
    },
    {
        "code": "LT",
        "name": "Lotus",
        "category": "academic",
        "location": "East Campus · Sector 7",
        "description": (
            "Residential and administrative block. Commissioned into AIMDS during "
            "the second rollout phase."
        ),
        "status": "operational",
        "commissioned": "2025-11-02",
        "primary": False,
        "floors": [
            {"code": "2F", "name": "2nd Floor", "short": "2ND", "status": "normal"},
            {"code": "1F", "name": "1st Floor", "short": "1ST", "status": "normal"},
            {"code": "GF", "name": "Ground", "short": "GND", "status": "normal"},
        ],
    },
]

HOSTEL_DEFS: list[dict[str, Any]] = [
    # Boys Hostels
    {"code": "H-SAPH", "name": "Sapphire", "subCategory": "boys", "status": "operational"},
    {"code": "H-EMER", "name": "Emerald", "subCategory": "boys", "status": "operational"},
    {"code": "H-RUBY", "name": "Ruby", "subCategory": "boys", "status": "operational"},
    {"code": "H-DIAM", "name": "Diamond", "subCategory": "boys", "status": "operational"},
    {"code": "H-CORA", "name": "Coral", "subCategory": "boys", "status": "operational"},
    {"code": "H-PEAR", "name": "Pearl", "subCategory": "boys", "status": "operational"},
    # Girls Hostels
    {"code": "H-GANG", "name": "Ganga", "subCategory": "girls", "status": "operational"},
    {"code": "H-YAMU", "name": "Yamuna", "subCategory": "girls", "status": "operational"},
    {"code": "H-NARM", "name": "Narmadha", "subCategory": "girls", "status": "operational"},
    {"code": "H-CAUV", "name": "Cauvery", "subCategory": "girls", "status": "operational"},
    {"code": "H-NBHA", "name": "North Bhavani", "subCategory": "girls", "status": "operational"},
    {"code": "H-SBHA", "name": "South Bhavani", "subCategory": "girls", "status": "operational"},
    {"code": "H-OBHA", "name": "Old Bhavani", "subCategory": "girls", "status": "operational"},
]

BLOCK_DEFS: list[dict[str, Any]] = ACADEMIC_BLOCK_DEFS

FLOOR_TEMPLATE: list[dict[str, str]] = [
    {"code": "BASE", "name": "Base", "short": "BASE"},
    {"code": "GF", "name": "Ground", "short": "GND"},
    {"code": "1F", "name": "1st Floor", "short": "1ST"},
    {"code": "2F", "name": "2nd Floor", "short": "2ND"},
    {"code": "3F", "name": "3rd Floor", "short": "3RD"},
]


def build_sensors(block_code: str, floor_code: str, floor_status: str, seed_base: str) -> list[dict]:
    sensors = []
    for i, st in enumerate(SENSOR_TYPES):
        sensors.append({
            "id": f"{block_code}-{floor_code}-{st['prefix']}-0{i + 1}",
            "blockCode": block_code,
            "floorCode": floor_code,
            "key": st["key"],
            "type": st["type"],
            "model": st["model"],
            "unit": st["unit"],
            "value": None,
            "status": "standby",
            "battery": None,
            "signal": None,
            "firmware": None,
            "updatedSecondsAgo": None,
            "calibratedOn": None,
            "min": None,
            "max": None,
            "avg": None,
        })
    return sensors

def build_floor(block_code: str, definition: dict, level: int) -> dict:
    seed = f"{block_code}-{definition['code']}"
    sensors = build_sensors(block_code, definition['code'], definition['status'], seed)
    def utility(key: str, unit: str, spread: float, delta_range: float, bias: float = 0.0) -> dict:
        return {"value": None, "unit": unit, "delta": None, "expected": None}
    return {
        "id": f"{block_code}-{definition['code']}",
        "code": definition["code"],
        "name": definition["name"],
        "short": definition["short"],
        "level": level,
        "blockCode": block_code,
        "status": "standby",
        "area": None,
        "zones": None,
        "occupancy": None,
        "utilities": {
            "energy": utility("energy", "kWh", 0, 0),
            "water": utility("water", "L", 0, 0),
            "temperature": utility("temperature", "°C", 0, 0),
            "humidity": utility("humidity", "%", 0, 0),
            "load": utility("load", "kW", 0, 0),
        },
        "sensors": sensors,
    }

def build_block(definition: dict) -> dict:
    count = len(definition.get("floors", []))
    floors = [
        build_floor(definition["code"], f, count - 1 - i)
        for i, f in enumerate(definition.get("floors", []))
    ]
    energy_total = None
    water_total = None
    load_total = None

    return {
        "id": definition["code"],
        "code": definition["code"],
        "name": definition["name"],
        "category": definition.get("category", "academic"),
        "location": definition.get("location", ""),
        "description": definition.get("description", ""),
        "status": definition.get("status", "operational"),
        "commissioned": definition.get("commissioned", "2023-01-15"),
        "primary": definition.get("primary", False),
        "floors": floors,
        "sensorCount": sum(len(f["sensors"]) for f in floors),
        "totals": {
            "energy": energy_total,
            "water": water_total,
            "load": load_total,
        },
    }


def build_hostel_sensors(hostel_code: str, seed_base: str) -> list[dict]:
    r = rng(f"{seed_base}-hostel-sensors")
    sensor_configs = [
        {"key": "energy", "type": "Main Incomer Energy Meter", "unit": "kWh", "prefix": "EM", "model": "EMX-4200"},
        {"key": "water", "type": "Bulk Inflow Water Meter", "unit": "L", "prefix": "WF", "model": "AQF-118"},
        {"key": "voltage", "type": "Mains Voltage Monitor", "unit": "V", "prefix": "VQ", "model": "VQM-330"},
        {"key": "load", "type": "Power Factor & Load Meter", "unit": "kW", "prefix": "PL", "model": "PLM-90"},
        {"key": "waterFlow", "type": "Instantaneous Flow Sensor", "unit": "L/min", "prefix": "FS", "model": "AQF-50"},
    ]
    sensors = []
    for i, st in enumerate(sensor_configs):
        val = round_js(238 + (r() - 0.5) * 5, 1) if st["key"] == "voltage" else round_js(40 + r() * 50, 1)
        sensors.append(
            {
                "id": f"{hostel_code}-{st['prefix']}-0{i + 1}",
                "blockCode": hostel_code,
                "floorCode": "MAIN",
                "key": st["key"],
                "type": st["type"],
                "model": st["model"],
                "unit": st["unit"],
                "value": val,
                "status": "normal",
                "battery": round(75 + r() * 24),
                "signal": round(80 + r() * 19),
                "firmware": f"v2.{round(1 + r() * 6)}.{round(r() * 9)}",
                "updatedSecondsAgo": round(2 + r() * 25),
                "calibratedOn": "2026-06-14",
                "min": 220 if st["key"] == "voltage" else 20,
                "max": 245 if st["key"] == "voltage" else 120,
                "avg": 235 if st["key"] == "voltage" else 60,
            }
        )
    return sensors


def build_hostel(definition: dict) -> dict:
    is_boys = definition.get("subCategory") == "boys"
    sensor_configs = [
        ("energy", "Main Incomer Energy Meter", "kWh", "EM", "EMX-4200"),
        ("water", "Bulk Inflow Water Meter", "L", "WF", "AQF-118"),
        ("voltage", "Mains Voltage Monitor", "V", "VQ", "VQM-330"),
        ("load", "Power Factor & Load Meter", "kW", "PL", "PLM-90"),
        ("waterFlow", "Instantaneous Flow Sensor", "L/min", "FS", "AQF-50"),
    ]
    sensors = [{
        "id": f"{definition['code']}-{prefix}-0{i + 1}",
        "blockCode": definition["code"], "floorCode": "MAIN", "key": key,
        "type": sensor_type, "model": model, "unit": unit, "value": None,
        "status": "standby", "battery": None, "signal": None,
        "firmware": None, "updatedSecondsAgo": None, "calibratedOn": None,
        "min": None, "max": None, "avg": None,
    } for i, (key, sensor_type, unit, prefix, model) in enumerate(sensor_configs)]
    utilities = {key: {"value": None, "unit": unit, "delta": None, "expected": None}
                 for key, unit in (("energy", "kWh"), ("water", "L"), ("power", "kW"),
                                   ("load", "kW"), ("voltage", "V"), ("current", "A"),
                                   ("waterFlow", "L/min"), ("cost", "₹"), ("temperature", "°C"),
                                   ("humidity", "%"))}
    return {
        "id": definition["code"], "code": definition["code"], "name": definition["name"],
        "category": "hostel", "subCategory": definition.get("subCategory", "boys"),
        "location": f"{'Boys' if is_boys else 'Girls'} Residential Quad",
        "description": f"{definition['name']} residential accommodation block with direct mains telemetry.",
        "status": "standby", "commissioned": None, "primary": False, "floors": [],
        "power": None, "water": None, "todayCost": None, "voltage": None,
        "current": None, "waterFlow": None, "energy": None, "utilities": utilities,
        "totals": {"energy": None, "water": None, "load": None},
        "sensors": sensors, "sensorCount": len(sensors), "occupancy": None,
    }

def generate_floors(count: int) -> list[dict]:
    """Floor definitions for a newly provisioned block, top floor first."""
    picked = FLOOR_TEMPLATE[: max(1, min(int(count), len(FLOOR_TEMPLATE)))]
    return [{**f, "status": "normal"} for f in reversed(picked)]


class EstateStore:
    """
    In-memory estate.

    Blocks created through the API live here for the process lifetime. Replace
    the dict with a SQLAlchemy session and the router layer is untouched.
    """

    def __init__(self) -> None:
        self._blocks: dict[str, dict] = {}
        for b in ACADEMIC_BLOCK_DEFS:
            self._blocks[b["code"]] = build_block(b)
        for h in HOSTEL_DEFS:
            self._blocks[h["code"]] = build_hostel(h)
        self._persisted = False

    def initialize_persistence(self) -> None:
        """Seed and hydrate the normalized Supabase estate tables."""
        client = get_client()
        if client is None:
            return
        block_rows = [self._block_row(block) for block in self._blocks.values()]
        client.table("aimds_blocks").upsert(block_rows, on_conflict="code").execute()
        persisted = client.table("aimds_blocks").select("id,code,payload").limit(5000).execute().data or []
        if persisted:
            self._blocks = {row["code"]: row["payload"] for row in persisted if row.get("payload")}
        for block in self._blocks.values():
            block_row = next((row for row in persisted if row["code"] == block["code"]), None)
            if not block_row:
                continue
            floors = [self._floor_row(block_row["id"], floor) for floor in block.get("floors", [])]
            if floors:
                client.table("aimds_floors").upsert(floors, on_conflict="block_id,code").execute()
            floor_rows = client.table("aimds_floors").select("id,code").eq("block_id", block_row["id"]).limit(100).execute().data or []
            floor_ids = {row["code"]: row["id"] for row in floor_rows}
            sensors = [self._sensor_row(block_row["id"], floor_ids.get(floor["code"]), sensor) for floor in block.get("floors", []) for sensor in floor.get("sensors", [])]
            sensors += [self._sensor_row(block_row["id"], None, sensor) for sensor in block.get("sensors", [])]
            if sensors:
                client.table("aimds_sensors").upsert(sensors, on_conflict="sensor_code").execute()
        self._persisted = True

    @staticmethod
    def _block_row(block: dict) -> dict:
        return {"code": block["code"], "name": block["name"], "category": block.get("category", "academic"), "sub_category": block.get("subCategory"), "location": block.get("location", ""), "description": block.get("description", ""), "status": block.get("status", "operational"), "commissioned": block.get("commissioned"), "is_primary": bool(block.get("primary", False)), "payload": block}

    @staticmethod
    def _floor_row(block_id: str, floor: dict) -> dict:
        return {"block_id": block_id, "code": floor["code"], "name": floor.get("name", floor["code"]), "short": floor.get("short", ""), "level": floor.get("level", 0), "status": floor.get("status", "normal"), "area": floor.get("area"), "zones": floor.get("zones"), "occupancy": floor.get("occupancy"), "utilities": floor.get("utilities", {}), "payload": floor}

    @staticmethod
    def _sensor_row(block_id: str, floor_id: str | None, sensor: dict) -> dict:
        return {"sensor_code": sensor["id"], "block_id": block_id, "floor_id": floor_id, "floor_code": sensor.get("floorCode", "MAIN"), "utility_key": sensor.get("key", "unknown"), "sensor_type": sensor.get("type", ""), "model": sensor.get("model", ""), "unit": sensor.get("unit", ""), "value": sensor.get("value"), "status": sensor.get("status", "normal"), "battery": sensor.get("battery"), "signal": sensor.get("signal"), "firmware": sensor.get("firmware"), "updated_seconds_ago": sensor.get("updatedSecondsAgo"), "calibrated_on": sensor.get("calibratedOn"), "min_value": sensor.get("min"), "max_value": sensor.get("max"), "avg_value": sensor.get("avg"), "payload": sensor}

    def _sync_block(self, block: dict) -> dict:
        from app.services.telemetry import telemetry
        status_info = telemetry.get_status()
        latest = status_info.get("reading")
        dev_id = latest.get("device_id") if latest else None
        mapping = {
            "blockCode": latest.get("block_code") if latest else None,
            "floorCode": latest.get("floor_code") if latest else None,
        } if latest and (latest.get("block_code") or latest.get("floor_code")) else telemetry.get_mapping(dev_id or "")

        is_monitored_block = (block.get("code") == mapping.get("blockCode"))
        target_floor_code = mapping.get("floorCode")

        if is_monitored_block and latest and status_info.get("online"):
            for f in block.get("floors", []):
                if f.get("code") == target_floor_code:
                    f["status"] = "operational"
                    pwr = latest.get("power")
                    energy_val = latest.get("energy") or (round(pwr / 1000.0, 3) if pwr is not None else None)
                    if "utilities" in f:
                        if "energy" in f["utilities"]: f["utilities"]["energy"]["value"] = energy_val
                        if "load" in f["utilities"]: f["utilities"]["load"]["value"] = round(pwr / 1000.0, 2) if pwr is not None else None
                        if "temperature" in f["utilities"]: f["utilities"]["temperature"]["value"] = latest.get("temperature")
                        if "humidity" in f["utilities"]: f["utilities"]["humidity"]["value"] = latest.get("humidity")
                        if "water" in f["utilities"]: f["utilities"]["water"]["value"] = None
                    for s in f.get("sensors", []):
                        k = s.get("key")
                        if k == "energy":
                            s["value"] = energy_val
                            s["status"] = "operational"
                        elif k == "load":
                            s["value"] = round(pwr / 1000.0, 2) if pwr is not None else None
                            s["status"] = "operational"
                        elif k == "temperature":
                            s["value"] = latest.get("temperature")
                            s["status"] = "operational"
                        elif k == "humidity":
                            s["value"] = latest.get("humidity")
                            s["status"] = "operational"
                        else:
                            s["value"] = None
                            s["status"] = "standby"
                else:
                    f["status"] = "standby"
                    for uk in f.get("utilities", {}):
                        f["utilities"][uk]["value"] = None
                    for s in f.get("sensors", []):
                        s["value"] = None
                        s["status"] = "standby"

            pwr = latest.get("power")
            energy_val = latest.get("energy") or (round(pwr / 1000.0, 3) if pwr is not None else None)
            block["totals"] = {
                "energy": energy_val,
                "water": None,
                "load": round(pwr / 1000.0, 2) if pwr is not None else None,
            }
            block["energy"] = energy_val
            block["power"] = pwr
            block["voltage"] = latest.get("voltage")
            block["current"] = latest.get("current")
            block["status"] = "operational"
        else:
            for f in block.get("floors", []):
                f["status"] = "standby"
                for uk in f.get("utilities", {}):
                    f["utilities"][uk]["value"] = None
                for s in f.get("sensors", []):
                    s["value"] = None
                    s["status"] = "standby"
            block["totals"] = {
                "energy": None,
                "water": None,
                "load": None,
            }
            block["energy"] = None
            block["power"] = None
            block["voltage"] = None
            block["current"] = None
            block["status"] = "standby"

        return block

    def list_blocks(self) -> list[dict]:
        return [self._sync_block(copy.deepcopy(b)) for b in self._blocks.values()]

    def get_block(self, code: str) -> dict | None:
        b = self._blocks.get(code.upper())
        if not b:
            return None
        return self._sync_block(copy.deepcopy(b))

    def get_floor(self, code: str, floor_code: str) -> dict | None:
        block = self.get_block(code)
        if not block:
            return None
        wanted = floor_code.upper()
        return next((f for f in block.get("floors", []) if f["code"].upper() == wanted), None)

    def create_block(self, payload: dict) -> dict:
        code = (payload.get("code") or payload.get("name", "NB")[:2]).upper()
        is_hostel = payload.get("category") == "hostel"
        if is_hostel:
            definition = {
                "code": code,
                "name": payload.get("name") or "New Hostel",
                "category": "hostel",
                "subCategory": payload.get("subCategory", "boys"),
                "status": "operational",
            }
            block = build_hostel(definition)
        else:
            definition = {
                "code": code,
                "name": payload.get("name") or "New Block",
                "location": payload.get("location") or "Unassigned",
                "description": payload.get("description") or "Newly provisioned monitoring block.",
                "status": "operational",
                "commissioned": "2026-08-28",
                "primary": False,
                "floors": generate_floors(payload.get("floorCount", 3)),
            }
            block = build_block(definition)
        self._blocks[code] = block
        client = get_client()
        if client is not None:
            result = client.table("aimds_blocks").insert(self._block_row(block)).execute()
            block_row = (result.data or [None])[0]
            if block_row:
                floors = [self._floor_row(block_row["id"], floor) for floor in block.get("floors", [])]
                if floors:
                    client.table("aimds_floors").insert(floors).execute()
                floor_rows = client.table("aimds_floors").select("id,code").eq("block_id", block_row["id"]).limit(100).execute().data or []
                floor_ids = {row["code"]: row["id"] for row in floor_rows}
                sensors = [self._sensor_row(block_row["id"], floor_ids.get(floor["code"]), sensor) for floor in block.get("floors", []) for sensor in floor.get("sensors", [])]
                if sensors:
                    client.table("aimds_sensors").insert(sensors).execute()
        return block

    def all_sensors(self) -> list[dict]:
        sensors_list = []
        for b in self._blocks.values():
            for f in b.get("floors", []):
                for s in f.get("sensors", []):
                    sensors_list.append({**s, "floorName": f.get("name", ""), "blockName": b.get("name", "")})
            for s in b.get("sensors", []):
                sensors_list.append({**s, "floorName": "Main", "blockName": b.get("name", "")})
        return sensors_list


store = EstateStore()
