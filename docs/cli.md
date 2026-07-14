# CLI

`bin/route-matrix --json query ORIGEN DESTINO --data RUTA` consulta un archivo CEDIST02 o CEDIST03 precomputado. Las opciones globales, como `--json`, se escriben antes del subcomando. Ninguna consulta llama a OSRM.

```sh
bin/route-matrix --json query 10000001 10000002 \
  --data data/samples/sample.dat
```

Salida:

```json
{"origin":"10000001","destination":"10000002","distance_m":1200}
```

`--binary` se acepta temporalmente como alias de `--data` para facilitar la migración. El campo `distance_m` siempre está expresado en metros; los archivos CEDIST03 producen valores con resolución de 10 metros.
