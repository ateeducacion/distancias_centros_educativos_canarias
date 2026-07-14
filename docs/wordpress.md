# Usar la matriz desde WordPress

Esta integración se añade como un único **snippet PHP**, sin modificar `functions.php`. Instala el plugin [Code Snippets](https://es.wordpress.org/plugins/code-snippets/), crea un fragmento nuevo, pega el código **sin** añadir `<?php`, selecciona «Ejecutar en todas partes» y actívalo.

El snippet está pensado para no penalizar las visitas:

- guarda `canarias-distances.dat` en `uploads/canarias-route-matrix/`;
- consulta el manifiesto remoto como máximo una vez al día;
- usa ETag y Last-Modified cuando están disponibles;
- solo descarga el binario si cambia su SHA-256 o tamaño;
- descarga en streaming y verifica antes de sustituir el archivo activo;
- evita actualizaciones simultáneas mediante un bloqueo;
- consulta el `.dat` por acceso aleatorio, sin cargarlo completo en memoria.

## Snippet completo

```php
// URL estable de la última release de datos.
define(
    'ATE_CANARIAS_DATA_BASE_URL',
    'https://ateeducacion.github.io/distancias_centros_educativos_canarias/data/latest/'
);

define('ATE_CANARIAS_STATE_OPTION', 'ate_canarias_distances_state');
define('ATE_CANARIAS_LOCK_OPTION', 'ate_canarias_distances_lock');
define('ATE_CANARIAS_CRON_HOOK', 'ate_canarias_distances_daily_update');

/**
 * Devuelve las rutas donde se guarda la matriz.
 *
 * @return array|WP_Error
 */
function ate_canarias_storage_paths()
{
    $uploads = wp_upload_dir(null, true, false);
    if (!empty($uploads['error'])) {
        return new WP_Error('uploads_error', $uploads['error']);
    }

    $directory = trailingslashit($uploads['basedir']) . 'canarias-route-matrix';
    if (!is_dir($directory) && !wp_mkdir_p($directory)) {
        return new WP_Error('directory_error', 'No se pudo crear el directorio de datos.');
    }

    return array(
        'directory' => $directory,
        'data' => trailingslashit($directory) . 'canarias-distances.dat',
    );
}

/**
 * Guarda el estado sin cargarlo automáticamente en cada petición.
 */
function ate_canarias_save_state($state)
{
    if (null === get_option(ATE_CANARIAS_STATE_OPTION, null)) {
        add_option(ATE_CANARIAS_STATE_OPTION, $state, '', false);
        return;
    }

    update_option(ATE_CANARIAS_STATE_OPTION, $state);
}

/**
 * Crea un bloqueo corto para evitar dos descargas a la vez.
 */
function ate_canarias_acquire_lock()
{
    $now = time();
    if (add_option(ATE_CANARIAS_LOCK_OPTION, $now, '', false)) {
        return true;
    }

    $started_at = (int) get_option(ATE_CANARIAS_LOCK_OPTION, 0);
    if ($started_at > 0 && ($now - $started_at) < 10 * MINUTE_IN_SECONDS) {
        return false;
    }

    // Borra únicamente un bloqueo antiguo que quedó sin liberar.
    delete_option(ATE_CANARIAS_LOCK_OPTION);
    return add_option(ATE_CANARIAS_LOCK_OPTION, $now, '', false);
}

/**
 * Comprueba el manifiesto y descarga la matriz solo cuando cambia.
 *
 * @param bool $force Permite una comprobación manual sin esperar un día.
 * @return true|WP_Error
 */
function ate_canarias_update_data($force = false)
{
    $state = get_option(ATE_CANARIAS_STATE_OPTION, array());
    $now = time();

    // WP-Cron puede ejecutarse dos veces; esta marca evita repetir la petición.
    if (
        !$force
        && !empty($state['last_check'])
        && ($now - (int) $state['last_check']) < DAY_IN_SECONDS
    ) {
        return true;
    }

    if (!ate_canarias_acquire_lock()) {
        return new WP_Error('update_locked', 'Ya hay una actualización en curso.');
    }

    try {
        // Se guarda antes de llamar a la red para no insistir si el servidor falla.
        $state['last_check'] = $now;
        ate_canarias_save_state($state);

        $paths = ate_canarias_storage_paths();
        if (is_wp_error($paths)) {
            return $paths;
        }

        $headers = array();
        if (is_file($paths['data'])) {
            if (!empty($state['etag'])) {
                $headers['If-None-Match'] = $state['etag'];
            }
            if (!empty($state['last_modified'])) {
                $headers['If-Modified-Since'] = $state['last_modified'];
            }
        }

        $response = wp_safe_remote_get(
            ATE_CANARIAS_DATA_BASE_URL . 'manifest.json',
            array(
                'timeout' => 20,
                'redirection' => 3,
                'headers' => $headers,
                'limit_response_size' => 512 * KB_IN_BYTES,
            )
        );

        if (is_wp_error($response)) {
            return $response;
        }

        $status = wp_remote_retrieve_response_code($response);
        if (304 === $status) {
            return true;
        }
        if (200 !== $status) {
            return new WP_Error('manifest_http_error', 'El manifiesto no respondió correctamente.');
        }

        $manifest = json_decode(wp_remote_retrieve_body($response), true);
        $artifact = isset($manifest['artifacts']['canarias-distances.dat'])
            ? $manifest['artifacts']['canarias-distances.dat']
            : null;

        if (
            !is_array($artifact)
            || !isset($artifact['size'], $artifact['sha256'])
            || !is_int($artifact['size'])
            || $artifact['size'] < 1
            || !is_string($artifact['sha256'])
            || !preg_match('/^[a-f0-9]{64}$/D', $artifact['sha256'])
        ) {
            return new WP_Error('invalid_manifest', 'El manifiesto no contiene un artefacto válido.');
        }

        $remote_hash = $artifact['sha256'];
        $remote_size = $artifact['size'];
        $current_size = is_file($paths['data']) ? filesize($paths['data']) : false;

        $state['etag'] = (string) wp_remote_retrieve_header($response, 'etag');
        $state['last_modified'] = (string) wp_remote_retrieve_header(
            $response,
            'last-modified'
        );
        $state['data_version'] = isset($manifest['data_version'])
            ? sanitize_text_field((string) $manifest['data_version'])
            : '';

        // Si hash y tamaño coinciden, no se vuelve a descargar ni a calcular el hash local.
        if (
            is_file($paths['data'])
            && isset($state['sha256'])
            && hash_equals((string) $state['sha256'], $remote_hash)
            && $current_size === $remote_size
        ) {
            ate_canarias_save_state($state);
            return true;
        }

        $temporary_path = tempnam($paths['directory'], 'canarias-distances-');
        if (false === $temporary_path) {
            return new WP_Error('temporary_file_error', 'No se pudo crear el archivo temporal.');
        }

        try {
            // La descarga se escribe directamente en disco para no ocupar memoria PHP.
            $download = wp_safe_remote_get(
                ATE_CANARIAS_DATA_BASE_URL . 'canarias-distances.dat',
                array(
                    'timeout' => 300,
                    'redirection' => 3,
                    'stream' => true,
                    'filename' => $temporary_path,
                    'limit_response_size' => $remote_size + 1,
                )
            );

            if (is_wp_error($download)) {
                return $download;
            }
            if (200 !== wp_remote_retrieve_response_code($download)) {
                return new WP_Error('download_http_error', 'La descarga no respondió correctamente.');
            }

            $downloaded_size = filesize($temporary_path);
            $downloaded_hash = hash_file('sha256', $temporary_path);
            if (
                $downloaded_size !== $remote_size
                || false === $downloaded_hash
                || !hash_equals($remote_hash, $downloaded_hash)
            ) {
                return new WP_Error('download_validation_error', 'La descarga no coincide con el manifiesto.');
            }

            // El temporal está en el mismo directorio para que el cambio sea atómico.
            if (!rename($temporary_path, $paths['data'])) {
                return new WP_Error('rename_error', 'No se pudo activar la matriz verificada.');
            }

            $state['sha256'] = $remote_hash;
            $state['size'] = $remote_size;
            $state['updated_at'] = $now;
            ate_canarias_save_state($state);
        } finally {
            if (is_file($temporary_path)) {
                unlink($temporary_path);
            }
        }

        return true;
    } finally {
        delete_option(ATE_CANARIAS_LOCK_OPTION);
    }
}

/**
 * Programa la comprobación diaria si todavía no existe.
 */
function ate_canarias_schedule_updates()
{
    if (!wp_next_scheduled(ATE_CANARIAS_CRON_HOOK)) {
        wp_schedule_event(
            time() + MINUTE_IN_SECONDS,
            'daily',
            ATE_CANARIAS_CRON_HOOK,
            array(),
            true
        );
    }
}

/**
 * Elimina la tarea diaria antes de retirar definitivamente el snippet.
 */
function ate_canarias_unschedule_updates()
{
    wp_clear_scheduled_hook(ATE_CANARIAS_CRON_HOOK);
}

add_action('init', 'ate_canarias_schedule_updates');
add_action(ATE_CANARIAS_CRON_HOOK, 'ate_canarias_update_data');

/**
 * Lee una cantidad exacta de bytes del archivo.
 *
 * @return string|WP_Error
 */
function ate_canarias_read_exact($handle, $offset, $length)
{
    if ($offset < 0 || $length < 0 || 0 !== fseek($handle, $offset)) {
        return new WP_Error('invalid_offset', 'La posición de lectura no es válida.');
    }

    $value = fread($handle, $length);
    if (false === $value || strlen($value) !== $length) {
        return new WP_Error('truncated_file', 'El archivo está truncado.');
    }

    return $value;
}

/**
 * Convierte un entero little-endian de 64 bits.
 *
 * @return int|WP_Error
 */
function ate_canarias_uint64($value, $offset)
{
    if (PHP_INT_SIZE < 8) {
        return new WP_Error('unsupported_php', 'Se necesita PHP de 64 bits.');
    }

    $parts = unpack('Vlow/Vhigh', substr($value, $offset, 8));
    if (!is_array($parts) || $parts['high'] > 0x1FFFFF) {
        return new WP_Error('offset_overflow', 'El offset es demasiado grande.');
    }

    return $parts['low'] + $parts['high'] * 4294967296;
}

/**
 * Abre y valida la estructura necesaria para consultar la matriz.
 *
 * @return array|WP_Error
 */
function ate_canarias_open_reader()
{
    static $reader = null;
    if (null !== $reader) {
        return $reader;
    }

    $paths = ate_canarias_storage_paths();
    if (is_wp_error($paths)) {
        return $paths;
    }
    if (!is_file($paths['data'])) {
        return new WP_Error('data_missing', 'La matriz todavía no está descargada.');
    }

    $handle = fopen($paths['data'], 'rb');
    if (false === $handle) {
        return new WP_Error('data_open_error', 'No se pudo abrir la matriz.');
    }

    $header = ate_canarias_read_exact($handle, 0, 64);
    if (is_wp_error($header)) {
        fclose($handle);
        return $header;
    }

    $major = unpack('vvalue', substr($header, 8, 2));
    $header_size = unpack('Vvalue', substr($header, 12, 4));
    $flags = unpack('Vvalue', substr($header, 16, 4));
    $island_count = unpack('vvalue', substr($header, 20, 2));
    $reserved = unpack('vvalue', substr($header, 22, 2));
    $location_count = unpack('Vvalue', substr($header, 24, 4));
    $index_offset = ate_canarias_uint64($header, 28);
    $directory_offset = ate_canarias_uint64($header, 36);
    $declared_size = ate_canarias_uint64($header, 44);
    $actual_size = filesize($paths['data']);

    if (
        is_wp_error($index_offset)
        || is_wp_error($directory_offset)
        || is_wp_error($declared_size)
        || 'CEDIST02' !== substr($header, 0, 8)
        || 2 !== $major['value']
        || 64 !== $header_size['value']
        || 0 !== $flags['value']
        || 0 !== $reserved['value']
        || str_repeat("\0", 12) !== substr($header, 52, 12)
        || $actual_size !== $declared_size
        || 64 !== $index_offset
        || $directory_offset !== 64 + $location_count['value'] * 12
    ) {
        fclose($handle);
        return new WP_Error('invalid_format', 'La cabecera CEDIST02 no es válida.');
    }

    $islands = array();
    $expected_offset = $directory_offset + $island_count['value'] * 16;
    for ($position = 0; $position < $island_count['value']; $position++) {
        $entry = ate_canarias_read_exact($handle, $directory_offset + $position * 16, 16);
        if (is_wp_error($entry)) {
            fclose($handle);
            return $entry;
        }

        $island_id = ord($entry[0]);
        $count = unpack('Vvalue', substr($entry, 4, 4));
        $distance_offset = ate_canarias_uint64($entry, 8);
        if (
            is_wp_error($distance_offset)
            || "\0\0\0" !== substr($entry, 1, 3)
            || $distance_offset !== $expected_offset
        ) {
            fclose($handle);
            return new WP_Error('invalid_directory', 'El directorio de islas no es válido.');
        }

        $expected_offset = $distance_offset + $count['value'] * $count['value'] * 4;
        if ($expected_offset > $declared_size) {
            fclose($handle);
            return new WP_Error('invalid_matrix', 'La matriz queda fuera del archivo.');
        }

        $islands[$island_id] = array(
            'count' => $count['value'],
            'distance_offset' => $distance_offset,
        );
    }

    if ($expected_offset !== $declared_size) {
        fclose($handle);
        return new WP_Error('trailing_data', 'El archivo contiene datos inesperados.');
    }

    $reader = array(
        'handle' => $handle,
        'location_count' => $location_count['value'],
        'index_offset' => $index_offset,
        'islands' => $islands,
    );

    return $reader;
}

/**
 * Busca un código mediante búsqueda binaria.
 *
 * @return array|WP_Error
 */
function ate_canarias_find_location($reader, $code)
{
    if (!is_string($code) || !preg_match('/^[0-9]{8}$/D', $code)) {
        return new WP_Error('invalid_code', 'El código debe tener ocho cifras.');
    }

    $target = (int) $code;
    $low = 0;
    $high = $reader['location_count'] - 1;

    while ($low <= $high) {
        $middle = intdiv($low + $high, 2);
        $entry = ate_canarias_read_exact(
            $reader['handle'],
            $reader['index_offset'] + $middle * 12,
            12
        );
        if (is_wp_error($entry)) {
            return $entry;
        }

        $entry_code = unpack('Vvalue', substr($entry, 0, 4));
        if ($entry_code['value'] === $target) {
            $local_index = unpack('vvalue', substr($entry, 6, 2));
            return array(
                'island_id' => ord($entry[4]),
                'local_index' => $local_index['value'],
            );
        }

        if ($entry_code['value'] < $target) {
            $low = $middle + 1;
        } else {
            $high = $middle - 1;
        }
    }

    return new WP_Error('unknown_location', 'El código no existe en la matriz.');
}

/**
 * Devuelve la distancia en metros sin cargar la matriz en memoria.
 *
 * @return int|WP_Error
 */
function ate_canarias_distance_meters($origin, $destination)
{
    $reader = ate_canarias_open_reader();
    if (is_wp_error($reader)) {
        return $reader;
    }

    $source = ate_canarias_find_location($reader, $origin);
    $target = ate_canarias_find_location($reader, $destination);
    if (is_wp_error($source)) {
        return $source;
    }
    if (is_wp_error($target)) {
        return $target;
    }
    if ($source['island_id'] !== $target['island_id']) {
        return new WP_Error('cross_island', 'Los códigos pertenecen a islas diferentes.');
    }

    $island = isset($reader['islands'][$source['island_id']])
        ? $reader['islands'][$source['island_id']]
        : null;
    if (
        !is_array($island)
        || $source['local_index'] >= $island['count']
        || $target['local_index'] >= $island['count']
    ) {
        return new WP_Error('invalid_index', 'El índice de la matriz no es válido.');
    }

    $matrix_position = $source['local_index'] * $island['count']
        + $target['local_index'];
    $value = ate_canarias_read_exact(
        $reader['handle'],
        $island['distance_offset'] + $matrix_position * 4,
        4
    );
    if (is_wp_error($value)) {
        return $value;
    }

    $distance = unpack('Vvalue', $value);
    if (0xFFFFFFFF === $distance['value']) {
        return new WP_Error('unreachable', 'La distancia no está disponible.');
    }

    return $distance['value'];
}

/**
 * Shortcode: [distancia_canarias origen="35000011" destino="98030001"]
 */
function ate_canarias_distance_shortcode($attributes)
{
    $attributes = shortcode_atts(
        array(
            'origen' => '',
            'destino' => '',
        ),
        $attributes,
        'distancia_canarias'
    );

    $origin = sanitize_text_field($attributes['origen']);
    $destination = sanitize_text_field($attributes['destino']);
    $distance = ate_canarias_distance_meters($origin, $destination);

    if (is_wp_error($distance)) {
        return '<span class="distancia-canarias distancia-canarias--error">'
            . esc_html($distance->get_error_message())
            . '</span>';
    }

    $kilometers = number_format_i18n($distance / 1000, 2);
    return '<span class="distancia-canarias" data-distance-meters="'
        . esc_attr((string) $distance)
        . '">'
        . esc_html($kilometers . ' km')
        . '</span>';
}

add_shortcode('distancia_canarias', 'ate_canarias_distance_shortcode');
```

## Usar el shortcode

Cuando WP-Cron haya realizado la primera descarga, inserta este shortcode en una entrada, página o bloque compatible:

```text
[distancia_canarias origen="35000011" destino="98030001"]
```

La salida muestra kilómetros con dos decimales y conserva los metros exactos en el atributo `data-distance-meters`. Los dos códigos deben tener ocho cifras y pertenecer a la misma isla.

## Funciones disponibles

El mismo snippet expone estas funciones para plantillas u otros snippets:

```php
// Devuelve int en metros o WP_Error.
$distance = ate_canarias_distance_meters('35000011', '98030001');

// Fuerza una comprobación manual; normalmente no hace falta llamarla.
$updated = ate_canarias_update_data(true);

// Elimina la tarea programada antes de borrar definitivamente el snippet.
ate_canarias_unschedule_updates();
```

`ate_canarias_update_data()` sin argumentos respeta siempre el intervalo diario. El parámetro `true` está pensado únicamente para una comprobación administrativa puntual.

WP-Cron se ejecuta cuando el sitio recibe una visita después de la hora programada. En sitios sin tráfico o con `DISABLE_WP_CRON`, configura el cron del sistema para invocar `wp-cron.php`; el control mediante `last_check` seguirá evitando más de una consulta remota al día.

## Qué se guarda

- El binario queda en `wp-content/uploads/canarias-route-matrix/canarias-distances.dat` o en el directorio de subidas configurado por el sitio.
- La opción `ate_canarias_distances_state` guarda únicamente metadatos pequeños: última comprobación, SHA-256, tamaño, versión de datos, ETag y Last-Modified.
- La matriz no se guarda en la base de datos ni se carga completa en memoria.
- Si una descarga o su verificación falla, el archivo anterior permanece activo.

## Referencias de WordPress

- [Programar eventos con `wp_schedule_event()`](https://developer.wordpress.org/reference/functions/wp_schedule_event/)
- [Realizar descargas seguras con `wp_safe_remote_get()`](https://developer.wordpress.org/reference/functions/wp_safe_remote_get/)
- [Obtener el directorio de subidas con `wp_upload_dir()`](https://developer.wordpress.org/reference/functions/wp_upload_dir/)
- [Registrar shortcodes con `add_shortcode()`](https://developer.wordpress.org/reference/functions/add_shortcode/)
