# CLI

`bin/route-matrix --json query ORIGEN DESTINO --data RUTA` consulta un archivo CEDIST04 precomputado. Las opciones globales, como `--json`, se escriben antes del subcomando. La consulta es local y no llama a OSRM.

```sh
bin/route-matrix --json query 10000001 10000002 \
  --data data/samples/sample.dat
```

Salida:

```json
{"origin":"10000001","destination":"10000002","distance_m":1200}
```

El campo `distance_m` se expresa en metros y tiene una resolución de 10 metros.
