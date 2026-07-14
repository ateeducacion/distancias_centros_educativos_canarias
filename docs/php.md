# Usar la matriz desde PHP

El lector PHP trabaja con un archivo local y usa `fseek()`/`fread()` para leer únicamente la celda solicitada. CEDIST03 requiere dos bytes por consulta; CEDIST02 usa cuatro. El lector detecta ambos formatos y no carga la matriz completa en memoria.

## Instalar el lector

Mientras el paquete no esté publicado en Packagist puede instalarse directamente desde el repositorio:

```bash
composer config repositories.canarias-route-matrix vcs \
  https://github.com/ateeducacion/distancias_centros_educativos_canarias
composer require ateeducacion/canarias-route-matrix:dev-main
```

## Descargar y conservar los datos localmente

La URL de GitHub Pages contiene siempre la generación actual de `main`:

```php
<?php

declare(strict_types=1);

$dataUrl = 'https://ateeducacion.github.io/'
    . 'distancias_centros_educativos_canarias/data/latest/'
    . 'canarias-distances.dat';
$dataPath = __DIR__ . '/var/data/canarias-distances.dat';

if (!is_file($dataPath)) {
    if (!is_dir(dirname($dataPath))) {
        mkdir(dirname($dataPath), 0755, true);
    }

    $temporaryPath = $dataPath . '.tmp';
    $input = fopen($dataUrl, 'rb');
    $output = fopen($temporaryPath, 'wb');
    if ($input === false || $output === false) {
        throw new RuntimeException('No se pudo abrir el origen o el destino');
    }

    stream_copy_to_stream($input, $output);
    fclose($input);
    fclose($output);
    rename($temporaryPath, $dataPath);
}
```

No conviene descargar el `.dat` dentro de cada petición HTTP. Actualízalo mediante una tarea programada, durante el despliegue o cuando cambie el hash publicado en `manifest.json`.

Las variantes `.dat.zst` y `.dat.seekable.zst` son de distribución. Deben descomprimirse antes de construir `Reader`.

## Consultar una distancia

```php
<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use AteEducacion\CanariasRouteMatrix\Reader;

$reader = new Reader(__DIR__ . '/var/data/canarias-distances.dat');
$distance = $reader->getDistance('35000011', '98030001');

echo number_format($distance->distanceMeters / 1000, 2, ',', '.') . ' km';
```

La llamada devuelve un `DistanceResult` con la propiedad pública de solo lectura `distanceMeters`. En CEDIST03 el valor siempre es múltiplo de 10 metros; CEDIST02 conserva sus metros originales.

## Servicio reutilizable

```php
<?php

declare(strict_types=1);

use AteEducacion\CanariasRouteMatrix\Reader;

final class CanaryDistanceService
{
    public function __construct(private readonly Reader $reader)
    {
    }

    public function meters(string $origin, string $destination): int
    {
        return $this->reader
            ->getDistance($origin, $destination)
            ->distanceMeters;
    }
}
```

En una aplicación Symfony, Laravel o similar, registra `Reader` como servicio compartido para abrir el archivo una vez por proceso.

## Verificar el artefacto

`manifest.json` publica el tamaño y SHA-256 de cada archivo. Durante el despliegue puede comprobarse así:

```php
$manifest = json_decode(
    file_get_contents('https://ateeducacion.github.io/'
        . 'distancias_centros_educativos_canarias/data/latest/manifest.json'),
    true,
    flags: JSON_THROW_ON_ERROR,
);

$expected = $manifest['artifacts']['canarias-distances.dat']['sha256'];
$actual = hash_file('sha256', $dataPath);

if (!hash_equals($expected, $actual)) {
    throw new RuntimeException('El archivo de distancias no coincide con el manifiesto');
}
```

Para fijar resultados en el tiempo, usa los artefactos de una GitHub Release y almacénalos junto con la aplicación. La URL `data/latest` está pensada para seguir automáticamente la versión de `main`.

`getRoute()` se mantiene temporalmente como alias de `getDistance()`. CEDIST02 y CEDIST03 no almacenan ni devuelven duración.
