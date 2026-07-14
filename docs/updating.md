# Actualización

GitHub Pages se reconstruye desde la rama `main`, pero una publicación de documentación no regenera necesariamente la matriz. El workflow **Publish** decide primero si debe reconstruir los datos:

- en una ejecución manual, según la opción de reconstrucción;
- en la comprobación semanal, cuando cambia el SHA-256 del CSV oficial;
- en un `push` a `main`, cuando cambian el generador, el formato o su configuración.

Si la reconstrucción produce cambios en `canarias-distances.dat` o `centers.min.json`, se crea una release `data-YYYYMMDD-HHMM` y se marca como la release más reciente. En caso contrario se conserva la release de datos existente. El despliegue copia siempre en `data/latest/` una versión verificada de esos artefactos.

Por tanto, `data/latest/` representa la última release `data-*`, no necesariamente el contenido generado por el commit más reciente de `main`. Los tags `v*` versionan el código; las instantáneas de datos son los tags `data-*`.

Una aplicación que necesite resultados inmutables debe usar una release `data-*` concreta, comprobar su manifiesto y alojar esos archivos en su propio almacenamiento estático.

La actualización de un consumidor PHP debe hacerse fuera de la petición web: descargar a un archivo temporal, validar tamaño y SHA-256 y sustituir el archivo activo mediante `rename()`. En JavaScript, el navegador o el CDN pueden usar las cabeceras de caché del alojamiento estático.
