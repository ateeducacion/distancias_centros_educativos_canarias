<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix;

use AteEducacion\CanariasRouteMatrix\Exception\CrossIslandRouteException;
use AteEducacion\CanariasRouteMatrix\Exception\InvalidFormatException;
use AteEducacion\CanariasRouteMatrix\Exception\UnknownCenterException;
use AteEducacion\CanariasRouteMatrix\Exception\UnreachableRouteException;

final class Reader
{
    private const INDEX_SIZE = 12;
    private const DIRECTORY_SIZE = 16;

    /** @var resource */
    private $handle;
    private int $size;
    private int $count;
    private int $indexOffset;
    private int $distanceSize;
    private int $distanceUnitMeters;
    private int $unreachable;
    private string $format;

    /** @var array<int, array{count: int, distance_offset: int}> */
    private array $islands = [];

    public function __construct(
        string $dataPath,
        ?string $centersPath = null,
        bool $preloadIndex = false,
        bool $preloadFile = false
    ) {
        unset($centersPath, $preloadIndex, $preloadFile);
        $this->size = filesize($dataPath) ?: 0;
        $handle = fopen($dataPath, 'rb');
        if ($handle === false) {
            throw new InvalidFormatException('Cannot open distance data');
        }
        $this->handle = $handle;

        $header = $this->read(0, 64);
        $magic = substr($header, 0, 8);
        $major = $this->u16($header, 8);
        if ($magic === 'CEDIST02' && $major === 2) {
            $this->format = 'CEDIST02';
            $this->distanceSize = 4;
            $this->distanceUnitMeters = 1;
            $this->unreachable = 0xFFFFFFFF;
        } elseif ($magic === 'CEDIST03' && $major === 3) {
            $this->format = 'CEDIST03';
            $this->distanceSize = 2;
            $this->distanceUnitMeters = 10;
            $this->unreachable = 0xFFFF;
        } else {
            throw new InvalidFormatException('Unknown or inconsistent format version');
        }
        if (
            $this->u32($header, 12) !== 64
            || $this->u32($header, 16) !== 0
            || $this->u16($header, 22) !== 0
            || substr($header, 52, 12) !== str_repeat("\0", 12)
        ) {
            throw new InvalidFormatException('Invalid header');
        }

        $islandCount = $this->u16($header, 20);
        $this->count = $this->u32($header, 24);
        $this->indexOffset = $this->u64($header, 28);
        $directoryOffset = $this->u64($header, 36);
        $declaredSize = $this->u64($header, 44);
        if (
            $declaredSize !== $this->size
            || $this->indexOffset !== 64
            || $directoryOffset !== 64 + $this->count * self::INDEX_SIZE
        ) {
            throw new InvalidFormatException('Invalid offsets');
        }

        $expectedOffset = $directoryOffset + $islandCount * self::DIRECTORY_SIZE;
        for ($index = 0; $index < $islandCount; $index++) {
            $entry = $this->read(
                $directoryOffset + $index * self::DIRECTORY_SIZE,
                self::DIRECTORY_SIZE
            );
            $islandId = ord($entry[0]);
            $locationCount = $this->u32($entry, 4);
            $distanceOffset = $this->u64($entry, 8);
            $matrixEnd = $distanceOffset
                + $locationCount * $locationCount * $this->distanceSize;
            if (
                substr($entry, 1, 3) !== "\0\0\0"
                || $distanceOffset !== $expectedOffset
                || $matrixEnd > $this->size
            ) {
                throw new InvalidFormatException('Invalid island directory');
            }
            $this->islands[$islandId] = [
                'count' => $locationCount,
                'distance_offset' => $distanceOffset,
            ];
            $expectedOffset = $matrixEnd;
        }
        if ($expectedOffset !== $this->size) {
            throw new InvalidFormatException('Unexpected trailing data');
        }
    }

    private function read(int $offset, int $length): string
    {
        if (
            $offset < 0
            || $length < 0
            || $offset > $this->size - $length
            || fseek($this->handle, $offset) !== 0
        ) {
            throw new InvalidFormatException('Out-of-range read');
        }
        $value = fread($this->handle, $length);
        if ($value === false || strlen($value) !== $length) {
            throw new InvalidFormatException('Truncated file');
        }
        return $value;
    }

    private function u16(string $value, int $offset): int
    {
        return unpack('v', substr($value, $offset, 2))[1];
    }

    private function u32(string $value, int $offset): int
    {
        return unpack('V', substr($value, $offset, 4))[1];
    }

    private function u64(string $value, int $offset): int
    {
        $parts = unpack('Vlow/Vhigh', substr($value, $offset, 8));
        if ($parts['high'] > 0x1FFFFF) {
            throw new InvalidFormatException('Offset overflow');
        }
        return $parts['low'] + $parts['high'] * 4294967296;
    }

    /** @return array{island_id: int, local_index: int} */
    private function find(string $code): array
    {
        if (!preg_match('/^[0-9]{8}$/D', $code)) {
            throw new UnknownCenterException('Invalid location code');
        }
        $target = (int) $code;
        $low = 0;
        $high = $this->count - 1;
        while ($low <= $high) {
            $middle = intdiv($low + $high, 2);
            $entry = $this->read(
                $this->indexOffset + $middle * self::INDEX_SIZE,
                self::INDEX_SIZE
            );
            $value = $this->u32($entry, 0);
            if ($value === $target) {
                $islandId = ord($entry[4]);
                $localIndex = $this->u16($entry, 6);
                if (
                    !isset($this->islands[$islandId])
                    || $localIndex >= $this->islands[$islandId]['count']
                ) {
                    throw new InvalidFormatException('Index/island mismatch');
                }
                return [
                    'island_id' => $islandId,
                    'local_index' => $localIndex,
                ];
            }
            if ($value < $target) {
                $low = $middle + 1;
            } else {
                $high = $middle - 1;
            }
        }
        throw new UnknownCenterException("Unknown location: {$code}");
    }

    public function getFormat(): string
    {
        return $this->format;
    }

    public function getDistance(string $origin, string $destination): DistanceResult
    {
        $source = $this->find($origin);
        $target = $this->find($destination);
        if ($source['island_id'] !== $target['island_id']) {
            throw new CrossIslandRouteException(
                'Distances between islands are not computed'
            );
        }
        $island = $this->islands[$source['island_id']];
        $position = $source['local_index'] * $island['count'] + $target['local_index'];
        $raw = $this->read(
            $island['distance_offset'] + $position * $this->distanceSize,
            $this->distanceSize
        );
        $stored = $this->distanceSize === 2
            ? $this->u16($raw, 0)
            : $this->u32($raw, 0);
        if ($stored === $this->unreachable) {
            throw new UnreachableRouteException('Distance is unavailable');
        }
        return new DistanceResult($stored * $this->distanceUnitMeters);
    }

    public function getRoute(string $origin, string $destination): DistanceResult
    {
        return $this->getDistance($origin, $destination);
    }
}
