# Uso rápido

La matriz se consulta localmente. Descarga el archivo más reciente y usa el mismo par de códigos desde Bash, PowerShell o Python.

=== "Bash"

    ```sh
    curl --fail --location \
      https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat \
      --output canarias-distances.dat

    uvx --from "git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git" \
      canarias-route-matrix --json query 35000011 98030001 \
      --data canarias-distances.dat
    ```

=== "PowerShell"

    ```powershell
    Invoke-WebRequest `
      -Uri "https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat" `
      -OutFile "canarias-distances.dat"

    uvx --from "git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git" `
      canarias-route-matrix --json query 35000011 98030001 `
      --data canarias-distances.dat
    ```

=== "Python"

    Instala el lector desde el repositorio:

    ```sh
    python -m pip install "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"
    ```

    ```python
    from pathlib import Path
    from urllib.request import urlretrieve

    from canarias_route_matrix.binary import Reader


    data_path = Path("canarias-distances.dat")
    if not data_path.exists():
        urlretrieve(
            "https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat",
            data_path,
        )

    with Reader(data_path) as reader:
        result = reader.get_distance("35000011", "98030001")

    print(result.distance_meters)
    ```

La salida de la CLI incluye `distance_m` en metros. Los códigos deben mantenerse como cadenas de ocho cifras y pertenecer a la misma isla.
