<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use AteEducacion\CanariasRouteMatrix\Exception\CrossIslandRouteException;
use AteEducacion\CanariasRouteMatrix\Exception\UnknownCenterException;
use AteEducacion\CanariasRouteMatrix\Exception\UnreachableRouteException;
use AteEducacion\CanariasRouteMatrix\Reader;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('Access-Control-Allow-Origin: ' . (getenv('CORS_ORIGIN') ?: '*'));
$correlationId = $_SERVER['HTTP_X_CORRELATION_ID'] ?? bin2hex(random_bytes(8));
header('X-Correlation-ID: ' . $correlationId);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$dataPath = getenv('MATRIX_DATA')
    ?: dirname(__DIR__, 2) . '/data/samples/sample.dat';

try {
    $reader = new Reader($dataPath);
    if ($method === 'GET' && $path === '/v1/health') {
        $body = ['status' => 'ok'];
    } elseif ($method === 'GET' && $path === '/v1/version') {
        $body = ['format' => 'CEDIST02', 'api_version' => 'v1'];
    } elseif (
        $method === 'GET'
        && preg_match(
            '#^/v1/(?:distances|routes)/([0-9]{8})/([0-9]{8})$#D',
            $path,
            $matches
        )
    ) {
        $distance = $reader->getDistance($matches[1], $matches[2]);
        $body = [
            'origin' => ['code' => $matches[1]],
            'destination' => ['code' => $matches[2]],
            'distance_m' => $distance->distanceMeters,
        ];
    } else {
        http_response_code(404);
        $body = ['error' => ['code' => 'not_found', 'message' => 'Endpoint not found']];
    }
} catch (UnknownCenterException $exception) {
    http_response_code(404);
    $body = [
        'error' => [
            'code' => 'unknown_location',
            'message' => $exception->getMessage(),
        ],
    ];
} catch (CrossIslandRouteException | UnreachableRouteException $exception) {
    http_response_code(422);
    $body = [
        'error' => [
            'code' => 'distance_unavailable',
            'message' => $exception->getMessage(),
        ],
    ];
} catch (Throwable $exception) {
    http_response_code(503);
    $body = [
        'error' => [
            'code' => 'artifact_unavailable',
            'message' => 'Distance artifact unavailable',
        ],
    ];
    error_log(
        json_encode(
            [
                'correlation_id' => $correlationId,
                'error' => get_class($exception),
            ]
        )
    );
}

echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
