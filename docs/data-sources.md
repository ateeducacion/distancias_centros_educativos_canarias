# Fuentes

## Centros educativos

La fuente canónica es el conjunto **Centros educativos de Canarias** del catálogo general de Canarias Datos Abiertos (`centros-educativos-de-canarias`). El recurso principal es `centros.csv` (resource ID `b5e08adf-841b-4ba5-a599-4339e772d792`).

El recurso se resuelve mediante `package_show` de CKAN, verificando nombre, formato y estado. La configuración vive en `config/sources.json`. Se conservan únicamente los campos necesarios para identificar y localizar cada centro.

No se utiliza como fuente el CSV histórico de SITCAN ni recortes opendata distintos del dataset canónico.

## Servicios no docentes adicionales (CEP, EOEP, CER)

El CSV canónico omite como filas independientes varios **servicios educativos no docentes** que sí tienen código de centro y uso operativo (asesoramiento, formación del profesorado, recursos). Este repositorio los reintroduce de forma **curada y versionada** en:

| Archivo | Contenido |
|---------|-----------|
| `config/additional-centers.csv` | Lista de ubicaciones (código, nombre, isla, dirección, tipo, coordenadas o anfitrión) |
| `config/additional-centers-sources.json` | Referencias oficiales usadas para contrastar el listado |

Tipos incluidos hoy (recuento del CSV versionado en el repositorio):

| Tipo | Descripción breve |
|------|-------------------|
| **CEP** | Centros del Profesorado |
| **EOEP** | Equipos de Orientación Educativa y Psicopedagógica de zona |
| **CER** | Colectivos de Escuelas Rurales (listado oficial del curso referenciado en las fuentes) |

### Política de coordenadas

- Si la fila tiene `host_center_code`, se reutilizan **exactamente** las coordenadas del centro anfitrión presente en el CSV oficial.
- Si no hay anfitrión, se mantienen coordenadas propias contrastadas con la dirección postal oficial.

No se inventan códigos: se usan los códigos oficiales de ocho dígitos de cada servicio.

## UAPA y AAPA (excluidas)

Las **UAPA** (*Unidades de Actuación de Personas Adultas*) son aulas satélite de un CEPA (barrios u otros municipios de su zona de actuación). Las **AAPA** son aulas adscritas en centros penitenciarios.

- Están reguladas en la Orden de 20 de junio de 2017 (BOC nº 122), arts. 5 y 6.
- Forman parte de la red de adultos descrita por la Consejería, junto con el CEPA sede.
- **No** se incluyen en la matriz ni en `additional-centers.csv`.

**Motivo resumido:** el CSV canónico actual no las publica de forma estable como filas del directorio; su red puede activarse o desactivarse por curso; dependen del CEPA sede. La cobertura de adultos en la matriz se limita a los **CEPA** (y análogos) del catálogo oficial.

Decisión formal: [ADR 0003 — No incorporar UAPA a la matriz](decisions/0003-exclude-uapa.md).

## Puertos y aeropuertos

Los nodos de transporte se mantienen en `config/transport-nodes.json`. El archivo registra el esquema de códigos, el alcance y las referencias utilizadas para contrastar denominaciones e inventarios. Las coordenadas representan accesos por carretera.

## Red viaria

El extracto de OpenStreetMap de Canarias se obtiene de Geofabrik y se procesa con el perfil de automóvil de OSRM.

## Trazabilidad

El manifiesto registra URL final, ETag, Last-Modified, tamaño y SHA-256 de las descargas, además del digest de la imagen OSRM, el hash del perfil, los overrides y los hashes de todos los artefactos publicados.
