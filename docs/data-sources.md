# Fuentes

## Centros educativos

La fuente maestra de la matriz es [`centros-distancias.csv`](https://ateeducacion.github.io/listado-centros-educativos-canarias/centros-distancias.csv), publicado por el catálogo versionado `listado-centros-educativos-canarias`. Su [`manifest.json`](https://ateeducacion.github.io/listado-centros-educativos-canarias/manifest.json) permite verificar el SHA-256 del CSV antes de importarlo. Las URLs se configuran en `config/sources.json`.

El catálogo reúne los centros del conjunto de datos abiertos de Canarias y los registros adicionales contrastados por ese proyecto. Se conservan los campos necesarios para identificar y localizar cada centro.

## Sedes adicionales de ATE y de la Consejería

`config/additional-centers.csv` conserva únicamente las dos oficinas Medusa y las dos sedes de la Consejería que todavía no figuran en la fuente maestra. Los CEP, EOEP y CER antes añadidos aquí se importan ahora desde el catálogo, sin duplicar sus códigos. Las referencias de los complementos se mantienen en `config/additional-centers-sources.json`.

### Política de coordenadas

- Si la fila tiene `host_center_code`, se reutilizan **exactamente** las coordenadas del centro anfitrión presente en el CSV oficial.
- Si no hay anfitrión, se mantienen coordenadas propias contrastadas con la dirección postal oficial.

No se inventan códigos: se usan los códigos oficiales de ocho dígitos de cada servicio.

## Cobertura de educación de personas adultas

Se importan las filas activas con coordenadas válidas que publica la fuente maestra, incluidos los registros de educación de personas adultas presentes en ella. No se mantienen listas locales de exclusión por denominación.

La [ADR 0003](decisions/0003-exclude-uapa.md) se conserva como decisión histórica: su exclusión respondía a la cobertura de la fuente usada en julio de 2026 y queda sustituida por la importación del catálogo maestro actual.

## Puertos y aeropuertos

Los nodos de transporte se mantienen en `config/transport-nodes.json`. El archivo registra el esquema de códigos, el alcance y las referencias utilizadas para contrastar denominaciones e inventarios. Las coordenadas representan accesos por carretera.

## Red viaria

El extracto de OpenStreetMap de Canarias se obtiene de Geofabrik y se procesa con el perfil de automóvil de OSRM.

## Trazabilidad

El manifiesto registra URL final, ETag, Last-Modified, tamaño y SHA-256 de las descargas, además del digest de la imagen OSRM, el hash del perfil, los overrides y los hashes de todos los artefactos publicados.
