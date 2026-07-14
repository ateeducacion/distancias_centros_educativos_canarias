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

La URL de GitHub Pages contiene una copia verificada de la última release `data-*`. Descarga primero el manifiesto y no sustituyas el archivo activo hasta haber comprobado tamaño y SHA-256:

```php
<?php

declare(strict_types=1);

$dataBaseUrl = 'https://ateeducacion.github.io/'
    . 'distancias_centros_educativos_canarias/data/latest/';
$dataPath = __DIR__ . '/var/data/canarias-distances.dat';

$manifestJson = file_get_contents($dataBaseUrl . 'manifest.json');
if ($manifestJson === false) {
    throw new RuntimeException('No se pudo descargar el manifiesto');
}

$manifest = json_decode($manifestJson, true, flags: JSON_THROW_ON_ERROR);
$artifact = $manifest['artifacts']['canarias-distances.dat'] ?? null;
if (
    !is_array($artifact)
    || !is_int($artifact['size'] ?? null)
    || !is_string($artifact['sha256'] ?? null)
) {
    throw new RuntimeException('El manifiesto no describe el archivo esperado');
}

$directory = dirname($dataPath);
if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
    throw new RuntimeException('No se pudo crear el directorio de datos');
}

$temporaryPath = tempnam($directory, 'canarias-distances-');
if ($temporaryPath === false) {
    throw new RuntimeException('No se pudo crear el archivo temporal');
}

try {
    $input = fopen($dataBaseUrl . 'canarias-distances.dat', 'rb');
    if ($input === false) {
        throw new RuntimeException('No se pudo abrir la descarga');
    }

    $output = fopen($temporaryPath, 'wb');
    if ($output === false) {
        fclose($input);
        throw new RuntimeException('No se pudo abrir el archivo temporal');
    }

    try {
        $copied = stream_copy_to_stream($input, $output);
    } finally {
        fclose($input);
        fclose($output);
    }

    $actualHash = hash_file('sha256', $temporaryPath);
    if (
        $copied !== $artifact['size']
        || $actualHash === false
        || !hash_equals($artifact['sha256'], $actualHash)
    ) {
        throw new RuntimeException('La descarga no coincide con el manifiesto');
    }

    if (!rename($temporaryPath, $dataPath)) {
        throw new RuntimeException('No se pudo activar el archivo verificado');
    }
} finally {
    if (is_file($temporaryPath)) {
        unlink($temporaryPath);
    }
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

## Versionar el artefacto

La descarga anterior verifica el tamaño y SHA-256 antes del `rename()`. Para fijar resultados en el tiempo, usa los artefactos de una release `data-*` concreta y almacénalos junto con la aplicación. La URL `data/latest/` está pensada para seguir automáticamente la release de datos más reciente.

`getRoute()` se mantiene temporalmente como alias de `getDistance()`. CEDIST02 y CEDIST03 no almacenan ni devuelven duración.
