# Formato CEDIST03

CEDIST03 es un formato little-endian, determinista y sin compresión para consultar distancias mediante acceso aleatorio. Cada celda de la matriz usa un `uint16` que representa decámetros.

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

## Fixture canónico

El vector hexadecimal inicial de CEDIST03 es:

```text
43 45 44 49 53 54 30 33 03 00 00 00 40 00 00 00
```

`data/samples/sample.dat` es el único fixture canónico. Los lectores Python, PHP y JavaScript deben devolver `1200` metros para `10000001 → 10000002`.

## Versionado y validación

Los cambios incompatibles incrementan `major`; las ampliaciones interpretables por lectores existentes incrementan `minor`. Los lectores rechazan archivos que no usen magic `CEDIST03` y major `3`, campos reservados no nulos, truncamiento, directorios discontinuos, offsets fuera de rango y datos posteriores a la última matriz.
