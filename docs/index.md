<section class="distance-home">
  <header class="distance-home-header">
    <h1>Distancias entre centros de Canarias</h1>
  </header>

  <p id="demo-status" class="demo-status" role="status" aria-live="polite">
    <span class="loading-dot" aria-hidden="true"></span>
    Cargando los datos…
  </p>

  <form id="route-demo" class="distance-demo" hidden>
    <div class="distance-island-field">
      <label for="island">Isla</label>
      <select id="island" name="island" required></select>
    </div>

    <div id="location-controls" class="location-controls" hidden>
      <div class="distance-fields">
        <div class="distance-field">
          <label for="origin">Origen</label>
          <select id="origin" name="origin" required></select>
        </div>

        <button type="button" id="swap-centers" class="swap-button" aria-label="Intercambiar origen y destino">⇄ Intercambiar</button>

        <div class="distance-field">
          <label for="destination">Destino</label>
          <select id="destination" name="destination" required></select>
        </div>
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
    </div>
  </form>

  <section id="map-panel" class="distance-map-panel" aria-labelledby="map-title" hidden>
    <div class="distance-map-heading">
      <div>
        <h2 id="map-title">Ubicaciones</h2>
        <p>Haz clic en un punto para elegir origen o destino.</p>
      </div>
      <div class="map-selection-mode" role="group" aria-label="Punto que se seleccionará en el mapa">
        <button type="button" class="map-mode-button is-active" data-map-target="origin">Origen</button>
        <button type="button" class="map-mode-button" data-map-target="destination">Destino</button>
      </div>
    </div>
    <div id="locations-map" class="locations-map" aria-label="Mapa interactivo de ubicaciones de la isla seleccionada"></div>
    <p id="map-fallback" class="map-fallback" hidden>El mapa no está disponible, pero puedes usar los campos de búsqueda.</p>
  </section>

  <div class="distance-footer">
    <p class="distance-limit">La matriz contiene distancias dirigidas y solo permite consultas dentro de una misma isla. No incluye tráfico en tiempo real ni trayectos marítimos o aéreos.</p>
    <nav class="distance-links" aria-label="Documentación y descargas">
      <a href="javascript/">JavaScript</a>
      <a href="php/">PHP</a>
      <a href="architecture/">Cómo funciona</a>
      <a href="data/latest/canarias-distances.dat">Descargar datos</a>
      <a href="data/latest/manifest.json">Manifiesto</a>
    </nav>
    <p id="demo-version" class="distance-version"></p>
  </div>
</section>
