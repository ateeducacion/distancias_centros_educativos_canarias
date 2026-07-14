# Overrides auditables

El generador aplica todos los archivos JSON presentes en este directorio, en orden por nombre. Cada override debe declarar `center_code`, `field`, `old_value`, `new_value`, `reason`, `source`, `created_at` y `expires_at`, y queda registrado en el manifiesto. Nunca se usa para ocultar un problema de la fuente y debe retirarse cuando se corrija el dato oficial.
