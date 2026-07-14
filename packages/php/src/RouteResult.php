<?php

declare(strict_types=1);

namespace AteEducacion\CanariasRouteMatrix;

/** @deprecated Use DistanceResult. */
final readonly class RouteResult
{
    public function __construct(public int $distanceMeters)
    {
    }
}
