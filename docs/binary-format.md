# Formato binario CEDIST04

CEDIST04 guarda únicamente distancias dirigidas y cuantizadas a 10 metros. Cada consulta termina en la lectura de dos bytes, sin deserializar la matriz completa.

[Consultar la especificación normativa](FORMAT.md){ .md-button .md-button--primary }

[Consultar la decisión de diseño](decisions/0002-cedist04-byte-planes.md){ .md-button }

## Resumen

- Cabecera fija de 64 bytes.
- Magic `CEDIST04` y major `4`.
- Índice global ordenado de 12 bytes por ubicación.
- Directorio de 16 bytes por isla.
- Una matriz dirigida `n × n` por isla, almacenada por **planos de byte** (todos los bytes bajos y luego todos los altos) para que el archivo comprima bien.
- Cada distancia ocupa 2 bytes (`uint16` little-endian).
- Cada unidad representa 10 metros.
- `0xFFFF` indica una distancia no disponible.
- Máximo representable: 655.340 metros.
- Sin tiempos, geometrías, nombres ni campos variables dentro del `.dat`.

Los nombres y metadatos se distribuyen por separado en `centers.min.json`.

## Precisión

Las distancias positivas se redondean al decámetro más próximo, con mitades hacia arriba:

| OSRM | Valor almacenado | Resultado publicado |
|---:|---:|---:|
| 1.234 m | 123 | 1.230 m |
| 1.235 m | 124 | 1.240 m |

El acceso es directo (dos bytes en dos planos):

```text
position = origin_local_index * location_count + destination_local_index
low  = read1(distance_offset + position)
high = read1(distance_offset + location_count * location_count + position)
```

## Distribución

Cada generación publica `canarias-distances.dat` como representación binaria única de acceso aleatorio, y `canarias-distances.dat.gz` (gzip determinista) para descargas sensibles al ancho de banda como el navegador, que lo descomprime de forma nativa. Los planos de byte no reducen el `.dat` en disco, pero hacen que el artefacto comprimido baje de ~988 KB (zstd de CEDIST03) a ~536 KB (zstd) / ~641 KB (gzip) sin pérdida de precisión.
