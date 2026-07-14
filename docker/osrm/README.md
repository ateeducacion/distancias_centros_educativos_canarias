# OSRM

La versión se fija una sola vez en `config/routing.json`. Antes de producción debe resolverse y registrarse el digest OCI. La secuencia MLD es `osrm-extract`, `osrm-partition`, `osrm-customize` y `osrm-routed --algorithm mld`.
