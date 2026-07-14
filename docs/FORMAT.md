# Formato CEDIST02

CEDIST02 es un formato little-endian, determinista y sin compresión para consultar distancias por acceso aleatorio. La copia `.dat.zst` es únicamente un formato de distribución y debe descomprimirse antes de usar los lectores.

```text
+--------------------+ 0
| Header (64 bytes)  |
+--------------------+ 64
| Global index 12*n  | sorted by uint32 location_code
+--------------------+
| Island dir 16*i    |
+--------------------+
| Distance matrices  | uint32 row-major, one matrix per island
+--------------------+
```

## Cabecera

| Offset | Size | Type | Field |
|---:|---:|---|---|
| 0 | 8 | char[8] | `CEDIST02` |
| 8 | 2 | uint16 | major = 2 |
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

Las entradas se ordenan por `code`, de forma que los lectores pueden localizar una ubicación mediante búsqueda binaria.

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

Cada isla tiene una matriz dirigida `n × n` en orden row-major. Cada celda es un `uint32` little-endian:

- `0` aparece únicamente en la diagonal.
- `1..0xFFFFFFFE` representa metros enteros.
- `0xFFFFFFFF` representa una distancia no disponible.

La posición de una consulta es:

```text
position = origin_local_index * location_count + destination_local_index
offset = distance_offset + position * 4
```

Por tanto, una vez localizados ambos códigos, la lectura de la distancia es `O(1)`.

## Diferencias respecto a CEDIST01

CEDIST01 almacenaba una matriz de distancias y otra de duraciones. CEDIST02 elimina completamente la segunda matriz y reduce el directorio de islas de 24 a 16 bytes. El cambio es incompatible y por eso incrementa la versión mayor y modifica el magic.

## Fixture canónico

El vector hexadecimal inicial es:

```text
43 45 44 49 53 54 30 32 02 00 00 00 40 00 00 00
```

El fixture de conformidad es `data/samples/sample.dat`. Los lectores Python, PHP y JavaScript deben devolver `1200` metros para `10000001 → 10000002`.

## Versionado y validación

Los cambios incompatibles incrementan `major`; las ampliaciones interpretables por lectores existentes incrementan `minor`. Los lectores rechazan magic o major desconocidos, campos reservados no nulos, truncamiento, directorios discontinuos, offsets fuera de rango y datos posteriores a la última matriz.
