"""Conditional, atomic and verifiable source downloads."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
from urllib.request import Request, urlopen

from .errors import ValidationError


@dataclass(frozen=True)
class DownloadMetadata:
    """Metadata captured for one downloaded source."""

    url: str
    etag: str | None
    last_modified: str | None
    size: int
    sha256: str
    downloaded_at: str

    def as_dict(self) -> dict[str, object]:
        """Return JSON-serializable metadata."""
        return asdict(self)


def manifest_sha256(payload: dict[str, object], key: str) -> str:
    """Return the expected SHA-256 for one catalogue artefact."""
    if payload.get("schema_version") != 1:
        raise ValidationError("Unsupported centres manifest schema")
    files = payload.get("files")
    if not isinstance(files, dict):
        raise ValidationError("Centres manifest has no files section")
    entry = files.get(key)
    if not isinstance(entry, dict):
        raise ValidationError(f"Centres manifest has no entry for {key}")
    digest = entry.get("sha256")
    if not isinstance(digest, str) or len(digest) != 64:
        raise ValidationError(f"Centres manifest has an invalid SHA-256 for {key}")
    return digest.lower()


def fetch_manifest_sha256(url: str, key: str, timeout: float = 30) -> str:
    """Fetch the catalogue manifest and return the expected artefact hash."""
    with urlopen(Request(url, headers={"User-Agent": "canarias-route-matrix/0.1"}), timeout=timeout) as response:
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise ValidationError("Centres manifest is not a JSON object")
    return manifest_sha256(payload, key)


def download(
    url: str,
    destination: Path,
    metadata_path: Path,
    timeout: float = 60,
    retries: int = 3,
    force: bool = False,
) -> DownloadMetadata:
    """Download one source atomically and persist transport metadata."""
    headers = {"User-Agent": "canarias-route-matrix/0.1"}
    if metadata_path.exists() and not force:
        old = json.loads(metadata_path.read_text(encoding="utf-8"))
        if old.get("etag"):
            headers["If-None-Match"] = old["etag"]
        elif old.get("last_modified"):
            headers["If-Modified-Since"] = old["last_modified"]

    destination.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(retries):
        fd, temp_path = tempfile.mkstemp(
            prefix=f".{destination.name}.",
            dir=destination.parent,
        )
        try:
            digest = hashlib.sha256()
            size = 0
            with (
                urlopen(Request(url, headers=headers), timeout=timeout) as response,
                os.fdopen(fd, "wb") as stream,
            ):
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
                stream.flush()
                os.fsync(stream.fileno())
                final = response.geturl()
                etag = response.headers.get("ETag")
                modified = response.headers.get("Last-Modified")

            metadata = DownloadMetadata(
                final,
                etag,
                modified,
                size,
                digest.hexdigest(),
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )
            os.replace(temp_path, destination)
            metadata_path.write_text(
                json.dumps(metadata.as_dict(), sort_keys=True, indent=2) + "\n",
                encoding="utf-8",
            )
            return metadata
        except BaseException:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass
            if attempt + 1 == retries:
                raise
            time.sleep(2**attempt)

    raise AssertionError("unreachable")


def download_verified_centers(
    url: str,
    manifest_url: str,
    manifest_key: str,
    destination: Path,
    metadata_path: Path,
    force: bool = False,
) -> DownloadMetadata:
    """Download the master catalogue artefact and verify its declared hash."""
    expected = fetch_manifest_sha256(manifest_url, manifest_key)
    metadata = download(
        url,
        destination,
        metadata_path,
        force=force,
    )
    if metadata.sha256.lower() != expected:
        destination.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)
        raise ValidationError(
            "Downloaded centres catalogue does not match the master manifest "
            f"({metadata.sha256} != {expected})"
        )
    return metadata
