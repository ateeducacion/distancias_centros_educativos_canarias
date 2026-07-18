# ADR 0003: No incorporar UAPA a la matriz de distancias

- Estado: aceptado
- Fecha: 2026-07-18

## Contexto

Las **Unidades de Actuación de Personas Adultas (UAPA)** son aulas satélite de un **CEPA** (Centro de Educación de Personas Adultas). No están en el edificio sede: se ubican en barrios del mismo municipio o en otros municipios de la zona de actuación del CEPA, a menudo en un centro ordinario (p. ej. un IES) o en un local de otro organismo público.

### Fundamento normativo y organizativo

La **Orden de 20 de junio de 2017** (BOC nº 122), artículo 5, regula las UAPA:

- los CEPA pueden crearlas dentro de su ámbito geográfico;
- pueden situarse en la red de centros públicos o en espacios de otros organismos públicos;
- deben cumplir requisitos de local (superficie mínima, seguridad, accesibilidad, TIC, etc.);
- al inicio de cada curso el equipo directivo actualiza si están **activas o inactivas** y sus datos de localización.

La misma orden (art. 6) distingue las **AAPA** (aulas adscritas en establecimientos penitenciarios).

La web de la Consejería de Educación describe la red de adultos como **CEPA sede + UAPA + AAPA** y el buscador de centros ofrece el tipo *Unidad de Actuación de Personas Adultas*:

- https://www.gobiernodecanarias.org/educacion/web/adultos/centros-adultos-canarias/

### Presencia en datos abiertos

| Fuente | UAPA como filas independientes |
|--------|--------------------------------|
| CSV canónico **Centros educativos de Canarias** (`centros-educativos-de-canarias`, datos de mayo de 2026) | **No** (el directorio se centra en centros docentes; casi no aparecen filas `DesEtapaCentro=UAPA`) |
| Snapshot opendata de 2025 (recorte histórico con el mismo tipo de catálogo ampliado) | **Sí** (~162 filas `TipoCentro=No Docente`, ligadas a un CEPA vía `CentroCepaAlQuePertenece`; la mayoría con latitud/longitud) |
| `config/additional-centers.csv` de este repositorio | **No** — solo CEP, EOEP y CER |

Las filas UAPA del snapshot 2025 reutilizan el correo del CEPA sede y no son centros docentes independientes.

Este repositorio ya reintroduce, de forma **curada**, servicios no docentes omitidos del CSV canónico (CEP, EOEP, CER) mediante `config/additional-centers.csv`. Las UAPA plantean un caso distinto: existen en la organización educativa, pero **no** se publican de forma estable en el recurso CKAN que alimenta la matriz, y su red puede variar de un curso a otro.

## Decisión

**No** se añaden UAPA (ni AAPA) a:

1. el conjunto de ubicaciones de la matriz CEDIST04;
2. `config/additional-centers.csv`;
3. ninguna fuente automática del generador.

La cobertura de educación de personas adultas en la matriz se limita a los **CEPA sede** (y, en su caso, CEAD u otros tipos) que figuren en el CSV canónico de centros educativos.

Si en el futuro se necesitara proximidad a aulas UAPA concretas, se revisaría esta decisión y solo se reintroduciría una lista **curada y versionada**, con política de coordenadas análoga a la de CEP/EOEP/CER y con una fuente oficial mantenida (no un snapshot opendata abandonado).

## Motivación

1. **Fuente canónica.** El dataset CKAN actual no mantiene las UAPA como filas del directorio. Congelar un snapshot 2025 las haría datos de segunda clase sin trazabilidad CKAN.
2. **Volatilidad.** La propia norma prevé altas, bajas y cambios de localización por curso (art. 5.5). Una matriz estática versionada no es el mejor sitio para una red tan dinámica sin proceso de curación.
3. **Dependencia del CEPA.** La UAPA no es un centro de gestión independiente: depende del CEPA sede (correo, organización, oferta). Para la mayoría de usos de distancias entre centros basta el código del CEPA.
4. **Precedente selectivo.** CEP, EOEP y CER se reintroducen porque hay listas oficiales estables y un caso de uso claro en la red de servicios educativos. Las UAPA no cumplen hoy ese criterio de mantenimiento.
5. **Riesgo de confusión.** Importar ~160 aulas satélite hincharía la matriz y el buscador sin mejorar, en general, las distancias entre centros docentes.

## Consecuencias

- La matriz y `centers.json` **no** exponen códigos UAPA ni AAPA.
- Quien necesite localizar una aula concreta debe consultar el CEPA sede, el buscador de centros de la Consejería o la web del propio CEPA.
- Los consumidores que reutilicen catálogos WordPress/Formidable con filas UAPA históricas (p. ej. reimportaciones de un opendata 2025) no deben interpretar esa presencia como cobertura de este repositorio.
- Documentación relacionada: [Fuentes](../data-sources.md), [Limitaciones](../limitations.md), [Generación](../generation.md).

## Referencias

- Orden de 20 de junio de 2017, por la que se establecen las normas de organización y funcionamiento de los CEPA (BOC nº 122; art. 5 UAPA, art. 6 AAPA): https://www.gobiernodecanarias.org/boc/2017/122/001.html
- Centros Educativos para Personas Adultas (Consejería): https://www.gobiernodecanarias.org/educacion/web/adultos/centros-adultos-canarias/
- Dataset canónico: https://datos.canarias.es/catalogos/general/dataset/centros-educativos-de-canarias
