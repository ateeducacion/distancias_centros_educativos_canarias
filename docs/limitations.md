# Limitaciones

- No incorpora tráfico, obras, incidencias, horarios ni restricciones temporales.
- El perfil publicado está orientado a automóvil.
- La distancia corresponde al camino accesible de menor longitud según el perfil y la red usados; no es una medición del itinerario efectivamente recorrido.
- Solo se consultan ubicaciones de una misma isla.
- Las coordenadas y la red viaria pueden quedar desactualizadas entre generaciones.
- Una distancia no disponible no demuestra que el acceso físico sea imposible.
- Los puertos y aeropuertos representan sus accesos por carretera; no se modelan trayectos marítimos ni aéreos.
- CEDIST03 no contiene duración. Para tiempos actuales, tráfico o rutas dinámicas debe utilizarse un servicio de rutas adecuado en el momento de la consulta.
- **UAPA y AAPA** (aulas satélite o en centros penitenciarios de la red de adultos) **no** forman parte del conjunto de ubicaciones. Solo entran los CEPA (u otros tipos) del CSV canónico y los servicios curados CEP/EOEP/CER. Ver [ADR 0003](decisions/0003-exclude-uapa.md) y [Fuentes](data-sources.md).