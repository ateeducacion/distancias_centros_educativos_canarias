# Usar la matriz desde JavaScript

La integración web descarga dos archivos estáticos una sola vez:

- `canarias-distances.dat`, con el índice y las distancias CEDIST04.
- `centers.min.json`, con los nombres y códigos de las ubicaciones.

Después de cargarlos, `getDistance()` no realiza peticiones de red. La consulta usa una búsqueda binaria del código y una lectura directa `uint16` mediante `DataView`. El valor almacenado se multiplica por 10 para devolver `distanceMeters`.

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

## Cargar los datos una vez

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

Para despliegues reproducibles, copia los artefactos de una release `data-*` concreta a tu alojamiento estático y fija también la versión del módulo JavaScript.

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

Los códigos se manejan como cadenas de ocho cifras. No deben convertirse a números en formularios, JSON o bases de datos.

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
