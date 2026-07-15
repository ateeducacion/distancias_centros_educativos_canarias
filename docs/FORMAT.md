# Formato CEDIST04

CEDIST04 es un formato little-endian, determinista y sin compresión para consultar distancias mediante acceso aleatorio. Cada distancia usa un `uint16` que representa decámetros.

Respecto a CEDIST03, CEDIST04 conserva **todas** las cabeceras, índices, directorios y offsets, y el **mismo tamaño de bloque por isla** (`location_count² × 2` bytes). El único cambio es el *interior del bloque de cada isla*: en lugar de celdas `uint16` intercaladas, el bloque guarda primero un **plano con todos los bytes bajos** y después un **plano con todos los bytes altos**. Separar el byte bajo (ruidoso) del byte alto (estructurado) es lo que hace que la matriz se pueda comprimir: la forma intercalada de CEDIST03 es prácticamente incompresible con zstd/gzip.

```text
+--------------------+ 0
| Header (64 bytes)  |
+--------------------+ 64
| Global index 12*n  | sorted by uint32 location_code
+--------------------+
| Island dir 16*i    |
+--------------------+
| Distance matrices  | por isla: n*n bytes bajos, luego n*n bytes altos
+--------------------+
```

## Cabecera

| Offset | Size | Type | Field |
|---:|---:|---|---|
| 0 | 8 | char[8] | `CEDIST04` |
| 8 | 2 | uint16 | major = 4 |
| 10 | 2 | uint16 | minor |
| 12 | 4 | uint32 | header size = 64 |
| 16 | 4 | uint32 | flags = 0 |
| 20 | 2 | uint16 | island count |
| 22 | 2 | uint16 | reserved = 0 |
| 24 | 4 | uint32 | location count |
| 28 | 8 | uint64 | global index offset |
| 36 | 8 | uint64 | island directory offset |
| 44 | 8 | uint64 | file size |
| 52 | 12 | bytes | reserved = 0 |

## Índice global

Cada entrada ocupa 12 bytes y usa la estructura `<IBBHI>`:

| Field | Type | Description |
|---|---|---|
| code | uint32 | Código público numérico de ocho cifras |
| island_id | uint8 | Identificador estable de la isla |
| flags | uint8 | Reservado, actualmente cero |
| local_index | uint16 | Posición dentro de la matriz de la isla |
| metadata_index | uint32 | Posición en `centers.json` |

Las entradas se ordenan por `code`. Los lectores localizan una ubicación mediante búsqueda binaria. El `local_index` se asigna por un recorrido de vecino más cercano (para que filas y columnas contiguas guarden distancias parecidas y el archivo comprima mejor); es transparente para los lectores, que siempre consultan por `code`.

## Directorio de islas

Cada entrada ocupa 16 bytes y usa `<B3sIQ>`:

| Field | Type | Description |
|---|---|---|
| island_id | uint8 | Identificador estable de la isla |
| padding | byte[3] | Cero |
| location_count | uint32 | Número de filas y columnas |
| distance_offset | uint64 | Inicio del bloque de la isla |

Los bloques se almacenan consecutivamente y sin huecos.

## Matrices (planos de byte)

Cada isla tiene una matriz dirigida `n × n` en orden row-major, pero almacenada como dos planos consecutivos dentro del bloque de la isla:

- bytes `[0, n*n)` del bloque: byte **bajo** de cada celda.
- bytes `[n*n, 2*n*n)` del bloque: byte **alto** de cada celda.

Cada distancia es un `uint16`:

- `0` aparece únicamente en la diagonal.
- `1..0xFFFE` representa decámetros.
- `0xFFFF` representa una distancia no disponible.

La codificación normativa de una distancia positiva es:

```text
stored = max(1, (distance_meters + 5) // 10)
decoded_meters = stored * 10
```

El redondeo es al decámetro más próximo, con mitades hacia arriba. El `max(1, ...)` evita que una distancia positiva inferior a 5 metros se confunda con la diagonal.

La mayor distancia representable es:

```text
0xFFFE × 10 = 655340 metros
```

El generador debe rechazar una matriz que supere ese límite y registrar la máxima distancia observada en `manifest.json`.

La lectura de una consulta es `O(1)` (dos bytes en dos planos):

```text
position = origin_local_index * location_count + destination_local_index
low_byte  = read1(distance_offset + position)
high_byte = read1(distance_offset + location_count * location_count + position)
stored    = low_byte | (high_byte << 8)
```

## Artefacto comprimido

El `.dat` en disco mantiene el acceso aleatorio y **no** cambia de tamaño respecto a CEDIST03; los planos de byte solo hacen que **comprima bien**. La publicación incluye además `canarias-distances.dat.gz` (gzip determinista), pensado para descargas sensibles al ancho de banda como el navegador, que lo descomprime de forma nativa con `DecompressionStream('gzip')`. Los lectores locales (Python, PHP) siguen usando el `.dat` sin comprimir.

## Fixture canónico

El vector hexadecimal inicial de CEDIST04 es:

```text
43 45 44 49 53 54 30 34 04 00 00 00 40 00 00 00
```

`data/samples/sample.dat` es el único fixture canónico. Los lectores Python, PHP y JavaScript deben devolver `1200` metros para `10000001 → 10000002`.

## Versionado y validación

Los cambios incompatibles incrementan `major`; las ampliaciones interpretables por lectores existentes incrementan `minor`. Los lectores rechazan archivos que no usen magic `CEDIST04` y major `4`, campos reservados no nulos, truncamiento, directorios discontinuos, offsets fuera de rango y datos posteriores a la última matriz.
