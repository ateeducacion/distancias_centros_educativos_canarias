# Usar la matriz desde PHP

El lector PHP abre un archivo CEDIST04 local y usa `fseek()`/`fread()` para leer únicamente la celda solicitada. Cada distancia ocupa dos bytes y se devuelve en metros con una resolución de 10 metros. No se carga la matriz completa en memoria ni se hacen llamadas externas durante cada consulta.

## Instalar el lector

Mientras el paquete no esté publicado en Packagist puede instalarse directamente desde el repositorio:

```bash
composer config repositories.canarias-route-matrix vcs \
  https://github.com/ateeducacion/distancias_centros_educativos_canarias
composer require ateeducacion/canarias-route-matrix:dev-main
```

## Descargar y verificar los datos

Descarga el manifiesto y valida el tamaño y SHA-256 antes de sustituir el archivo activo:

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
    $output = fopen($temporaryPath, 'wb');
    if ($input === false || $output === false) {
        throw new RuntimeException('No se pudo abrir la descarga');
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

No descargues el `.dat` dentro de cada petición HTTP. Actualízalo durante el despliegue o mediante una tarea programada.

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

La llamada devuelve un `DistanceResult` con la propiedad pública de solo lectura `distanceMeters`.

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

En Symfony, Laravel o una aplicación similar, registra `Reader` como servicio compartido para abrir el archivo una vez por proceso.
