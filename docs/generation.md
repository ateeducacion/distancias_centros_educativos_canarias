# Generación

La generación convierte fuentes abiertas en un archivo estático de distancias. Es la parte costosa del sistema y se ejecuta al desplegar `main` o publicar una versión, nunca durante una consulta de usuario.

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

## Métrica

Cada valor es la distancia en metros correspondiente a la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. Los valores se redondean al entero más próximo, con mitades hacia arriba.

CEDIST02 no solicita ni almacena duraciones. Esto reduce el trabajo de generación, el tamaño de los artefactos y la posibilidad de interpretar un tiempo estático como una predicción actual.

## Reproducibilidad

El manifiesto registra las fuentes, sus hashes y metadatos HTTP, la imagen y digest de OSRM, el perfil, los overrides aplicados, la versión de datos y el SHA-256 de cada artefacto.
