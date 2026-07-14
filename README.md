# Distancias por carretera en Canarias

Matriz abierta y versionada de distancias por carretera entre centros educativos, aeropuertos y puertos principales de Canarias. Las distancias se calculan con datos oficiales, OpenStreetMap y OSRM, y se publican como un archivo estático que puede consultarse sin llamadas a APIs comerciales.

**Demo y documentación:** https://ateeducacion.github.io/distancias_centros_educativos_canarias/

## Características

- Consultas locales e inmediatas después de descargar el archivo.
- Sin claves API, cuotas ni coste por origen-destino.
- Matrices dirigidas separadas por isla.
- Formato CEDIST02 little-endian con una sola distancia `uint32` por combinación.
- Lectores para Python, PHP y JavaScript.
- Centros educativos, aeropuertos y puertos con códigos numéricos estables.
- Generación reproducible y artefactos verificados con SHA-256.

> La métrica es la distancia en metros de la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. No representa necesariamente la ruta geométricamente más corta.

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

## Artefactos

Cada release de datos publica:

- `canarias-distances.dat`: matriz CEDIST02 para acceso aleatorio.
- `canarias-distances.dat.zst`: copia comprimida para distribución.
- `centers.json` y `centers.min.json`: metadatos de ubicaciones.
- `transport-nodes.json`: definición versionada de puertos y aeropuertos.
- `manifest.json`: formato, fuentes, recuentos y hashes.
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

GitHub Pages siempre se construye desde el estado actual de `main`, pero consume los artefactos de la última release de datos. Un cambio de documentación o de los lectores no recalcula la matriz.

El workflow **Publish** comprueba semanalmente el CSV oficial de centros. También reconstruye los datos cuando cambian el generador o su configuración, y puede ejecutarse manualmente. Después de generar compara los hashes de `canarias-distances.dat` y `centers.min.json` con la última release:

- si ambos son iguales, no crea una release nueva;
- si alguno cambia, publica `data-YYYYMMDD-HHMM`, usando fecha y hora UTC, y la marca como la release más reciente.

La demo utiliza una copia verificada de esa release bajo `data/latest/`.

## Arquitectura

La generación descarga y valida las fuentes, ajusta las coordenadas a la red de OSRM y calcula tablas de distancias por bloques. El consumidor busca los dos códigos en un índice ordenado y lee directamente cuatro bytes de la matriz correspondiente.

CEDIST02 no almacena duración. Esto reduce casi a la mitad el binario sin comprimir respecto a CEDIST01 y evita presentar una estimación temporal sin tráfico como si fuera un tiempo de viaje actual.

[Documentación de arquitectura](https://ateeducacion.github.io/distancias_centros_educativos_canarias/architecture/)

## Licencias y límites

Código MIT; documentación CC BY 4.0; fuentes y base derivada se detallan en `DATA_LICENSES.md`. © OpenStreetMap contributors.

Solo se calculan distancias dentro de una misma isla y para las ubicaciones incluidas. No hay tráfico, obras, incidencias, horarios ni restricciones temporales. Los puertos y aeropuertos representan accesos por carretera, no trayectos marítimos o aéreos.
