# Formato binario CEDIST02

CEDIST02 guarda únicamente distancias dirigidas en metros. Cada consulta termina en la lectura de un solo `uint32`, sin deserializar la matriz completa.

[Consultar la especificación normativa](FORMAT.md){ .md-button .md-button--primary }

## Resumen

- Cabecera fija de 64 bytes.
- Índice global de 12 bytes por ubicación.
- Directorio de 16 bytes por isla.
- Una matriz `n × n` de distancias por isla.
- Códigos públicos como cadenas de ocho cifras y almacenamiento interno como `uint32`.
- `0xFFFFFFFF` para distancias no disponibles.
- Sin tiempos, geometrías, nombres ni campos variables dentro del `.dat`.

Los nombres y metadatos se distribuyen por separado en `centers.min.json`. Esta separación permite consultar el archivo binario desde PHP con `fseek()` y desde JavaScript con `DataView`.
