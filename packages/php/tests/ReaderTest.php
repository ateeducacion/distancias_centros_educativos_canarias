<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix\Tests;

use AteEducacion\CanariasRouteMatrix\Exception\CrossIslandRouteException;
use AteEducacion\CanariasRouteMatrix\Reader;
use PHPUnit\Framework\TestCase;

final class ReaderTest extends TestCase
{
    /** @return array<string, string> */
    private static function fixtures(): array
    {
        return [
            'CEDIST03' => __DIR__ . '/../../../data/samples/sample.dat',
            'CEDIST02' => __DIR__ . '/../../../data/samples/sample-v2.dat',
        ];
    }

    public function testDirectedDistanceInCurrentAndLegacyFormats(): void
    {
        foreach (self::fixtures() as $format => $fixture) {
            $reader = new Reader($fixture);
            self::assertSame($format, $reader->getFormat());
            self::assertSame(
                1200,
                $reader->getDistance('10000001', '10000002')->distanceMeters
            );
            self::assertSame(
                1100,
                $reader->getDistance('10000002', '10000001')->distanceMeters
            );
        }
    }

    public function testCrossIsland(): void
    {
        $this->expectException(CrossIslandRouteException::class);
        (new Reader(self::fixtures()['CEDIST03']))
            ->getDistance('10000001', '20000004');
    }
}
