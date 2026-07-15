# Demo

La calculadora interactiva es la portada del sitio y usa la copia verificada de
la última release `data-*` publicada en `data/latest/`.

[Abrir la calculadora](../){ .md-button .md-button--primary }

Al seleccionar origen y destino, el navegador consulta `canarias-distances.dat`
de forma local mediante un Web Worker. No hay botón de cálculo ni petición
remota por cada cambio.

Para reutilizar los lectores en otra aplicación, consulta las guías de
[Python](python.md), [JavaScript](javascript.md), [PHP](php.md) y
[WordPress](wordpress.md).
