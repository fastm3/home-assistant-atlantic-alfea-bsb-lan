"""Pure helpers for the ECS session COP calculation.

The calculation is intentionally independent from Home Assistant so it can be
unit-tested and reused by the sensor entity.
"""

from __future__ import annotations

WATER_SPECIFIC_HEAT_WH_PER_L_K = 1.163


def compute_ecs_cop(
    e_start_kwh: float | None,
    e_end_kwh: float | None,
    t_start_c: float | None,
    t_end_c: float | None,
    volume_l: float = 190.0,
) -> dict[str, float] | None:
    """Return the ECS session COP and its intermediate values.

    ``e_start_kwh`` and ``e_end_kwh`` are the cumulative electrical energy
    counters at the beginning and end of the session. ``t_start_c`` is the
    lowest water temperature observed during the session (the existing card
    uses the session minimum, not necessarily the first sample).
    """
    if None in (e_start_kwh, e_end_kwh, t_start_c, t_end_c):
        return None
    try:
        e_start = float(e_start_kwh)
        e_end = float(e_end_kwh)
        t_start = float(t_start_c)
        t_end = float(t_end_c)
        volume = float(volume_l)
    except (TypeError, ValueError):
        return None
    if e_start <= 0 or e_end <= e_start or t_end <= t_start or volume <= 0:
        return None

    e_elec = e_end - e_start
    delta_t = t_end - t_start
    e_therm = volume * WATER_SPECIFIC_HEAT_WH_PER_L_K * delta_t / 1000.0
    if e_elec <= 0 or e_therm <= 0:
        return None
    return {
        "cop": round(e_therm / e_elec, 2),
        "e_elec_kwh": round(e_elec, 3),
        "e_therm_kwh": round(e_therm, 4),
        "delta_t": round(delta_t, 2),
        "t_start_c": round(t_start, 1),
        "t_end_c": round(t_end, 1),
        "volume_l": volume,
    }
