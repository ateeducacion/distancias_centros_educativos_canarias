"""Tests for the canonical centres catalogue source."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from canarias_route_matrix.downloader import (
    DownloadMetadata,
    download_verified_centers,
    manifest_sha256,
)
from canarias_route_matrix.errors import ValidationError


def test_manifest_sha256_reads_versioned_contract() -> None:
    digest = "a" * 64
    payload = {
        "schema_version": 1,
        "files": {
            "centros-distancias.csv": {
                "sha256": digest,
                "records": 1400,
            }
        },
    }

    assert manifest_sha256(payload, "centros-distancias.csv") == digest


@pytest.mark.parametrize(
    "payload",
    [
        {"schema_version": 2, "files": {}},
        {"schema_version": 1, "files": {}},
        {
            "schema_version": 1,
            "files": {"centros-distancias.csv": {"sha256": "not-a-hash"}},
        },
    ],
)
def test_manifest_sha256_rejects_invalid_contract(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        manifest_sha256(payload, "centros-distancias.csv")


def test_verified_download_rejects_hash_mismatch(tmp_path: Path) -> None:
    destination = tmp_path / "centers.csv"
    metadata_path = tmp_path / "centers.meta.json"
    destination.write_text("downloaded", encoding="utf-8")
    metadata_path.write_text("{}", encoding="utf-8")
    metadata = DownloadMetadata(
        "https://example.invalid/centers.csv",
        None,
        None,
        10,
        "b" * 64,
        "2026-09-20T00:00:00Z",
    )

    with (
        patch(
            "canarias_route_matrix.downloader.fetch_manifest_sha256",
            return_value="a" * 64,
        ),
        patch(
            "canarias_route_matrix.downloader.download",
            return_value=metadata,
        ),
        pytest.raises(ValidationError),
    ):
        download_verified_centers(
            "https://example.invalid/centers.csv",
            "https://example.invalid/manifest.json",
            "centros-distancias.csv",
            destination,
            metadata_path,
        )

    assert not destination.exists()
    assert not metadata_path.exists()
