# Lector PHP CEDIST02

Compatible con PHP 8.2 o superior y sin extensiones no estándar. Abre `canarias-distances.dat`, localiza los códigos mediante búsqueda binaria y lee únicamente cuatro bytes por consulta.

```php
$reader = new AteEducacion\CanariasRouteMatrix\Reader('/data/canarias-distances.dat');
$distance = $reader->getDistance('35000011', '98030001');
echo $distance->distanceMeters;
```

La guía completa está en `docs/php.md`.
