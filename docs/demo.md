# Demo

La demo estática usa Select2 para buscar centros educativos, aeropuertos y puertos, y un Web Worker para consultar los artefactos reales y coherentes de `data/latest/`. Pages descarga estos archivos de la última release publicada y verifica sus hashes antes de construir el sitio. No usa cookies, analítica ni mapas comerciales.

Los archivos cargados por la demo se publican también como activos de la [última release](https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest). La versión del manifiesto coincide con el tag y sus hashes se verifican antes de desplegar Pages. Los aeropuertos usan códigos reservados `98IINNNN` y los puertos `99IINNNN`, donde `II` es el identificador estable de la isla.

Los puertos y aeropuertos representan sus accesos por carretera. La matriz no calcula trayectos aéreos o marítimos ni rutas entre islas diferentes.

<div id="demo-status" role="status" aria-live="polite">Cargando artefactos…</div>
<form id="route-demo" hidden>
  <label for="island">Isla</label>
  <select id="island" name="island"></select>
  <label for="origin">Origen</label>
  <select id="origin" name="origin" required></select>
  <label for="destination">Destino</label>
  <select id="destination" name="destination" required></select>
  <div class="demo-actions">
    <button type="button" id="swap-centers">Intercambiar</button>
    <button type="submit">Consultar ruta</button>
  </div>
  <output id="result" aria-live="polite"></output>
  <button type="button" id="copy-result" hidden>Copiar resultado</button>
</form>

<p id="demo-version"></p>

## Ejemplo JavaScript

```javascript
import { RouteMatrix } from "@ateeducacion/canarias-route-matrix";

const matrix = await RouteMatrix.load({
  binaryUrl: "./data/latest/canarias-education-routes.bin",
  centersUrl: "./data/latest/centers.min.json",
});

const route = matrix.getRoute("10000001", "98030001");
console.log(route.distanceMeters, route.durationSeconds);
```

## Ejemplo PHP

```php
<?php

use AteEducacion\CanariasRouteMatrix\Reader;

$reader = new Reader(
    binaryPath: '/data/canarias-education-routes.bin',
    centersPath: '/data/centers.json',
);

$route = $reader->getRoute('10000001', '98030001');
echo $route->distanceMeters . ' m';
echo $route->durationSeconds . ' s';
```
