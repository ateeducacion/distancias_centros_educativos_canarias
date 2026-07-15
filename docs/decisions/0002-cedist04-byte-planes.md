# ADR 0002: CEDIST04 almacena la matriz por planos de byte

- Estado: aceptado
- Fecha: 2026-07-15
- Sustituye parcialmente a: [ADR 0001](0001-cedist03-decameters.md) (mantiene los decámetros; cambia la disposición en disco)

## Contexto

Las matrices dominan el `.dat` (~98,6 % del artefacto: 1.125 KB de 1.141 KB con 1.329 centros). Con CEDIST03 el archivo apenas se comprime: `zstd -19` solo lo baja de 1.141 KB a ~988 KB. La causa es la disposición: cada celda es un `uint16` intercalado cuyo **byte bajo es ruido** (entropía ≈ 8,0 bits/byte, incompresible) mezclado con un **byte alto muy estructurado** (≈ 5,1 bits/byte). Interleaved, ningún compresor genérico puede con el conjunto.

Las distancias son **direccionales** (`A→B ≠ B→A` en el 99 % de los pares; diferencia mediana ~550 m, y una cola de ~0,3 % por encima de 10 km asociada a centros mal *snappeados*). Por tanto **no** se puede almacenar solo un triángulo ni simetrizar sin degradar los datos publicados.

## Decisión

CEDIST04 conserva la cabecera, el índice, el directorio y **todos los offsets y tamaños de bloque** de CEDIST03. Cambian dos cosas, ambas sin pérdida:

1. **Planos de byte (SoA).** Dentro del bloque de cada isla se guardan primero `n*n` bytes bajos y después `n*n` bytes altos, en vez de celdas `uint16` intercaladas. Separar los planos hace que el archivo comprima bien conservando el acceso aleatorio `O(1)` (dos lecturas de 1 byte).
2. **Reordenado por proximidad.** El `local_index` de cada centro se asigna con un recorrido de vecino más cercano, de modo que filas y columnas contiguas guardan distancias parecidas. Es transparente para los lectores (consultan por código a través del índice global) y determinista.

Además, la publicación incluye `canarias-distances.dat.gz` (gzip determinista) para descargas sensibles al ancho de banda; el navegador lo descomprime de forma nativa con `DecompressionStream('gzip')`.

## Resultados (matriz real de producción, 7 islas, 1.329 centros)

| Artefacto | Tamaño |
|---|---:|
| CEDIST03 `.dat` (raw) | 1.141.350 B |
| CEDIST03 comprimido (`zstd -19`) | 987.753 B |
| CEDIST04 `.dat` (raw, mismo tamaño) | 1.141.350 B |
| **CEDIST04 comprimido (`gzip -9`)** | **640.709 B** |
| **CEDIST04 comprimido (`zstd -19`)** | **535.732 B** |

Verificación: transcodificar la matriz real a CEDIST04 y releer las **562.613** celdas produce **0 diferencias**.

## Consecuencias

- La descarga del navegador pasa de ~1,14 MB (raw, GitHub Pages no comprime `octet-stream`) a ~641 KB (gzip), sin dependencias añadidas.
- El `.dat` en disco no cambia de tamaño ni de semántica; sigue siendo de acceso aleatorio para Python/PHP.
- Cambio incompatible de formato: `major` pasa a `4`. Lectores, escritor, spec, fixture y tests se actualizan juntos.
- No se simetriza la matriz: la asimetría real se conserva. Los pares con asimetría anómala (>10 km) quedan como tarea de calidad de datos del *snapping*, ajena a este cambio.
