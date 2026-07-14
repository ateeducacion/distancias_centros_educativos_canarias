# Lector JavaScript CEDIST02/CEDIST03

Paquete ESM para navegador, Web Worker y Node.js. Los códigos públicos siempre se reciben como cadenas y cada consulta devuelve únicamente `distanceMeters`.

```javascript
const matrix = await DistanceMatrix.load({
  dataUrl: "./canarias-distances.dat",
  centersUrl: "./centers.min.json",
});

console.log(matrix.formatMajor); // 2 o 3
console.log(matrix.getDistance("35000011", "98030001").distanceMeters);
```

CEDIST03 lee dos bytes por celda y devuelve metros multiplicando el `uint16` almacenado por 10. La compatibilidad de lectura con CEDIST02 se mantiene durante la transición.

La guía completa está en `docs/javascript.md`.
