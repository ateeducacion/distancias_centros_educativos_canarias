<section class="distance-hero">
  <p class="distance-eyebrow">Datos abiertos · Consulta local · Sin claves API</p>
  <h1>Distancias por carretera en Canarias</h1>
  <p class="distance-lead">Consulta al instante la distancia entre centros educativos, aeropuertos y puertos de una misma isla. El navegador descarga una matriz estática una sola vez y resuelve cada selección sin llamar a servicios externos.</p>
  <div class="distance-hero-actions">
    <a class="md-button md-button--primary" href="#consultar-distancia">Probar la demo</a>
    <a class="md-button" href="javascript/">Usar desde JavaScript</a>
    <a class="md-button" href="php/">Usar desde PHP</a>
  </div>
</section>

<div class="distance-features">
  <article>
    <strong>Respuesta inmediata</strong>
    <span>Búsqueda binaria del código y lectura directa de un entero de 32 bits.</span>
  </article>
  <article>
    <strong>Sin coste por consulta</strong>
    <span>Después de cargar el archivo no se realizan peticiones por cada origen y destino.</span>
  </article>
  <article>
    <strong>Reproducible y auditable</strong>
    <span>Datos oficiales, OpenStreetMap, OSRM fijado por versión y artefactos con SHA-256.</span>
  </article>
  <article>
    <strong>Formato compacto</strong>
    <span>CEDIST02 almacena solo distancias dirigidas y elimina la matriz duplicada de tiempos.</span>
  </article>
</div>

## Consultar distancia {#consultar-distancia}

<p id="demo-status" role="status" aria-live="polite">Cargando la matriz de distancias…</p>
<form id="route-demo" class="distance-demo" hidden>
  <label for="island">Isla</label>
  <select id="island" name="island"></select>

  <div class="distance-demo-grid">
    <div>
      <label for="origin">Origen</label>
      <select id="origin" name="origin" required></select>
    </div>
    <div>
      <label for="destination">Destino</label>
      <select id="destination" name="destination" required></select>
    </div>
  </div>

  <div class="demo-actions">
    <button type="button" id="swap-centers">Intercambiar origen y destino</button>
    <button type="button" id="copy-result" hidden>Copiar resultado</button>
  </div>

  <output id="result" aria-live="polite">Selecciona un origen y un destino.</output>
</form>
<p id="demo-version" class="distance-version"></p>

La distancia aparece automáticamente al seleccionar ambos puntos. La consulta se hace dentro del navegador: no se envían los códigos seleccionados a Google Maps, OSRM ni a ninguna API remota.

## Integración en una aplicación

El conjunto publicado en GitHub Pages contiene:

- `canarias-distances.dat`: índice y matrices de distancias CEDIST02.
- `centers.min.json`: nombres, códigos, islas y metadatos mínimos de las ubicaciones.
- `manifest.json`: versión, fuentes, hashes, formato y recuentos.

JavaScript puede cargar directamente estos archivos desde GitHub Pages. PHP debe descargar el `.dat` y conservarlo localmente para aprovechar `fseek` y evitar transferir el archivo en cada petición.

[Ver integración JavaScript](javascript.md){ .md-button .md-button--primary }
[Ver integración PHP](php.md){ .md-button }

## Qué representa la distancia

Es la longitud en metros de la ruta para automóvil considerada más rápida por el perfil OSRM usado durante la generación, sin tráfico en tiempo real. La matriz es dirigida: la distancia de A a B puede ser diferente de la distancia de B a A. No se calculan trayectos entre islas ni recorridos marítimos o aéreos.
