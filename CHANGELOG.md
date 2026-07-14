# Changelog

## Unreleased

- Add eight public airports and fifteen principal ports as numeric routable locations.
- Reserve `98IINNNN` for airports and `99IINNNN` for ports, with stable island digits.
- Build GitHub Pages from `main` with the latest published data snapshot.
- Publish data releases as `data-YYYYMMDD-HHMM` only when the matrix or location metadata changes.
- Check the official centers CSV weekly and rebuild when its SHA-256 changes.
- Decouple generated data versions from the Python and JavaScript package versions.
- Store only road distances and remove duration generation, storage and API fields.
- Use CEDIST03 with `uint16` decameter cells and reject values above 655,340 meters.
- Support only CEDIST03 in the Python, PHP and JavaScript readers, CLI, REST API, browser demo and WordPress example.
- Remove legacy format detection, writer options, API aliases and CEDIST02 fixtures.
- Round generated distances to the nearest decameter, halves up.
- Publish only the uncompressed `canarias-distances.dat` matrix artifact.
- Record cell encoding, quantization, maximum representable distance and observed maximum distance in the manifest.
- Add a CEDIST03 ADR and cross-language CEDIST03 conformance tests.
- Rename the primary artifact to `canarias-distances.dat` and provide distance-only readers for Python, PHP and JavaScript.
- Move the automatic live demo to the documentation homepage.
- Redesign the homepage around a local interactive map, origin and destination search, and a clearer distance result.
- Simplify the homepage to select an island first and render only its locations and map.
- Replace the interactive map with a lightweight SVG route backdrop and add Bash, PowerShell and Python quick starts.
- Group format, sources, quality, generation, updates, limitations and licensing under Architecture.
- Expand the PHP, JavaScript, architecture and binary-format documentation.

## 0.0.3 - 2026-07-14

- Generate the first complete matrix from 1,306 official centers and a current Canary Islands OSM extract.
- Publish the real CEDIST01 binary, Zstandard copy, minimized centers, reports, manifest and checksums.
- Make Pages consume and verify the latest GitHub Release assets.
- Add an auditable official-source override for the malformed CIFP Las Indias longitude.

## 0.0.2 - 2026-07-14

- Publish the exact Pages data bundle as versioned GitHub Release assets.
- Verify bundle hashes and tag/manifest consistency before release and Pages deployment.

## 0.0.1 - 2026-07-14

- Initial CEDIST01 implementation and cross-language fixture.
- Static Zensical demo with searchable Select2 controls and Web Worker queries.
