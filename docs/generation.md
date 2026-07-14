# Generación

OSRM usa MLD: `osrm-extract`, `osrm-partition`, `osrm-customize` y `osrm-routed --algorithm mld`. Se consulta `nearest` antes de `table`; los bloques, reintentos, timeout y concurrencia son configurables.

Distancia y duración correspondientes a la ruta para automóvil considerada más rápida por el perfil OSRM utilizado, sin tráfico en tiempo real. Los valores se redondean al entero más próximo, con mitades hacia arriba.
