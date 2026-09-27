# ProbandoClaude

Repositorio de pruebas con Claude Code.

## Quinteto

Un juego de palabras en español al estilo Wordle: adivina la palabra de cinco letras en seis intentos.

**Jugar:** https://otis12x.github.io/ProbandoClaude/wordle/

- Una palabra nueva cada día (la misma para todos) y un modo **Práctica** sin límite.
- Las tildes no cuentan y la **Ñ** tiene su propia tecla.
- Funciona en el móvil y en el ordenador, con modo claro y oscuro.

### Archivos

Todo está en la carpeta [`wordle/`](wordle/):

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La estructura de la página: título, tablero, teclado y ventanas. |
| `estilos.css` | Los colores, tamaños y animaciones. |
| `juego.js` | Las reglas: comprobar cada intento, pintar colores y guardar estadísticas. |
| `palabras.js` | Las 601 palabras que pueden salir y las más de 10.000 que se aceptan como intento. |
