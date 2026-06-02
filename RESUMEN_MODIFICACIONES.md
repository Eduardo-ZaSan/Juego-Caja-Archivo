# Resumen rapido para modificar el juego

## Estado del proyecto
- No usa frameworks ni bundlers.
- Se sirve con Node nativo desde `server.js`.
- El juego corre en navegador con `index.html` + `dist/main.js`.
- Fuente principal editable: `main.ts`.

## Dependencias instaladas
- Se agrego `typescript` como dependencia de desarrollo.
- Se creo `package.json` y `package-lock.json` para manejar scripts.

## Scripts disponibles
- `npm start`: inicia el servidor en `http://localhost:3000`.
- `npm run build`: compila `main.ts` a `dist/main.js`.
- `npm run build:watch`: recompila automaticamente al guardar cambios.

## Mapa para cambios frecuentes

### 1) Dificultad y duracion
Archivo: `main.ts`
- `gameSpeed`: multiplicador de velocidad global.
- `roundDurationSec`: duracion de la partida en segundos.
- `startGame()`: actualmente fuerza `gameSpeed = 2` al iniciar.

Impacto:
- Si subes `gameSpeed`, todo se mueve mas rapido.
- Si subes `roundDurationSec`, la partida dura mas.

### 2) Jugador (movimiento y sensacion)
Archivo: `main.ts`
- `class Player`
- Calculo de velocidad inicial del jugador dentro del constructor.
- Animacion de desplazamiento en `updateFrameAnimation` y `draw`.

Impacto:
- Puedes hacer el control mas arcade cambiando velocidad base o aceleracion visual.

### 3) Objetos que caen y puntaje
Archivo: `main.ts`
- Pools de imagenes en `positiveObjectImages` y `negativeObjectImages`.
- Logica de guardado en ranking local: `savePendingArcadeScore()`.
- Render de tabla: `renderArcadeScores()`.

Impacto:
- Puedes cambiar que objetos dan o quitan puntos, y como se muestra el ranking.

### 4) UI y textos
Archivo: `index.html`
- Marcadores: `#timer`, `#score`, `#high-score`, `#final-score`.
- Panel final: `#game-over-screen`.
- Botones: `#save-score-button`, `#restart-button`.

Archivo: `styles.css`
- Layout general: `body`, `canvas`, `#score-board`.
- Pantalla final: `#game-over-screen`.
- Tabla del arcade: `#arcade-table`.

### 5) API de ranking y persistencia en archivo
Archivo: `server.js`
- Puerto: `const port = 3000`.
- Archivo de datos: `data/arcadeScores.json`.
- Endpoint: `/api/arcade-scores` para GET y POST.

Impacto:
- Puedes cambiar el puerto o agregar validaciones del payload antes de guardar.

## Flujo recomendado para modificar sin romper
1. Edita `main.ts`, `index.html` o `styles.css`.
2. Ejecuta `npm run build`.
3. Ejecuta `npm start`.
4. Prueba en navegador y repite.

## Mejoras rapidas sugeridas
- Agregar validacion de tamano maximo al payload de `/api/arcade-scores`.
- Unificar puntajes: ahora hay logica de `localStorage` en cliente y archivo JSON en servidor.
- Agregar script `npm run dev` que lance build watch + server en paralelo.
