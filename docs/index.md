<section class="distance-home">
  <header class="distance-home-header">
    <p class="distance-eyebrow">Datos abiertos · Sin claves API · Consulta local</p>
    <h1>Distancias por carretera entre centros educativos de Canarias</h1>
    <p class="distance-lead">Selecciona dos centros, aeropuertos o puertos de una misma isla. La distancia se consulta directamente en tu navegador, sin Google Maps ni coste por petición.</p>
  </header>

  <div class="distance-app">
    <section class="distance-map-panel" aria-labelledby="map-title">
      <div class="distance-map-heading">
        <div>
          <h2 id="map-title">Mapa de ubicaciones</h2>
          <p>Haz clic en un punto para elegir origen o destino.</p>
        </div>
        <div class="map-selection-mode" role="group" aria-label="Punto que se seleccionará en el mapa">
          <button type="button" class="map-mode-button is-active" data-map-target="origin">Origen</button>
          <button type="button" class="map-mode-button" data-map-target="destination">Destino</button>
        </div>
      </div>
      <div id="locations-map" class="locations-map" aria-label="Mapa interactivo de centros educativos, aeropuertos y puertos"></div>
      <p id="map-fallback" class="map-fallback" hidden>El mapa no está disponible, pero puedes buscar las ubicaciones en los campos de selección.</p>
      <p class="map-attribution">Visualización local con Leaflet, sin teselas ni llamadas a servicios cartográficos.</p>
    </section>

    <section class="distance-controls-panel" aria-labelledby="calculator-title">
      <h2 id="calculator-title">Calcula una distancia</h2>
      <p id="demo-status" class="demo-status" role="status" aria-live="polite">
        <span class="loading-dot" aria-hidden="true"></span>
        Cargando la matriz de distancias…
      </p>

      <form id="route-demo" class="distance-demo" hidden>
        <div class="distance-field">
          <label for="origin">Origen</label>
          <select id="origin" name="origin" required></select>
        </div>

        <button type="button" id="swap-centers" class="swap-button" aria-label="Intercambiar origen y destino">⇅ Intercambiar</button>

        <div class="distance-field">
          <label for="destination">Destino</label>
          <select id="destination" name="destination" required></select>
        </div>

        <output id="result" class="distance-result" aria-live="polite">
          <span id="result-state">Selecciona un origen y un destino.</span>
          <span id="result-value" hidden>
            <strong id="result-kilometers"></strong>
            <span id="result-meters"></span>
            <span id="result-route"></span>
          </span>
        </output>

        <div class="distance-result-actions">
          <button type="button" id="copy-result" hidden>Copiar resultado</button>
        </div>
      </form>

      <p class="distance-limit">Distancias dirigidas: A→B puede diferir de B→A. Solo se admiten ubicaciones de una misma isla; no hay rutas marítimas ni aéreas.</p>
      <p id="demo-version" class="distance-version"></p>
    </section>
  </div>
</section>

<section class="distance-secondary">
  <div>
    <p class="distance-eyebrow">Para qué sirve</p>
    <h2>Una respuesta directa para planificación y análisis</h2>
  </div>
  <div class="distance-use-cases">
    <article>
      <strong>Transporte escolar</strong>
      <span>Compara kilómetros reales por carretera entre centros concretos.</span>
    </article>
    <article>
      <strong>Actividades y excursiones</strong>
      <span>Estima desplazamientos entre centros, puertos y aeropuertos.</span>
    </article>
    <article>
      <strong>Accesibilidad territorial</strong>
      <span>Incorpora distancias reproducibles a estudios y aplicaciones.</span>
    </article>
  </div>
</section>

<section class="distance-links">
  <div>
    <h2>Integración y datos</h2>
    <p>Los artefactos son estáticos, versionados y auditables. Puedes descargarlos, alojarlos y consultarlos sin API key.</p>
  </div>
  <div class="distance-link-actions">
    <a class="md-button md-button--primary" href="javascript/">JavaScript</a>
    <a class="md-button" href="php/">PHP</a>
    <a class="md-button" href="data/latest/canarias-distances.dat">Descargar matriz</a>
    <a class="md-button" href="data/latest/centers.min.json">Descargar ubicaciones</a>
    <a class="md-button" href="data/latest/manifest.json">Ver manifiesto</a>
  </div>
</section>

<p class="distance-method-note">Datos generados con fuentes oficiales, OpenStreetMap y OSRM usando un perfil de automóvil sin tráfico en tiempo real. La distancia corresponde a la ruta considerada más rápida durante la generación, no necesariamente a la ruta geométricamente más corta.</p>
