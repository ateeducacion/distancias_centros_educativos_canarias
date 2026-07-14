# Lector PHP CEDIST02/CEDIST03

Compatible con PHP 8.2 o superior y sin extensiones no estándar. Abre `canarias-distances.dat`, localiza los códigos mediante búsqueda binaria y lee únicamente dos bytes por consulta CEDIST03 o cuatro bytes si recibe un archivo CEDIST02.

```php
$reader = new AteEducacion\CanariasRouteMatrix\Reader('/data/canarias-distances.dat');
$distance = $reader->getDistance('35000011', '98030001');
echo $distance->distanceMeters;
```

La guía completa está en `docs/php.md`.
