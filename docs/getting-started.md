# Primeros pasos

Instala `uv`, Node.js, PHP/Composer y Docker. Después ejecuta:

```sh
make bootstrap
make test
bin/route-matrix --json query 10000001 10000002 \
  --data data/samples/sample.dat
```

Para generar el conjunto completo hacen falta Docker, `zstd`, las fuentes descargadas y tiempo suficiente para preparar OSRM y calcular las matrices por bloques:

```sh
DATA_VERSION=development sh scripts/build-data-ci.sh
```

Para consumir datos existentes no es necesario ejecutar OSRM. Descarga `canarias-distances.dat` y usa las guías de [JavaScript](javascript.md) o [PHP](php.md).
