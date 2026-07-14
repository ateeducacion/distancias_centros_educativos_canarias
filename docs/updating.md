# Actualización

GitHub Pages se reconstruye desde la rama `main`. Cada despliegue descarga las fuentes configuradas, prepara OSRM, genera `canarias-distances.dat`, verifica `SHA256SUMS` y publica la documentación junto con la demo.

La URL `data/latest` representa por tanto el estado actual de `main`; no hace falta crear un tag para mostrar cambios en la web.

Los tags `v*` crean snapshots independientes en GitHub Releases. Una aplicación que necesite resultados inmóviles debe usar una release concreta, comprobar su manifiesto y alojar esos archivos en su propio almacenamiento estático.

La actualización de un consumidor PHP debe hacerse fuera de la petición web: descargar a un archivo temporal, validar tamaño y SHA-256 y sustituir el archivo activo mediante `rename()`. En JavaScript, el navegador o el CDN pueden usar las cabeceras de caché del alojamiento estático.
