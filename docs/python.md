# Usar la matriz desde Python

El lector Python abre un archivo CEDIST02 o CEDIST03 local y lee únicamente las entradas necesarias para cada consulta. Requiere Python 3.11 o posterior y no llama a OSRM ni a otros servicios durante la lectura.

## Instalar el lector

Mientras el paquete no esté publicado en un índice, puede instalarse directamente desde el repositorio:

```sh
python -m pip install "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"
```

Para un despliegue reproducible, sustituye la referencia implícita a `main` por un tag o commit concreto.

## Consultar una distancia

```python
from pathlib import Path

from canarias_route_matrix.binary import Reader


data_path = Path("canarias-distances.dat")

with Reader(data_path) as reader:
    distance = reader.get_distance("35000011", "98030001")

print(distance.distance_meters)
```

El contexto `with` cierra el archivo incluso si la consulta falla. `get_distance()` recibe códigos como cadenas de ocho cifras y devuelve un objeto `Distance` cuya propiedad `distance_meters` contiene un número entero de metros.

El lector expone el formato detectado mediante `reader.format.major`. CEDIST03 devuelve múltiplos de 10 metros; CEDIST02 conserva los metros almacenados originalmente.

## Errores previstos

```python
from canarias_route_matrix.errors import (
    CrossIslandRouteError,
    InvalidFormatError,
    UnknownCenterError,
    UnreachableRouteError,
)


try:
    with Reader(data_path) as reader:
        distance = reader.get_distance(origin, destination)
except UnknownCenterError:
    print("Código desconocido o inválido")
except CrossIslandRouteError:
    print("Las ubicaciones pertenecen a islas diferentes")
except UnreachableRouteError:
    print("No hay una distancia disponible")
except InvalidFormatError:
    print("El archivo CEDIST02/CEDIST03 no es válido")
else:
    print(distance.distance_meters)
```

`get_route()` se mantiene temporalmente como alias de `get_distance()` para facilitar la migración desde CEDIST01, pero ya no devuelve duración.

## Elegir la versión de los datos

`releases/latest/download/canarias-distances.dat` sigue la release marcada como más reciente. Si los resultados deben permanecer inmutables, descarga `canarias-distances.dat` y `manifest.json` desde una release `data-*` concreta, verifica el tamaño y SHA-256, y conserva ambos junto con la aplicación.

Para ejecutar una consulta desde terminal y obtener JSON, consulta la guía de la [CLI](cli.md). El ejemplo completo de descarga está en [Uso rápido](quick-start.md).
