# Generación

La generación convierte fuentes abiertas en un archivo estático de distancias. Es la parte costosa del sistema y no se ejecuta para cada despliegue de la documentación.

## Proceso

1. Descargar y validar el CSV oficial de centros.
2. Incorporar los puertos y aeropuertos versionados.
3. Descargar el extracto de OpenStreetMap de Canarias.
4. Preparar OSRM con MLD mediante `osrm-extract`, `osrm-partition` y `osrm-customize`.
5. Iniciar `osrm-routed --algorithm mld`.
6. Ajustar cada coordenada mediante `nearest`.
7. Solicitar tablas por bloques con la anotación `distance`.
8. Escribir las matrices dirigidas en `canarias-distances.dat`.
9. Generar JSON, informes, manifiesto y hashes.

El proceso completo puede ejecutarse con `scripts/build-data-ci.sh`, indicando `DATA_VERSION` cuando se quiera asignar una versión concreta.

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

La fecha y la hora se expresan en UTC. La release se marca como **Latest**, por lo que los consumidores pueden usar una URL estable como:

```text
https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat
```

## Métrica

Cada valor es la distancia en metros correspondiente a la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. Los valores se redondean al entero más próximo, con mitades hacia arriba.

CEDIST02 no solicita ni almacena duraciones. Esto reduce el trabajo de generación, el tamaño de los artefactos y la posibilidad de interpretar un tiempo estático como una predicción actual.

## Trazabilidad

El manifiesto registra las fuentes, sus hashes y metadatos HTTP, la imagen y digest de OSRM, el perfil, los overrides aplicados, la versión de datos y el SHA-256 de cada artefacto. Cada release fechada conserva los artefactos generados y apunta al commit de `main` utilizado.
