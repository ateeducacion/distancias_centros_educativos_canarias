<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix;

final readonly class DistanceResult
{
    public function __construct(public int $distanceMeters)
    {
    }
}
