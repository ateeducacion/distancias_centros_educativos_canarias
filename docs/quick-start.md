# Uso rápido

La matriz se consulta localmente. Puedes probarla sin instalar nada en la web o descargar el archivo más reciente para consultarlo desde Python, Bash o PowerShell.

Los artefactos actuales usan CEDIST03 y devuelven distancias con una resolución de 10 metros. Los readers mantienen compatibilidad con archivos CEDIST02.

=== "Web (sin instalar)"

    La [demo de la portada](index.md) funciona directamente en el navegador. Selecciona una isla, un origen y un destino; no necesita claves ni envía la consulta a una API.

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

=== "Bash"

    ```sh
    curl --fail --location \
      https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat \
      --output canarias-distances.dat

    python3 -m venv .venv
    .venv/bin/python -m pip install \
      "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"

    .venv/bin/canarias-route-matrix --json query 35000011 98030001 \
      --data canarias-distances.dat
    ```

=== "PowerShell"

    ```powershell
    Invoke-WebRequest `
      -Uri "https://github.com/ateeducacion/distancias_centros_educativos_canarias/releases/latest/download/canarias-distances.dat" `
      -OutFile "canarias-distances.dat"

    py -m venv .venv
    .venv\Scripts\python.exe -m pip install `
      "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"

    .venv\Scripts\canarias-route-matrix.exe --json query 35000011 98030001 `
      --data canarias-distances.dat
    ```

Con `--json`, la CLI devuelve la distancia en metros en el campo `distance_m`. Los códigos tienen ocho cifras y ambos deben pertenecer a la misma isla.
