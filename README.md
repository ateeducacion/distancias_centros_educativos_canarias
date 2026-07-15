# Distancias por carretera en Canarias

Matriz abierta y versionada de distancias por carretera entre centros educativos, aeropuertos y puertos principales de Canarias. Las distancias se calculan con datos oficiales, OpenStreetMap y OSRM, y se publican como un archivo estático que puede consultarse sin llamadas a APIs comerciales.

**Demo y documentación:** https://ateeducacion.github.io/distancias_centros_educativos_canarias/

## Características

- Consultas locales e inmediatas después de descargar el archivo.
- Sin claves API, cuotas ni coste por origen-destino.
- Matrices dirigidas separadas por isla.
- Formato CEDIST04 little-endian con una distancia `uint16` en decámetros por combinación.
- Acceso directo por offset: búsqueda de códigos y lectura de dos bytes.
- Lectores CEDIST04 para Python, PHP y JavaScript.
- Centros educativos, aeropuertos y puertos con códigos numéricos estables.
- Generación reproducible y artefactos verificados con SHA-256.

> La métrica es la distancia de la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. Los resultados tienen una resolución de 10 metros.

## Uso rápido

Python CLI:

```sh
bin/route-matrix --json query 10000001 10000002 \
  --data data/samples/sample.dat
```

PHP:

```php
use AteEducacion\CanariasRouteMatrix\Reader;

$reader = new Reader('/data/canarias-distances.dat');
$result = $reader->getDistance('35000011', '98030001');
echo $result->distanceMeters;
```

JavaScript:

```js
import { DistanceMatrix } from "./packages/javascript/src/index.js";

const matrix = await DistanceMatrix.load({
  dataUrl: "./canarias-distances.dat",
  centersUrl: "./centers.min.json",
});

console.log(matrix.getDistance("35000011", "98030001").distanceMeters);
```

REST opcional: `GET /v1/distances/{origin}/{destination}`.

## Formato CEDIST04

Cada celda de la matriz ocupa dos bytes y almacena decámetros:

```text
stored = max(1, (distance_meters + 5) // 10)
decoded_meters = stored * 10
```

`0` se reserva a la diagonal y `0xFFFF` representa una distancia no disponible. La máxima distancia representable es 655.340 metros. El generador aborta si una distancia supera ese límite.

La especificación completa está en [`docs/FORMAT.md`](docs/FORMAT.md) y la decisión de diseño en [`docs/decisions/0001-cedist03-decameters.md`](docs/decisions/0001-cedist03-decameters.md).

## Artefactos

Cada release de datos publica:

- `canarias-distances.dat`: matriz CEDIST04 para acceso aleatorio.
- `centers.json` y `centers.min.json`: metadatos de ubicaciones.
- `transport-nodes.json`: definición versionada de puertos y aeropuertos.
- `manifest.json`: formato, cuantización, fuentes, recuentos y hashes.
- informes de validación y ajuste a la red viaria.
- `SHA256SUMS`.

La última matriz publicada está disponible mediante una URL estable:

```text
https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat
```

## Códigos

Los centros mantienen sus códigos oficiales de ocho cifras. Los nodos sintéticos usan rangos reservados:

- `98IINNNN`: aeropuertos.
- `99IINNNN`: puertos.
- `II`: identificador estable de isla.
- `NNNN`: secuencia estable dentro de la isla.

Los códigos deben intercambiarse como cadenas, aunque se almacenen como `uint32` dentro del `.dat`.

## Generación y publicación

```sh
make bootstrap
make test
sh scripts/build-data-ci.sh
```

GitHub Pages se construye desde `main` y consume los artefactos de la última release de datos. El workflow **Publish** reconstruye cuando cambian el generador, el formato o las fuentes y publica `data-YYYYMMDD-HHMM` únicamente cuando cambian la matriz o los metadatos.

## Arquitectura

La generación descarga y valida las fuentes, ajusta las coordenadas a la red de OSRM y calcula tablas de distancias por bloques. El consumidor busca los dos códigos en un índice ordenado y lee directamente dos bytes de la matriz CEDIST04 correspondiente.

[Documentación de arquitectura](https://ateeducacion.github.io/distancias_centros_educativos_canarias/architecture/)

## Licencias y límites

Código MIT; documentación CC BY 4.0; fuentes y base derivada se detallan en `DATA_LICENSES.md`. © OpenStreetMap contributors.

Solo se calculan distancias dentro de una misma isla y para las ubicaciones incluidas. No hay tráfico, obras, incidencias, horarios ni restricciones temporales. Los puertos y aeropuertos representan accesos por carretera, no trayectos marítimos o aéreos.
