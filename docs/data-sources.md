# Fuentes

## Centros educativos

El recurso `centros.csv` se resuelve mediante `package_show` de CKAN, verificando nombre, formato y estado. Se conservan únicamente los campos necesarios para identificar y localizar cada centro.

## Puertos y aeropuertos

Los nodos de transporte se mantienen en `config/transport-nodes.json`. El archivo registra el esquema de códigos, el alcance y las referencias utilizadas para contrastar denominaciones e inventarios. Las coordenadas representan accesos por carretera.

## Red viaria

El extracto de OpenStreetMap de Canarias se obtiene de Geofabrik y se procesa con el perfil de automóvil de OSRM.

## Trazabilidad

El manifiesto registra URL final, ETag, Last-Modified, tamaño y SHA-256 de las descargas, además del digest de la imagen OSRM, el hash del perfil, los overrides y los hashes de todos los artefactos publicados.
