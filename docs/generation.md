# Generación

La generación convierte fuentes abiertas en un archivo estático de distancias. Es la parte costosa del sistema y no se ejecuta para cada despliegue de la documentación.

## Fuente de centros educativos

La fuente canónica es el conjunto **Centros educativos de Canarias** del catálogo general de Canarias Datos Abiertos:

- Identificador CKAN: `centros-educativos-de-canarias`.
- Recurso principal: `centros.csv`.
- Resource ID: `b5e08adf-841b-4ba5-a599-4339e772d792`.
- URL de respaldo: `https://datos.canarias.es/catalogos/general/dataset/f6b15811-014b-46f7-a858-fe48b062ed05/resource/b5e08adf-841b-4ba5-a599-4339e772d792/download/centros.csv`.

La descarga consulta primero `package_show` en CKAN y selecciona el recurso CSV activo llamado `centros.csv`. Si la consulta al catálogo falla, utiliza la URL de respaldo del mismo recurso. No se utiliza como fuente el CSV histórico de SITCAN (`https://opendata.sitcan.es/upload/educacion/centros.csv`).

La configuración se mantiene en `config/sources.json`. El manifiesto de cada release registra la URL final, el tamaño, los metadatos HTTP y el SHA-256 del fichero descargado.

### Servicios no docentes y exclusiones

Tras el CSV canónico se incorporan las filas de `config/additional-centers.csv` (CEP, EOEP y CER), resolviendo coordenadas propias o las del centro anfitrión (`host_center_code`). Detalle y política: [Fuentes](data-sources.md).

**No** se importan UAPA ni AAPA (aulas satélite o penitenciarias de la red de adultos). Decisión: [ADR 0003](decisions/0003-exclude-uapa.md).

## Proceso

1. Descargar y validar el CSV oficial de centros.
2. Incorporar los servicios no docentes de `config/additional-centers.csv` (CEP, EOEP, CER).
3. Incorporar los puertos y aeropuertos versionados.
4. Descargar el extracto de OpenStreetMap de Canarias.
5. Preparar OSRM con MLD mediante `osrm-extract`, `osrm-partition` y `osrm-customize`.
6. Iniciar `osrm-routed --algorithm mld`.
7. Ajustar cada coordenada mediante `nearest`.
8. Solicitar tablas por bloques con la anotación `distance`.
9. Comprobar que ninguna distancia supera el máximo CEDIST04 de 655.340 metros.
10. Redondear a decámetros y escribir las matrices dirigidas en `canarias-distances.dat`.
11. Generar JSON, informes, manifiesto y hashes.

El proceso completo puede ejecutarse con `scripts/build-data-ci.sh`, indicando `DATA_VERSION` cuando se quiera asignar una versión concreta:

```sh
DATA_VERSION=data-local \
SOURCE_DATE_EPOCH="$(date -u +%s)" \
sh scripts/build-data-ci.sh
```

También puede ejecutarse mediante Docker:

```sh
make build-data
```

## Artefacto binario

La generación publica `canarias-distances.dat` como matriz CEDIST04. El archivo permite acceso aleatorio directo y es el que consumen los readers Python, PHP y JavaScript.

No se generan copias comprimidas. CEDIST04 ya reduce la parte dominante de la matriz a dos bytes por celda, y mantener un único artefacto evita dependencias y pasos adicionales de publicación y consumo.

## Publicación automática

El workflow **Publish** siempre construye GitHub Pages desde `main` y copia en `data/latest/` los artefactos de la última release cuyo tag empiece por `data-`.

La generación completa se ejecuta en estos casos:

- ejecución manual con la opción de reconstrucción activada;
- cambios en `main` que afecten al generador, al formato o a la configuración;
- comprobación semanal en la que el SHA-256 del CSV oficial de centros difiera del registrado en la última release.

Después de generar se comparan los SHA-256 de `canarias-distances.dat` y `centers.min.json` con los de la última release de datos. Si no cambian, se conserva la release existente. Si cambia alguno, se publica una nueva release:

```text
data-YYYYMMDD-HHMM
```

## Métrica y cuantización

OSRM devuelve metros. CEDIST04 aplica esta conversión antes de escribir cada celda:

```text
stored = max(1, (distance_meters + 5) // 10)
decoded_meters = stored * 10
```

El redondeo es al decámetro más próximo, con mitades hacia arriba. El manifiesto registra:

- unidad de almacenamiento;
- tipo y tamaño de celda;
- regla de redondeo;
- máximo representable;
- máxima distancia observada en la generación.

CEDIST04 no solicita ni almacena duraciones.

## Trazabilidad

El manifiesto registra las fuentes, sus hashes y metadatos HTTP, la imagen y digest de OSRM, el perfil, los overrides aplicados, la versión de datos y el SHA-256 de cada artefacto. Cada release fechada conserva los artefactos generados y apunta al commit de `main` utilizado.
