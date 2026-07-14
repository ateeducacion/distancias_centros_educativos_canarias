<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix\Tests;

use AteEducacion\CanariasRouteMatrix\Exception\CrossIslandRouteException;
use AteEducacion\CanariasRouteMatrix\Reader;
use PHPUnit\Framework\TestCase;

final class ReaderTest extends TestCase
{
    /** @return list<string> */
    private static function fixtures(): array
    {
        return [
            __DIR__ . '/../../../data/samples/sample.dat',
            __DIR__ . '/../../../data/samples/sample-v2.dat',
        ];
    }

    public function testDirectedDistanceInCurrentAndLegacyFormats(): void
    {
        foreach (self::fixtures() as $fixture) {
            $reader = new Reader($fixture);
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
        (new Reader(self::fixtures()[0]))->getDistance('10000001', '20000004');
    }
}
