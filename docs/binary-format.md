# Formato binario CEDIST03

CEDIST03 guarda únicamente distancias dirigidas y cuantizadas a 10 metros. Cada consulta termina en la lectura de un solo `uint16`, sin deserializar la matriz completa.

[Consultar la especificación normativa](FORMAT.md){ .md-button .md-button--primary }

[Consultar la decisión de diseño](decisions/0001-cedist03-decameters.md){ .md-button }

## Resumen

- Cabecera fija de 64 bytes.
- Magic `CEDIST03` y major `3`.
- Índice global ordenado de 12 bytes por ubicación.
- Directorio de 16 bytes por isla.
- Una matriz dirigida `n × n` por isla.
- Cada celda ocupa 2 bytes (`uint16` little-endian).
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

El acceso es directo:

```text
offset = distance_offset + position * 2
```

## Distribución

Cada generación publica `canarias-distances.dat` como representación binaria única. El mismo archivo permite descarga, almacenamiento y acceso aleatorio directo, sin una etapa previa de descompresión.
