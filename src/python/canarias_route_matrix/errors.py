"""Domain exceptions."""

class RouteMatrixError(Exception):
    """Base error."""

class InvalidFormatError(RouteMatrixError):
    """The binary artifact is structurally invalid."""

class UnknownCenterError(RouteMatrixError):
    """The requested center code is unknown."""

class CrossIslandRouteError(RouteMatrixError):
    """Cross-island routes are intentionally unavailable."""

class UnreachableRouteError(RouteMatrixError):
    """OSRM could not produce a route."""

class SourceResolutionError(RouteMatrixError):
    """A source resource could not be resolved unambiguously."""

class ValidationError(RouteMatrixError):
    """Input data failed validation."""
