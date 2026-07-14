# Changelog

## Unreleased

- Add eight public airports and fifteen principal ports as numeric routable locations.
- Reserve `98IINNNN` for airports and `99IINNNN` for ports, with stable island digits.
- Build and deploy the GitHub Pages data bundle directly from `main`.
- Build release assets from tags and allow manual repair of an existing tag publication.
- Decouple generated data versions from the Python and JavaScript package versions.
- Replace CEDIST01 with the incompatible distance-only CEDIST02 format.
- Remove duration generation, storage and API fields, reducing the uncompressed matrix to approximately half its former size.
- Rename the primary artifact to `canarias-distances.dat` and provide distance-only readers for Python, PHP and JavaScript.
- Move the automatic live demo to the documentation homepage.
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
