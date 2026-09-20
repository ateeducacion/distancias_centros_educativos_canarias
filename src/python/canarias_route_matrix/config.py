"""Configuration loading."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    """Runtime generation settings."""

    code_pattern: str
    centers_url: str
    centers_manifest_url: str
    centers_manifest_key: str
    osm_url: str
    osrm_url: str
    block_size: int
    concurrency: int
    snap_warning_m: float
    snap_fail_m: float | None


def load_settings(config_dir: Path) -> Settings:
    """Load project, source and routing settings."""
    sources = json.loads((config_dir / "sources.json").read_text(encoding="utf-8"))
    routing = json.loads((config_dir / "routing.json").read_text(encoding="utf-8"))
    project = json.loads((config_dir / "project.json").read_text(encoding="utf-8"))
    centers = sources["centers"]

    return Settings(
        project["center_code_pattern"],
        centers["url"],
        centers["manifest_url"],
        centers["manifest_key"],
        sources["osm"]["url"],
        routing["service_url"],
        routing["block_size"],
        routing["concurrency"],
        routing["snapping"]["warning_m"],
        routing["snapping"]["fail_m"],
    )
