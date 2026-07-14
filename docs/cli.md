# CLI

`bin/route-matrix query ORIGEN DESTINO --data RUTA --json` consulta un archivo CEDIST02 precomputado. Ninguna consulta llama a OSRM.

```sh
bin/route-matrix --json query 10000001 10000002 \
  --data data/samples/sample.dat
```

Salida:

```json
{"origin":"10000001","destination":"10000002","distance_m":1200}
```

`--binary` se acepta temporalmente como alias de `--data` para facilitar la migración.
