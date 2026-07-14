# Distancias por carretera en Canarias

Matriz abierta y versionada de distancias por carretera entre centros educativos, aeropuertos y puertos principales de Canarias. Las distancias se calculan con datos oficiales, OpenStreetMap y OSRM, y se publican como un archivo estático que puede consultarse sin llamadas a APIs comerciales.

**Demo y documentación:** https://ateeducacion.github.io/distancias_centros_educativos_canarias/

## Características

- Consultas locales e inmediatas después de descargar el archivo.
- Sin claves API, cuotas ni coste por origen-destino.
- Matrices dirigidas separadas por isla.
- Formato CEDIST03 little-endian con una distancia `uint16` en decámetros por combinación.
- Acceso directo por offset: búsqueda de códigos y lectura de dos bytes.
- Lectores para Python, PHP y JavaScript, compatibles también con CEDIST02.
- Centros educativos, aeropuertos y puertos con códigos numéricos estables.
- Generación reproducible y artefactos verificados con SHA-256.

> La métrica es la distancia de la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. CEDIST03 la publica con una resolución de 10 metros.

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

## CEDIST03 frente a CEDIST02

CEDIST03 conserva la cabecera de 64 bytes, el índice global ordenado y el directorio por islas de CEDIST02. El cambio incompatible está limitado a las celdas de las matrices:

| Formato | Celda | Unidad | Máximo válido | No disponible |
|---|---:|---:|---:|---:|
| CEDIST02 | `uint32` | 1 metro | 4.294.967.294 m | `0xFFFFFFFF` |
| CEDIST03 | `uint16` | 10 metros | 655.340 m | `0xFFFF` |

La conversión CEDIST03 es:

```text
stored = max(1, (distance_meters + 5) // 10)
decoded_meters = stored * 10
```

Esto reduce aproximadamente un 50 % la parte dominante del `.dat`. El generador calcula la máxima distancia producida por OSRM y aborta si supera 655.340 metros. El razonamiento completo está en [`docs/decisions/0001-cedist03-decameters.md`](docs/decisions/0001-cedist03-decameters.md).

### Migración

- Los nuevos artefactos usan magic `CEDIST03` y major `3`.
- Los readers actuales detectan y leen tanto CEDIST02 como CEDIST03.
- Los readers anteriores que solo aceptan `CEDIST02` deben actualizarse antes de consumir una nueva release.
- La API continúa devolviendo `distanceMeters`; no cambia la interfaz pública.
- Los resultados CEDIST03 son múltiplos de 10 metros.

## Artefactos

Cada release de datos publica:

- `canarias-distances.dat`: matriz CEDIST03 para acceso aleatorio.
- `centers.json` y `centers.min.json`: metadatos de ubicaciones.
- `transport-nodes.json`: definición versionada de puertos y aeropuertos.
- `manifest.json`: formato, cuantización, fuentes, recuentos y hashes.
- informes de validación y ajuste a la red viaria.
- `SHA256SUMS`.

La última matriz publicada está disponible mediante una URL estable:

```text
https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat
```

Por compatibilidad histórica, los JSON conservan el nombre `centers`, aunque incluyen todas las ubicaciones consultables.

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

GitHub Pages siempre se construye desde el estado actual de `main`, pero consume los artefactos de la última release de datos. El workflow **Publish** reconstruye cuando cambian el generador, el formato o las fuentes y publica `data-YYYYMMDD-HHMM` únicamente cuando cambian la matriz o los metadatos.

## Arquitectura

La generación descarga y valida las fuentes, ajusta las coordenadas a la red de OSRM y calcula tablas de distancias por bloques. El consumidor busca los dos códigos en un índice ordenado y lee directamente dos bytes de la matriz CEDIST03 correspondiente.

[Documentación de arquitectura](https://ateeducacion.github.io/distancias_centros_educativos_canarias/architecture/)

## Licencias y límites

Código MIT; documentación CC BY 4.0; fuentes y base derivada se detallan en `DATA_LICENSES.md`. © OpenStreetMap contributors.

Solo se calculan distancias dentro de una misma isla y para las ubicaciones incluidas. No hay tráfico, obras, incidencias, horarios ni restricciones temporales. Los puertos y aeropuertos representan accesos por carretera, no trayectos marítimos o aéreos.
