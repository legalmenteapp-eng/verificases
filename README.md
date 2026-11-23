# Verificador de Membresía

Consulta una cédula y responde si el usuario **tiene membresía** o **no tiene ninguna**.

**Regla:** se considera *sin membresía* cuando el plan es **Freemium**, está vacío o es "Ninguna", cuando la fecha de vencimiento ya pasó, o cuando la cédula no está registrada en la app.

- **Frontend:** GitHub Pages → <https://legalmenteapp-eng.github.io/verificases/>
- **Backend:** Google Apps Script (código en `backend/`)

## Estructura

```
backend/
  Code.gs           # API en Google Apps Script (consulta la API de Legalmente y aplica la regla)
  appsscript.json   # Manifiesto: zona horaria, permisos y acceso de la web app
docs/               # Frontend publicado con GitHub Pages
  index.html        # Página del verificador
  config.js         # URL del backend (/exec)
```

```
GitHub Pages (docs/) ──fetch sin cookies──▶ Apps Script /exec?cedula=…  ──▶ API Legalmente
                     ◀──────────── JSON { tieneMembresia, motivo, … } ◀──
```

La URL de la API de Legalmente solo está en el backend; el frontend solo conoce la URL `/exec`.
El frontend no usa la sesión de Google del visitante, así que funciona con una, varias o ninguna cuenta abierta.

## 1. Desplegar el backend (Apps Script)

1. Crear un proyecto en <https://script.google.com> y pegar `backend/Code.gs`.
2. (Opcional) En **Configuración del proyecto**, activar *Mostrar el archivo de manifiesto "appsscript.json"* y pegar `backend/appsscript.json`.
3. Ejecutar la función `probar` una vez para autorizar el acceso a servicios externos.
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Copiar la URL que termina en `/exec`. Si contiene `/a/macros/<dominio>/`, quitar esa parte para que quede `https://script.google.com/macros/s/<ID>/exec`.

Prueba: abrir `https://script.google.com/macros/s/<ID>/exec?cedula=12345678`. Debe responder JSON.

> Al cambiar el código: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión**. La URL se mantiene.

## 2. Configurar el frontend (GitHub Pages)

1. Editar `docs/config.js` en GitHub (ícono ✏️) y reemplazar `PEGAR_AQUI_URL_EXEC` por la URL `/exec`.
2. **Commit changes**. En 1–2 minutos GitHub Pages publica el cambio.
3. Abrir <https://legalmenteapp-eng.github.io/verificases/>.

GitHub Pages está configurado en **Settings → Pages → Branch: `main` / carpeta `/docs`**.

### (Opcional) Mostrarlo dentro de Google Sites

**Insertar → Incorporar → Por URL** → pegar `https://legalmenteapp-eng.github.io/verificases/` → **Página completa**.

## Respuesta del backend

```json
{
  "ok": true,
  "registrado": true,
  "cedula": "12345678",
  "nombre": "Ana Pérez",
  "membresiaOriginal": "Freemium",
  "membresia": "Ninguna",
  "tieneMembresia": false,
  "fechaFin": "",
  "motivo": "Plan Freemium (se considera sin membresía)"
}
```

En caso de error: `{ "ok": false, "error": "mensaje" }`.
