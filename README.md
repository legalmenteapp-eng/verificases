# Verificador de Membresía

Consulta una cédula y responde si el usuario **tiene membresía** o **no tiene ninguna**.

**Regla:** se considera *sin membresía* cuando el plan es **Freemium**, está vacío o es "Ninguna", cuando la fecha de vencimiento ya pasó, o cuando la cédula no está registrada en la app.

## Estructura

```
backend/
  Code.gs           # API en Google Apps Script (consulta la API de Legalmente y aplica la regla)
  appsscript.json   # Manifiesto: zona horaria, permisos y acceso de la web app
frontend/
  sites-embed.html  # Página que se incrusta en Google Sites ("Insertar código")
```

```
Sites (sites-embed.html) ──fetch sin cookies──▶ Apps Script /exec?cedula=…  ──▶ API Legalmente
                         ◀──────────── JSON { tieneMembresia, motivo, … } ◀──
```

La URL de la API de Legalmente solo está en el backend; el frontend solo conoce la URL `/exec`.

## 1. Desplegar el backend

1. Crear un proyecto en <https://script.google.com>.
2. Pegar `backend/Code.gs`.
3. (Opcional) En **Configuración del proyecto**, activar *Mostrar el archivo de manifiesto "appsscript.json"* y pegar `backend/appsscript.json`.
4. Ejecutar la función `probar` una vez para autorizar el acceso a servicios externos.
5. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
6. Copiar la URL que termina en `/exec`. Si contiene `/a/macros/<dominio>/`, quitar esa parte para que quede `https://script.google.com/macros/s/<ID>/exec`.

Prueba: abrir `https://script.google.com/macros/s/<ID>/exec?cedula=12345678`. Debe responder JSON.

> Al cambiar el código: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión**. La URL se mantiene.

## 2. Publicar el frontend en Google Sites

1. En `frontend/sites-embed.html`, reemplazar `PEGAR_AQUI_URL_EXEC` por la URL `/exec`.
2. En Sites: **Insertar → Incorporar → Insertar código**, pegar todo el archivo, **Siguiente → Insertar**.
3. Ajustar el tamaño del recuadro y **Publicar**.

No depende de la sesión de Google del visitante: funciona con una, varias o ninguna cuenta abierta.

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
