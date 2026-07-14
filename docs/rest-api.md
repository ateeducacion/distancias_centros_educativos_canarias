# API REST

La API opcional expone `GET /v1/distances/{origin}/{destination}` y devuelve `distance_m`. Internamente usa el mismo lector PHP y el archivo local `canarias-distances.dat`; no llama a servicios de mapas durante la petición.

La especificación OpenAPI 3.1 está en `api/openapi.yaml`. Responde 404 a códigos desconocidos, 422 a combinaciones entre islas o distancias no disponibles y 503 si el artefacto no puede abrirse o validarse.

El endpoint histórico `/v1/routes/{origin}/{destination}` se mantiene como alias temporal, pero ya no devuelve duración.
