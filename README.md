# Nuestros lugares 💕

Página para guardar los lugares que visitamos (con foto, fecha y zona), los planes por visitar, un mapa de calor, ruleta, retos y un contador de 100 citas.

- **Página:** `index.html` + `config.js` (se publica gratis con GitHub Pages).
- **Fotos y videos:** carpeta en Google Drive.
- **Datos:** hoja de Google Sheets.
- **Puente:** `apps-script/Code.gs` (Google Apps Script). Revisa la clave en el servidor.

## Puesta en marcha (una sola vez)

### A) Google (≈10 min)
1. Abre <https://sheets.new> y ponle de nombre **Nuestros lugares**.
2. Menú **Extensiones → Apps Script**. Borra el código de ejemplo y pega todo el contenido de `apps-script/Code.gs`.
3. En la línea `const CLAVE = '...'` escribe la clave que usarán tú y tu pareja. **No subas tu clave real a GitHub.**
4. Arriba a la derecha: **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
5. Pulsa **Implementar** y acepta los permisos (Drive y Hojas). Si sale "Google no ha verificado esta app": **Configuración avanzada → Ir a (nombre del proyecto)**. Es tu propio script.
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. Ábrela en el navegador: debe decir `"ok": true`.

### B) Publicar la página
1. En `config.js` pega la URL entre las comillas de `API_URL`.
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
3. En 1–2 minutos queda en `https://TU-USUARIO.github.io/nuestros-lugares/`.
4. Compártele ese enlace a tu pareja. Al entrar piden la clave (se recuerda en cada dispositivo).

## Cambiar la clave
Edita `CLAVE` en Apps Script → **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. (La URL no cambia.) Cada dispositivo volverá a pedir la clave.

## Si cambias `Code.gs`
Siempre hay que crear una **nueva versión** de la implementación (mismo menú), si no el cambio no se aplica.

## Límites a tener en cuenta
- Fotos: se reducen a ~1600 px antes de subir (ahorra espacio y es rápido).
- Videos: hasta **20 MB** por archivo.
- Las fotos quedan en Drive con "cualquiera con el enlace puede ver"; los enlaces solo se obtienen entrando con la clave.
- Se bloquea 10 minutos después de 10 claves incorrectas.
