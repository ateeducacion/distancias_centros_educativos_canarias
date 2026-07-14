# Usar la matriz desde JavaScript

La integración web descarga dos archivos estáticos una sola vez:

- `canarias-distances.dat`, con el índice y las distancias CEDIST02.
- `centers.min.json`, con los nombres y códigos de las ubicaciones.

Después de cargarlos, `getDistance()` no realiza ninguna petición de red. La consulta consiste en una búsqueda binaria del código y una lectura directa mediante `DataView`.

## Ejemplo completo en el navegador

```html
<script type="module">
  import { DistanceMatrix } from "https://cdn.jsdelivr.net/gh/ateeducacion/distancias_centros_educativos_canarias@main/packages/javascript/src/index.js";

  const dataBase = "https://ateeducacion.github.io/distancias_centros_educativos_canarias/data/latest/";

  const matrix = await DistanceMatrix.load({
    dataUrl: `${dataBase}canarias-distances.dat`,
    centersUrl: `${dataBase}centers.min.json`,
  });

  const result = matrix.getDistance("35000011", "98030001");
  console.log(`${(result.distanceMeters / 1000).toFixed(2)} km`);
</script>
```

La URL de GitHub Pages apunta siempre a los datos generados desde la rama `main`. Es adecuada para aplicaciones que quieran recibir las actualizaciones automáticamente.

## Cargar los datos una vez

`DistanceMatrix.load()` usa `Promise.all()` para descargar el `.dat` y el JSON en paralelo. Conviene crear una única instancia y reutilizarla:

```javascript
import { DistanceMatrix } from "./vendor/canarias-distance-matrix.js";

let matrixPromise;

export function getMatrix() {
  matrixPromise ??= DistanceMatrix.load({
    dataUrl: "/data/canarias-distances.dat",
    centersUrl: "/data/centers.min.json",
  });
  return matrixPromise;
}

export async function distanceBetween(origin, destination) {
  const matrix = await getMatrix();
  return matrix.getDistance(origin, destination).distanceMeters;
}
```

Para una aplicación de producción con requisitos de reproducibilidad, copia los artefactos de una GitHub Release a tu propio alojamiento estático y fija también la versión del módulo JavaScript. Así una nueva generación de `main` no modifica los resultados desplegados.

## Mostrar nombres y filtrar por isla

La propiedad `centers` contiene los metadatos descargados:

```javascript
const tenerife = matrix.centers.filter(
  (location) => location.island === "TENERIFE",
);

const airport = matrix.centers.find(
  (location) => location.code === "98070001",
);
```

Los códigos se manejan como cadenas de ocho cifras. No deben convertirse a números en formularios, JSON o bases de datos, aunque dentro del `.dat` se almacenen como `uint32`.

## Errores previstos

```javascript
import {
  CrossIslandRouteError,
  UnreachableRouteError,
  UnknownCenterError,
} from "./vendor/canarias-distance-matrix.js";

try {
  const result = matrix.getDistance(origin, destination);
  console.log(result.distanceMeters);
} catch (error) {
  if (error instanceof CrossIslandRouteError) {
    console.error("Las ubicaciones pertenecen a islas diferentes");
  } else if (error instanceof UnknownCenterError) {
    console.error("Código desconocido");
  } else if (error instanceof UnreachableRouteError) {
    console.error("OSRM no encontró una distancia válida");
  } else {
    throw error;
  }
}
```

`getRoute()` se mantiene temporalmente como alias de `getDistance()` para facilitar la migración desde CEDIST01, pero ya no devuelve `durationSeconds`.
