# ADR 0002: calcular la distancia mínima por carretera

- Estado: aceptado
- Fecha: 2026-07-15

## Contexto

La generación utilizaba el perfil de automóvil de OSRM orientado a la ruta más rápida y solicitaba la anotación `distance` al servicio Table. La anotación no cambia la función objetivo: devuelve la longitud del camino que el perfil ya ha elegido. En islas con alternativas de duración parecida, el perfil podía escoger una vuelta por autovía decenas de kilómetros más larga que una carretera interior.

La normativa canaria general sobre indemnizaciones por razón del servicio tampoco define la ruta más rápida como kilometraje liquidable. El [artículo 20.4, en la redacción del Decreto 67/2002](https://www.gobiernodecanarias.org/boc/2002/088/001.html), indemniza por kilómetro recorrido. La [Orden de 9 de mayo de 2005](https://www.gobiernodecanarias.org/boc/2005/097/001.html) exige declarar el itinerario seguido. Por tanto, ninguna matriz previa acredita por sí sola el recorrido real.

OSRM 5.27.1 admite `weight_name = "distance"` en el [perfil oficial de automóvil](https://github.com/Project-OSRM/osrm-backend/blob/v5.27.1/profiles/car.lua). Esto conserva el tratamiento del acceso, los sentidos únicos, las restricciones de giro y los modos del perfil base, pero selecciona el camino cuya suma de longitudes sea menor.

## Decisión

La generación utilizará `config/osrm/car-shortest.lua`. El archivo carga `/opt/car.lua` de la imagen OSRM fijada y cambia únicamente `profile.properties.weight_name` a `distance`.

La métrica publicada será la distancia del camino accesible de menor longitud entre los puntos ajustados a la red. «Más corto» significa menor suma de longitudes dentro del grafo de carreteras disponible; no significa línea recta, ruta más rápida, ruta más eficiente energéticamente ni itinerario realmente recorrido.

Las matrices seguirán siendo dirigidas. Los sentidos únicos, restricciones y accesos pueden hacer que A→B y B→A tengan longitudes diferentes. No se simetrizarán los valores.

El manifiesto registrará el nombre y SHA-256 del perfil, el perfil base incluido en la imagen, `weight_name = "distance"`, el digest de la imagen y la anotación solicitada.

## Relación con servicios comerciales

Los servicios de mapas pueden ofrecer rutas rápidas, ecológicas o alternativas y cambiar sus criterios sin que el proyecto pueda reproducirlos. Esta decisión no intenta replicar un algoritmo propietario. Aplica el concepto común de camino mínimo mediante pesos de distancia sobre una versión identificada de OpenStreetMap y OSRM.

## Consecuencias

- Una ruta más larga no será seleccionada solo por ahorrar tiempo estimado.
- Los resultados serán reproducibles con la imagen, el perfil y las fuentes registrados.
- La matriz será una referencia objetiva de distancia mínima por carretera, no un justificante automático de kilometraje.
- El cambio modifica todos los datos derivados que el nuevo perfil resuelva por otro camino y exige una nueva versión de datos.
- CEDIST03 no cambia: la representación binaria, la unidad y el acceso aleatorio permanecen iguales, por lo que no se incrementa la versión del formato.
