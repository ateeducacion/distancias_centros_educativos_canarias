# Usar la matriz desde WordPress

Esta integración usa un único snippet PHP y un archivo CEDIST04 local. No incluye detección de formatos antiguos ni lógica de migración.

## Preparar el archivo

Descarga `canarias-distances.dat` desde la última release y guárdalo en:

```text
wp-content/uploads/canarias-route-matrix/canarias-distances.dat
```

Actualiza el archivo durante el despliegue o mediante una tarea programada. No lo descargues dentro de cada petición web.

## Snippet completo

Instala el plugin [Code Snippets](https://es.wordpress.org/plugins/code-snippets/), crea un fragmento nuevo, pega el código **sin** añadir `<?php`, selecciona «Ejecutar en todas partes» y actívalo.

```php
define(
    'ATE_CANARIAS_DATA_RELATIVE_PATH',
    'canarias-route-matrix/canarias-distances.dat'
);

/**
 * Return the local CEDIST04 data path.
 *
 * @return string|WP_Error
 */
function ate_canarias_data_path() {
    $upload = wp_upload_dir();

    if ( ! empty( $upload['error'] ) ) {
        return new WP_Error( 'upload_directory_error', $upload['error'] );
    }

    return trailingslashit( $upload['basedir'] ) . ATE_CANARIAS_DATA_RELATIVE_PATH;
}

/**
 * Read an exact byte range from the matrix.
 *
 * @param resource $handle File handle.
 * @param int      $offset Byte offset.
 * @param int      $length Number of bytes.
 * @return string|WP_Error
 */
function ate_canarias_read_bytes( $handle, $offset, $length ) {
    if ( $offset < 0 || $length < 0 || 0 !== fseek( $handle, $offset ) ) {
        return new WP_Error( 'invalid_offset', 'La matriz contiene un offset no válido.' );
    }

    $value = fread( $handle, $length );
    if ( false === $value || strlen( $value ) !== $length ) {
        return new WP_Error( 'truncated_matrix', 'La matriz está truncada.' );
    }

    return $value;
}

/**
 * Decode a little-endian uint16.
 *
 * @param string $value  Binary value.
 * @param int    $offset Byte offset.
 * @return int
 */
function ate_canarias_u16( $value, $offset = 0 ) {
    return unpack( 'vvalue', substr( $value, $offset, 2 ) )['value'];
}

/**
 * Decode a little-endian uint32.
 *
 * @param string $value  Binary value.
 * @param int    $offset Byte offset.
 * @return int
 */
function ate_canarias_u32( $value, $offset = 0 ) {
    return unpack( 'Vvalue', substr( $value, $offset, 4 ) )['value'];
}

/**
 * Decode a little-endian uint64 that fits in a safe PHP integer.
 *
 * @param string $value  Binary value.
 * @param int    $offset Byte offset.
 * @return int|WP_Error
 */
function ate_canarias_u64( $value, $offset = 0 ) {
    $parts = unpack( 'Vlow/Vhigh', substr( $value, $offset, 8 ) );

    if ( $parts['high'] > 0x1FFFFF ) {
        return new WP_Error( 'offset_overflow', 'La matriz contiene un offset demasiado grande.' );
    }

    return $parts['low'] + ( $parts['high'] * 4294967296 );
}

/**
 * Find a location in the sorted global index.
 *
 * @param resource $handle       File handle.
 * @param int      $index_offset Global index offset.
 * @param int      $count        Number of locations.
 * @param array    $islands      Island directory.
 * @param string   $code         Eight-digit location code.
 * @return array|WP_Error
 */
function ate_canarias_find_location( $handle, $index_offset, $count, $islands, $code ) {
    if ( 1 !== preg_match( '/^[0-9]{8}$/D', $code ) ) {
        return new WP_Error( 'invalid_code', 'El código debe tener ocho cifras.' );
    }

    $target = (int) $code;
    $low    = 0;
    $high   = $count - 1;

    while ( $low <= $high ) {
        $middle = intdiv( $low + $high, 2 );
        $entry  = ate_canarias_read_bytes( $handle, $index_offset + ( $middle * 12 ), 12 );

        if ( is_wp_error( $entry ) ) {
            return $entry;
        }

        $value = ate_canarias_u32( $entry );
        if ( $value === $target ) {
            $island_id  = ord( $entry[4] );
            $local_index = ate_canarias_u16( $entry, 6 );

            if (
                ! isset( $islands[ $island_id ] )
                || $local_index >= $islands[ $island_id ]['count']
            ) {
                return new WP_Error( 'invalid_index', 'El índice no coincide con el directorio de islas.' );
            }

            return array(
                'island_id'  => $island_id,
                'local_index' => $local_index,
            );
        }

        if ( $value < $target ) {
            $low = $middle + 1;
        } else {
            $high = $middle - 1;
        }
    }

    return new WP_Error( 'unknown_location', 'La ubicación no existe en la matriz.' );
}

/**
 * Return a road distance in meters from the CEDIST04 matrix.
 *
 * @param string $origin      Origin code.
 * @param string $destination Destination code.
 * @return int|WP_Error
 */
function ate_canarias_distance_meters( $origin, $destination ) {
    $path = ate_canarias_data_path();
    if ( is_wp_error( $path ) ) {
        return $path;
    }
    if ( ! is_readable( $path ) ) {
        return new WP_Error( 'missing_matrix', 'No se encuentra el archivo de distancias.' );
    }

    $size = filesize( $path );
    if ( false === $size ) {
        return new WP_Error( 'invalid_matrix_size', 'No se pudo leer el tamaño de la matriz.' );
    }

    $handle = fopen( $path, 'rb' );
    if ( false === $handle ) {
        return new WP_Error( 'matrix_open_error', 'No se pudo abrir la matriz.' );
    }

    try {
        $header = ate_canarias_read_bytes( $handle, 0, 64 );
        if ( is_wp_error( $header ) ) {
            return $header;
        }

        if ( 'CEDIST04' !== substr( $header, 0, 8 ) || 4 !== ate_canarias_u16( $header, 8 ) ) {
            return new WP_Error( 'invalid_format', 'El archivo no usa el formato CEDIST04.' );
        }
        if (
            64 !== ate_canarias_u32( $header, 12 )
            || 0 !== ate_canarias_u32( $header, 16 )
            || 0 !== ate_canarias_u16( $header, 22 )
            || str_repeat( "\0", 12 ) !== substr( $header, 52, 12 )
        ) {
            return new WP_Error( 'invalid_header', 'La cabecera CEDIST04 no es válida.' );
        }

        $island_count     = ate_canarias_u16( $header, 20 );
        $location_count   = ate_canarias_u32( $header, 24 );
        $index_offset     = ate_canarias_u64( $header, 28 );
        $directory_offset = ate_canarias_u64( $header, 36 );
        $declared_size    = ate_canarias_u64( $header, 44 );

        if ( is_wp_error( $index_offset ) || is_wp_error( $directory_offset ) || is_wp_error( $declared_size ) ) {
            return new WP_Error( 'invalid_offset', 'La matriz contiene offsets no válidos.' );
        }
        if (
            $declared_size !== $size
            || 64 !== $index_offset
            || $directory_offset !== 64 + ( $location_count * 12 )
        ) {
            return new WP_Error( 'invalid_offsets', 'Los offsets CEDIST04 no son válidos.' );
        }

        $islands         = array();
        $expected_offset = $directory_offset + ( $island_count * 16 );

        for ( $index = 0; $index < $island_count; $index++ ) {
            $entry = ate_canarias_read_bytes( $handle, $directory_offset + ( $index * 16 ), 16 );
            if ( is_wp_error( $entry ) ) {
                return $entry;
            }

            $island_id      = ord( $entry[0] );
            $island_size    = ate_canarias_u32( $entry, 4 );
            $distance_offset = ate_canarias_u64( $entry, 8 );
            if ( is_wp_error( $distance_offset ) ) {
                return $distance_offset;
            }

            $matrix_end = $distance_offset + ( $island_size * $island_size * 2 );
            if (
                "\0\0\0" !== substr( $entry, 1, 3 )
                || $distance_offset !== $expected_offset
                || $matrix_end > $size
            ) {
                return new WP_Error( 'invalid_directory', 'El directorio de islas no es válido.' );
            }

            $islands[ $island_id ] = array(
                'count'           => $island_size,
                'distance_offset' => $distance_offset,
            );
            $expected_offset = $matrix_end;
        }

        if ( $expected_offset !== $size ) {
            return new WP_Error( 'unexpected_data', 'La matriz contiene datos adicionales.' );
        }

        $source = ate_canarias_find_location(
            $handle,
            $index_offset,
            $location_count,
            $islands,
            $origin
        );
        if ( is_wp_error( $source ) ) {
            return $source;
        }

        $target = ate_canarias_find_location(
            $handle,
            $index_offset,
            $location_count,
            $islands,
            $destination
        );
        if ( is_wp_error( $target ) ) {
            return $target;
        }

        if ( $source['island_id'] !== $target['island_id'] ) {
            return new WP_Error( 'cross_island', 'No se calculan distancias entre islas.' );
        }

        $island   = $islands[ $source['island_id'] ];
        $count    = $island['count'];
        $position = ( $source['local_index'] * $count ) + $target['local_index'];
        // Distribución por planos de byte: bytes bajos y luego bytes altos.
        $low = ate_canarias_read_bytes( $handle, $island['distance_offset'] + $position, 1 );
        if ( is_wp_error( $low ) ) {
            return $low;
        }
        $high = ate_canarias_read_bytes(
            $handle,
            $island['distance_offset'] + ( $count * $count ) + $position,
            1
        );
        if ( is_wp_error( $high ) ) {
            return $high;
        }

        $stored = ord( $low ) | ( ord( $high ) << 8 );
        if ( 0xFFFF === $stored ) {
            return new WP_Error( 'unreachable', 'La distancia no está disponible.' );
        }

        return $stored * 10;
    } finally {
        fclose( $handle );
    }
}

/**
 * Render a road distance shortcode.
 *
 * @param array $attributes Shortcode attributes.
 * @return string
 */
function ate_canarias_distance_shortcode( $attributes ) {
    $attributes = shortcode_atts(
        array(
            'origen'  => '',
            'destino' => '',
        ),
        $attributes,
        'distancia_canarias'
    );

    $distance = ate_canarias_distance_meters(
        (string) $attributes['origen'],
        (string) $attributes['destino']
    );

    if ( is_wp_error( $distance ) ) {
        return '<span class="distancia-canarias-error">'
            . esc_html( $distance->get_error_message() )
            . '</span>';
    }

    return sprintf(
        '<span class="distancia-canarias" data-distance-meters="%1$d">%2$s km</span>',
        $distance,
        esc_html( number_format_i18n( $distance / 1000, 2 ) )
    );
}
add_shortcode( 'distancia_canarias', 'ate_canarias_distance_shortcode' );
```

## Usar el shortcode

```text
[distancia_canarias origen="35000011" destino="98030001"]
```

La salida muestra kilómetros con dos decimales y conserva los metros en `data-distance-meters`.

También puedes llamar directamente a:

```php
$distance = ate_canarias_distance_meters( '35000011', '98030001' );
```
