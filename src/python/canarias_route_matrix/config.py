"""Configuration loading."""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import json

@dataclass(frozen=True)
class Settings:
    code_pattern:str; ckan_api_url:str; dataset_id:str; centers_fallback_url:str; osm_url:str; osrm_url:str; block_size:int; concurrency:int; snap_warning_m:float; snap_fail_m:float|None

def load_settings(config_dir:Path)->Settings:
    sources=json.loads((config_dir/"sources.json").read_text(encoding="utf-8")); routing=json.loads((config_dir/"routing.json").read_text(encoding="utf-8")); project=json.loads((config_dir/"project.json").read_text(encoding="utf-8"))
    return Settings(project["center_code_pattern"],sources["centers"]["ckan_api_url"],sources["centers"]["dataset_id"],sources["centers"]["fallback_url"],sources["osm"]["url"],routing["service_url"],routing["block_size"],routing["concurrency"],routing["snapping"]["warning_m"],routing["snapping"]["fail_m"])
