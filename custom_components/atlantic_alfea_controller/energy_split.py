"""Attribution of the global meter increments to ECS or C1+C2.

Pure logic, kept free of Home Assistant imports so it can be unit tested.
"""

from __future__ import annotations

# 8003 codes meaning "no DHW charge in progress"
DHW_IDLE_CODES = (51, 99, 100)
# 8006 "No request": the PAC serves neither the circuits nor the DHW
PAC_NO_REQUEST = 51
# Above this power with the compressor off and no request, the only consumer
# on the PAC line is the DHW electric immersion heater (~1.7 kW). Standby is
# ~10 W and the circulators stay below 100 W.
RESISTANCE_MIN_W = 800.0

ECS_CHARGE = "charge ECS (8003)"
ECS_RESISTANCE = "résistance ECS (puissance sans demande PAC)"
ECS_HEATER = "résistance ECS (8821)"
CIRCUITS = "circuits / veille"


def classify(
    dhw_code: int | None,
    pac_code: int | None,
    compressor_on: bool | None,
    power_w: float | None,
    heater_on: bool | None = None,
) -> str:
    """Return the bucket label for an energy increment."""
    if dhw_code is not None and dhw_code not in DHW_IDLE_CODES:
        return ECS_CHARGE
    if heater_on:
        return ECS_HEATER
    if (
        power_w is not None
        and power_w >= RESISTANCE_MIN_W
        and compressor_on is not True
        and pac_code == PAC_NO_REQUEST
    ):
        return ECS_RESISTANCE
    return CIRCUITS


def is_ecs(label: str) -> bool:
    return label != CIRCUITS
