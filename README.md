# Distancias entre centros educativos de Canarias

Matriz abierta y versionada de distancias y tiempos por carretera entre centros educativos de Canarias, generada con datos oficiales y OpenStreetMap.

Estado: implementación inicial. Los artefactos de producción se generan fuera de Git; el repositorio incluye un fixture ficticio de conformidad.

> La métrica es: «Distancia y duración correspondientes a la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real». No representa la ruta más corta ni una predicción de tráfico real.

## Fuentes y privacidad

Los centros proceden del [Portal de Datos Abiertos de Canarias](https://datos.canarias.es/) mediante resolución CKAN con fallback configurable. La red viaria procede de OpenStreetMap/Geofabrik. `centers.json` solo conserva código, nombre, isla, municipio, localidad, dirección, código postal, coordenadas, naturaleza y tipo; elimina teléfonos, correo, fax, fotos y campos no usados.

## Inicio rápido

```sh
make bootstrap
make test
bin/route-matrix --json query 10000001 10000002
```

PHP:

```php
$reader = new AteEducacion\CanariasRouteMatrix\Reader('/data/routes.bin', '/data/centers.json');
$route = $reader->getRoute('35000011', '35000033');
```

JavaScript:

```js
const matrix = await RouteMatrix.load({binaryUrl: './routes.bin', centersUrl: './centers.min.json'});
console.log(matrix.getRoute('35000011', '35000033'));
```

REST: `GET /v1/routes/{origin}/{destination}`. Los códigos se intercambian siempre como cadenas.

## Arquitectura

```mermaid
flowchart TD
    A[CSV oficial de centros] --> C[Validación y normalización]
    B[OpenStreetMap Canarias] --> D[OSRM autohospedado]
    C --> E[Centros agrupados por isla]
    D --> F[Cálculo por bloques]
    E --> F
    F --> G[Validación y auditoría]
    G --> H[Binario CEDIST01]
    G --> I[centers.json]
    G --> J[manifest.json]
    H --> K[Lector PHP]
    H --> L[Lector JavaScript]
    H --> M[CLI]
    H --> N[API REST]
    H --> O[Demo GitHub Pages]
```

Los artefactos previstos son el binario, su copia Zstandard, dos JSON de centros, manifiesto, informes y `SHA256SUMS`. Sus conteos se leen del manifiesto, nunca se mantienen a mano.

## Desarrollo y pruebas

`make help`, `make lint`, `make test`, `make test-conformance`, `make docs-build` y `make docker-build`. En macOS: `brew install uv composer shellcheck shfmt`; en Ubuntu se usan los paquetes equivalentes. Consulte `CONTRIBUTING.md`.

## Actualización, documentación y demo

`make download-centers validate-centers download-osm prepare-osrm build-data`. El sitio Zensical se sirve con `make docs-serve`; la demo estática consume una tríada coherente bajo `data/latest/`.

## Licencias, atribución y límites

Código MIT; documentación CC BY 4.0; fuentes y base derivada se tratan por separado en `DATA_LICENSES.md`. © OpenStreetMap contributors. Sin tráfico, incidencias, horarios ni restricciones temporales; solo automóvil; solo consultas dentro de una isla; coordenadas y red pueden quedar desactualizadas; una ruta no disponible no prueba que no exista acceso físico.

Contribuciones: `CONTRIBUTING.md`. Seguridad: `SECURITY.md`.
