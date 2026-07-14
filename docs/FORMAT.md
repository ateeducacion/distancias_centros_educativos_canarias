# Formato CEDIST01

Formato little-endian, determinista y sin compresión para acceso aleatorio. La copia `.zst` es solo de distribución.

```text
+--------------------+ 0
| Header (64 bytes)  |
+--------------------+ 64
| Global index 12*n  | sorted by uint32 center_code
+--------------------+
| Island dir 24*i    |
+--------------------+
| Distance matrices  | uint32 row-major
+--------------------+
| Duration matrices  | uint32 row-major
+--------------------+
```

## Cabecera

| Offset | Size | Type | Field |
|---:|---:|---|---|
| 0 | 8 | char[8] | `CEDIST01` |
| 8 | 2 | uint16 | major |
| 10 | 2 | uint16 | minor |
| 12 | 4 | uint32 | header size = 64 |
| 16 | 4 | uint32 | flags |
| 20 | 2 | uint16 | island count |
| 22 | 2 | uint16 | reserved = 0 |
| 24 | 4 | uint32 | center count |
| 28 | 8 | uint64 | global index offset |
| 36 | 8 | uint64 | island directory offset |
| 44 | 8 | uint64 | file size |
| 52 | 12 | bytes | reserved = 0 |

El índice global usa registros `<IBBHI>` de 12 bytes. El directorio usa `<B3sIQQ>` de 24 bytes. Las matrices son `uint32`: cero solo en diagonal y `0xFFFFFFFF` significa ruta no disponible.

Vector hexadecimal inicial: `43 45 44 49 53 54 30 31 01 00 00 00 40 00 00 00`. El fixture canónico es `data/samples/sample.bin`.

Versionado: cambios incompatibles incrementan `major`; campos interpretables por lectores existentes incrementan `minor`. Para añadir campos se crea una nueva versión y nunca se reutilizan reservados sin documentar compatibilidad. Los lectores rechazan `major` superior, reservados no nulos, truncamiento, offsets y tamaños inválidos.
