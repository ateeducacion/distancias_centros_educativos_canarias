# OSRM

La versión, imagen y ruta del perfil se fijan en `config/routing.json`. `config/osrm/car-shortest.lua` carga el perfil de automóvil incluido en la imagen fijada y cambia únicamente `weight_name` a `distance`. Antes de producción debe resolverse y registrarse el digest OCI. La secuencia MLD es `osrm-extract`, `osrm-partition`, `osrm-customize` y `osrm-routed --algorithm mld`.
