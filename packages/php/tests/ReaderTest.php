<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix\Tests;

use AteEducacion\CanariasRouteMatrix\Exception\CrossIslandRouteException;
use AteEducacion\CanariasRouteMatrix\Reader;
use PHPUnit\Framework\TestCase;

final class ReaderTest extends TestCase
{
    private const FIXTURE = __DIR__ . '/../../../data/samples/sample.dat';

    public function testDirectedDistance(): void
    {
        $reader = new Reader(self::FIXTURE);
        self::assertSame(
            1200,
            $reader->getDistance('10000001', '10000002')->distanceMeters
        );
        self::assertSame(
            1100,
            $reader->getDistance('10000002', '10000001')->distanceMeters
        );
    }

    public function testCrossIsland(): void
    {
        $this->expectException(CrossIslandRouteException::class);
        (new Reader(self::FIXTURE))->getDistance('10000001', '20000004');
    }
}
