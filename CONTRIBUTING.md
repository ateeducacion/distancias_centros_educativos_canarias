# Contribuir

Instala las herramientas con `make bootstrap`; ejecuta `make lint`, `make test` y finalmente `make ci`. En macOS usa Homebrew; en ejemplos interactivos usa `vim`.

Un cambio incompatible de formato exige incrementar `major`, actualizar `docs/FORMAT.md` y los tres lectores. Un cambio del perfil OSRM exige fijar versión, digest y hash, regenerar todo y documentar la métrica.

Los errores de coordenadas o centros ausentes deben notificarse al organismo y mediante la plantilla correspondiente. No edites datos oficiales para ocultarlos. Todo override temporal JSON presente en `config/overrides/` se aplica durante la generación, debe declarar `center_code`, `field`, `old_value`, `new_value`, `reason`, `source`, `created_at` y `expires_at`, queda registrado en el manifiesto y se retira al corregirse la fuente.
