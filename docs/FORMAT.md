# Formato CEDIST03

CEDIST03 es un formato little-endian, determinista y sin compresión para consultar distancias mediante acceso aleatorio. Conserva la organización de CEDIST02 y cambia únicamente la codificación de las celdas de la matriz: de `uint32` en metros a `uint16` en decámetros.

Las copias `.dat.zst` y `.dat.seekable.zst` son formatos de distribución. Los lectores incluidos trabajan con el `.dat` descomprimido; la variante seekable permite que herramientas compatibles recuperen rangos sin descomprimir todos los frames.

```text
+--------------------+ 0
| Header (64 bytes)  |
+--------------------+ 64
| Global index 12*n  | sorted by uint32 location_code
+--------------------+
| Island dir 16*i    |
+--------------------+
| Distance matrices  | uint16 row-major, one matrix per island
+--------------------+
```

## Cabecera

La estructura de la cabecera no cambia respecto a CEDIST02.

| Offset | Size | Type | Field |
|---:|---:|---|---|
| 0 | 8 | char[8] | `CEDIST03` |
| 8 | 2 | uint16 | major = 3 |
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

Las entradas se ordenan por `code`. Los lectores localizan una ubicación mediante búsqueda binaria.

## Directorio de islas

Cada entrada ocupa 16 bytes y usa `<B3sIQ>`:

| Field | Type | Description |
|---|---|---|
| island_id | uint8 | Identificador estable de la isla |
| padding | byte[3] | Cero |
| location_count | uint32 | Número de filas y columnas |
| distance_offset | uint64 | Inicio de la matriz de distancias |

Las matrices se almacenan consecutivamente y sin huecos.

## Matrices

Cada isla tiene una matriz dirigida `n × n` en orden row-major. Cada celda es un `uint16` little-endian:

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

La posición de una consulta es:

```text
position = origin_local_index * location_count + destination_local_index
offset = distance_offset + position * 2
```

Una vez localizados ambos códigos, la lectura de la distancia es `O(1)`.

## Compatibilidad con CEDIST02

Los lectores oficiales detectan conjuntamente magic y major:

| Formato | Magic | Major | Celda | Unidad | No disponible |
|---|---|---:|---:|---:|---:|
| CEDIST02 | `CEDIST02` | 2 | `uint32` | 1 metro | `0xFFFFFFFF` |
| CEDIST03 | `CEDIST03` | 3 | `uint16` | 10 metros | `0xFFFF` |

El escritor genera CEDIST03 por defecto. Durante la transición, el escritor Python puede producir un fixture CEDIST02 con `format_major=2`.

## Zstandard seekable

`canarias-distances.dat.seekable.zst` usa el formato Zstandard Seekable: varios frames independientes y una tabla de búsqueda final. Sigue siendo descomprimible por un decodificador Zstandard convencional, que ignora la tabla incluida en el frame skippable.

Los readers del proyecto no consultan directamente el archivo comprimido. Deben recibir un `.dat` descomprimido. Esta decisión mantiene pequeños y simples los lectores; la variante seekable queda disponible para CDN, almacenamiento y consumidores especializados.

## Fixture canónico

El vector hexadecimal inicial de CEDIST03 es:

```text
43 45 44 49 53 54 30 33 03 00 00 00 40 00 00 00
```

- `data/samples/sample.dat` es el fixture CEDIST03.
- `data/samples/sample-v2.dat` conserva el fixture CEDIST02 de compatibilidad.

Los lectores Python, PHP y JavaScript deben devolver `1200` metros para `10000001 → 10000002` en ambos archivos.

## Versionado y validación

Los cambios incompatibles incrementan `major`; las ampliaciones interpretables por lectores existentes incrementan `minor`. Los lectores rechazan magic y major incoherentes, campos reservados no nulos, truncamiento, directorios discontinuos, offsets fuera de rango y datos posteriores a la última matriz.
