# Generación

La generación convierte fuentes abiertas en un archivo estático de distancias. Es la parte costosa del sistema y no se ejecuta para cada despliegue de la documentación.

## Proceso

1. Descargar y validar el CSV oficial de centros.
2. Incorporar los puertos y aeropuertos versionados.
3. Descargar el extracto de OpenStreetMap de Canarias.
4. Preparar OSRM con MLD y el perfil `car-shortest-distance` mediante `osrm-extract`, `osrm-partition` y `osrm-customize`.
5. Iniciar `osrm-routed --algorithm mld`.
6. Ajustar cada coordenada mediante `nearest`.
7. Solicitar tablas por bloques con la anotación `distance`; OSRM selecciona previamente cada ruta minimizando el peso `distance`.
8. Comprobar que ninguna distancia supera el máximo CEDIST03 de 655.340 metros.
9. Redondear a decámetros y escribir las matrices dirigidas en `canarias-distances.dat`.
10. Generar JSON, informes, manifiesto y hashes.

El proceso completo puede ejecutarse con `scripts/build-data-ci.sh`, indicando `DATA_VERSION` cuando se quiera asignar una versión concreta:

```sh
DATA_VERSION=data-local \
SOURCE_DATE_EPOCH="$(date -u +%s)" \
sh scripts/build-data-ci.sh
```

También puede ejecutarse mediante Docker:

```sh
make build-data
```

## Artefacto binario

La generación publica `canarias-distances.dat` como matriz CEDIST03. El archivo permite acceso aleatorio directo y es el que consumen los readers Python, PHP y JavaScript.

No se generan copias comprimidas. CEDIST03 ya reduce la parte dominante de la matriz a dos bytes por celda, y mantener un único artefacto evita dependencias y pasos adicionales de publicación y consumo.

## Publicación automática

El workflow **Publish** siempre construye GitHub Pages desde `main` y copia en `data/latest/` los artefactos de la última release cuyo tag empiece por `data-`.

La generación completa se ejecuta en estos casos:

- ejecución manual con la opción de reconstrucción activada;
- cambios en `main` que afecten al generador, al formato o a la configuración;
- comprobación semanal en la que el SHA-256 del CSV oficial de centros difiera del registrado en la última release.

Después de generar se comparan los SHA-256 de `canarias-distances.dat` y `centers.min.json` con los de la última release de datos. Si no cambian, se conserva la release existente. Si cambia alguno, se publica una nueva release:

```text
data-YYYYMMDD-HHMM
```

## Métrica y cuantización

OSRM selecciona el camino accesible de menor distancia y devuelve metros. No calcula la línea recta ni acredita el itinerario realmente recorrido. CEDIST03 aplica esta conversión antes de escribir cada celda:

```text
stored = max(1, (distance_meters + 5) // 10)
decoded_meters = stored * 10
```

El redondeo es al decámetro más próximo, con mitades hacia arriba. El manifiesto registra:

- unidad de almacenamiento;
- tipo y tamaño de celda;
- regla de redondeo;
- máximo representable;
- máxima distancia observada en la generación.

CEDIST03 no solicita ni almacena duraciones.

## Trazabilidad

El manifiesto registra las fuentes, sus hashes y metadatos HTTP, la imagen y digest de OSRM, el perfil, su peso `distance`, los overrides aplicados, la versión de datos y el SHA-256 de cada artefacto. Cada release fechada conserva los artefactos generados y apunta al commit de `main` utilizado.
