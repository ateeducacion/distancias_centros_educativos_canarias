# ADR 0001: CEDIST03 usa `uint16` en decámetros

- Estado: aceptado
- Fecha: 2026-07-14

## Contexto

El formato anterior almacenaba cada distancia como un `uint32` en metros. Las matrices son densas y dominan casi por completo el tamaño del artefacto, por lo que reducir cada celda de cuatro a dos bytes reduce aproximadamente a la mitad el `.dat` sin cambiar el índice, el directorio por islas ni el acceso directo por offset.

El proyecto solo contiene rutas por carretera dentro de una misma isla. No almacena trayectos marítimos o aéreos ni combinaciones entre islas.

## Decisión

CEDIST03 usa una cabecera de 64 bytes, un índice global ordenado de 12 bytes por ubicación y un directorio de 16 bytes por isla. Cada celda es un `uint16` little-endian en unidades de 10 metros.

La conversión normativa es:

```text
stored = max(1, (distance_meters + 5) // 10)  # fuera de la diagonal
decoded_meters = stored * 10
```

`0` queda reservado para la diagonal y `0xFFFF` para una distancia no disponible. El mayor valor válido es `0xFFFE`, equivalente a 655.340 metros.

## Seguridad del rango

655,34 km es un límite ampliamente superior a una ruta por carretera razonable dentro de una sola isla de Canarias. No se depende únicamente de esa apreciación geográfica: el generador calcula la máxima distancia producida por OSRM, la registra en `manifest.json` y aborta si cualquier valor supera 655.340 metros. Así, una ampliación futura del ámbito no puede desbordar silenciosamente el formato.

## Consecuencias

- La matriz ocupa aproximadamente un 50 % menos que con celdas `uint32`.
- La precisión publicada es de 10 metros, con redondeo al decámetro más próximo y mitades hacia arriba.
- Una consulta sigue siendo `O(1)` y requiere `seek` más lectura de dos bytes.
- Los lectores Python, PHP y JavaScript aceptan exclusivamente CEDIST03.
- El escritor genera exclusivamente CEDIST03.
