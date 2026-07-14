<section class="distance-home">
  <header class="distance-home-header">
    <h1>Distancias entre centros de Canarias</h1>
  </header>

  <p id="demo-status" class="demo-status" role="status" aria-live="polite">
    <span class="loading-dot" aria-hidden="true"></span>
    Cargando los datos…
  </p>

  <div class="distance-stage">
    <div class="distance-visual" aria-hidden="true">
      <svg id="route-visual" class="route-visual" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="island-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.28"></stop>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0.08"></stop>
          </linearGradient>
          <filter id="route-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>

        <g class="archipelago-silhouettes">
          <polygon class="island-shape" data-island-id="1" points="19.8,357 45.5,352.3 69.3,368.7 65.3,394.3 37.6,401.3 19.8,385"></polygon>
          <polygon class="island-shape" data-island-id="5" points="61.4,123.7 85.1,114.3 101,135.3 103,165.7 93.1,198.3 73.3,207.7 59.4,179.7 57.4,149.3"></polygon>
          <polygon class="island-shape" data-island-id="4" points="178.2,282.3 194.1,263.7 217.8,268.3 231.7,287 223.8,310.3 202,319.7 182.2,305.7"></polygon>
          <polygon class="island-shape" data-island-id="7" points="261.4,291.7 283.2,315 322.8,308 346.5,277.7 376.2,249.7 409.9,217 419.8,184.3 392.1,175 356.4,196 330.7,221.7 295,247.3"></polygon>
          <polygon class="island-shape" data-island-id="3" points="479.2,287 501,270.7 534.7,277.7 564.4,303.3 566.3,338.3 542.6,371 508.9,378 485.1,352.3"></polygon>
          <polygon class="island-shape" data-island-id="2" points="742.6,296.3 772.3,310.3 805.9,291.7 831.7,245 865.3,210 877.2,170.3 863.4,140 831.7,147 807.9,179.7 798,221.7 768.3,256.7 732.7,273"></polygon>
          <polygon class="island-shape" data-island-id="6" points="871.3,114.3 895,121.3 926.7,105 948.5,70 956.4,30.3 936.6,16.3 912.9,35 901,63 875.2,86.3"></polygon>
          <polygon class="island-shape island-shape-secondary" data-island-id="6" points="916.8,7 920.8,21 940.6,16.3 952.5,2.3 934.7,0"></polygon>
        </g>

        <line id="route-line" class="route-line" hidden></line>
        <circle id="origin-point" class="route-point route-point-origin" r="3.5" hidden></circle>
        <circle id="destination-point" class="route-point route-point-destination" r="3.5" hidden></circle>
      </svg>
    </div>

    <form id="route-demo" class="distance-demo" hidden>
      <div class="distance-island-field">
        <label for="island">Isla</label>
        <select id="island" name="island" required></select>
      </div>

      <div class="distance-fields">
        <div class="distance-field">
          <label for="origin">Origen</label>
          <select id="origin" name="origin" disabled required></select>
        </div>

        <button type="button" id="swap-centers" class="swap-button" disabled aria-label="Intercambiar origen y destino">⇄ Intercambiar</button>

        <div class="distance-field">
          <label for="destination">Destino</label>
          <select id="destination" name="destination" disabled required></select>
        </div>
      </div>

      <output id="result" class="distance-result" aria-live="polite">
        <span id="result-state">Selecciona una isla para empezar.</span>
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
  </div>

  <div class="distance-footer">
    <p class="distance-limit">Solo se calculan distancias dentro de una misma isla. La línea del fondo une los puntos seleccionados como referencia visual: no representa el trazado de la carretera.</p>
    <nav class="distance-links" aria-label="Documentación y descargas">
      <a href="architecture/">Arquitectura</a>
      <a href="python/">Python</a>
      <a href="javascript/">JavaScript</a>
      <a href="php/">PHP</a>
      <a href="wordpress/">WordPress</a>
      <a href="quick-start/">Uso rápido</a>
      <a href="data/latest/canarias-distances.dat">Descargar datos</a>
      <a href="data/latest/manifest.json">Manifiesto</a>
    </nav>
    <p id="demo-version" class="distance-version"></p>
  </div>
</section>
