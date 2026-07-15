# API REST

La API opcional expone `GET /v1/distances/{origin}/{destination}` y devuelve `distance_m`. Internamente usa el lector PHP CEDIST04 y el archivo local `canarias-distances.dat`; no llama a servicios de mapas durante la petición.

La especificación OpenAPI 3.1 está en `api/openapi.yaml`. Responde 404 a códigos desconocidos, 422 a combinaciones entre islas o distancias no disponibles y 503 si el artefacto no puede abrirse o validarse.

`GET /v1/version` devuelve `CEDIST04` como formato binario y `v1` como versión de la API.
