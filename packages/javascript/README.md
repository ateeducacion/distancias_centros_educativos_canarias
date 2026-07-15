# Lector JavaScript CEDIST04

Paquete ESM para navegador, Web Worker y Node.js. Los códigos públicos siempre se reciben como cadenas y cada consulta devuelve únicamente `distanceMeters`.

```javascript
const matrix = await DistanceMatrix.load({
  dataUrl: "./canarias-distances.dat",
  centersUrl: "./centers.min.json",
});

console.log(matrix.getDistance("35000011", "98030001").distanceMeters);
```

Cada consulta lee una celda `uint16` y multiplica el valor almacenado por 10 para devolver metros.

La guía completa está en `docs/javascript.md`.
