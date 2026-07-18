# Documentación

Matriz estática de distancias por carretera entre centros educativos,
aeropuertos y puertos de Canarias. Los datos se publican como un artefacto
binario compacto (**CEDIST04**) que puedes consultar desde el navegador,
Python, JavaScript o PHP sin depender de servicios externos.

<p>
  <a class="md-button md-button--primary" href="../">Abrir la calculadora</a>
  <a class="md-button" href="https://ateeducacion.github.io/distancias_centros_educativos_canarias/data/latest/canarias-distances.dat">Descargar datos</a>
</p>

<a id="video"></a>

## Cómo funciona · Vídeo

Una explicación de poco más de dos minutos sobre por qué esta matriz
precalculada resulta más rápida, barata y reproducible que consultar un
servicio externo en cada comparación.

<video controls preload="metadata" playsinline style="width:100%;max-width:720px;border-radius:8px">
  <source src="assets/matriz-distancias-canarias.mp4" type="video/mp4" />
  <track kind="subtitles" src="assets/matriz-distancias-canarias.vtt" srclang="es" label="Español" default />
  Tu navegador no puede reproducir el vídeo.
  <a href="assets/matriz-distancias-canarias.mp4">Descarga el archivo MP4</a>.
</video>

**Descargas:**
[vídeo (MP4)](assets/matriz-distancias-canarias.mp4) ·
[subtítulos (SRT)](assets/matriz-distancias-canarias.srt) ·
[subtítulos (VTT)](assets/matriz-distancias-canarias.vtt) ·
[narración (SSML)](assets/narracion-distancias-canarias.ssml)

## Por dónde empezar

- [Uso rápido](quick-start.md) — calcula tu primera distancia en unos minutos.
- [Arquitectura](architecture.md) — cómo se generan y publican los datos.
- [Formato CEDIST04](binary-format.md) — estructura del artefacto binario.
- [Fuentes de datos](data-sources.md) (incluye CEP/EOEP/CER y la exclusión de UAPA) y [calidad](data-quality.md).
- [ADR 0003: no incorporar UAPA](decisions/0003-exclude-uapa.md).

## Lectores por lenguaje

- [Python](python.md)
- [JavaScript](javascript.md)
- [PHP](php.md)
- [WordPress](wordpress.md)

## Datos publicados

- [Versión publicada](generated/current-version.md)
- [Cobertura publicada](generated/coverage.md)
- [Manifiesto](https://ateeducacion.github.io/distancias_centros_educativos_canarias/data/latest/manifest.json)

La calculadora interactiva vive en la [portada del sitio](../) y usa la copia
verificada de la última release `data-*`.
