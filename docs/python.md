# Usar la matriz desde Python

El lector abre un archivo CEDIST03 local y lee únicamente las entradas necesarias para cada consulta. Requiere Python 3.11 o posterior y no llama a OSRM ni a otros servicios durante la lectura.

## Instalar el lector

Mientras el paquete no esté publicado en un índice, puede instalarse directamente desde el repositorio:

```sh
python -m pip install "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"
```

Para un despliegue reproducible, fija un tag o commit concreto.

## Consultar una distancia

```python
from pathlib import Path

from canarias_route_matrix.binary import Reader


data_path = Path("canarias-distances.dat")

with Reader(data_path) as reader:
    distance = reader.get_distance("35000011", "98030001")

print(distance.distance_meters)
```

`get_distance()` recibe códigos como cadenas de ocho cifras y devuelve un objeto `Distance`. `distance_meters` contiene un entero en metros con una resolución de 10 metros.

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
    print("El archivo CEDIST03 no es válido")
else:
    print(distance.distance_meters)
```

## Elegir la versión de los datos

`releases/latest/download/canarias-distances.dat` sigue la release marcada como más reciente. Para resultados inmutables, descarga `canarias-distances.dat` y `manifest.json` desde una release `data-*` concreta, verifica tamaño y SHA-256 y conserva ambos junto con la aplicación.
