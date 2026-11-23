// ==========================================================
// VERIFICADOR DE MEMBRESÍA - BACKEND (Google Apps Script)
// Uso:  GET <URL_EXEC>?cedula=12345678   ->  JSON
// La URL de la API de Legalmente solo vive aquí (nunca en el frontend).
// ==========================================================
const API_USUARIOS = "https://prod.api.legalmenteapp.com/api/app/users/document/";

// Planes que cuentan como "sin membresía" (normalizados: mayúsculas, sin acentos)
const SIN_MEMBRESIA = ["", "NINGUNA", "NINGUNO", "NONE", "NULL", "FREEMIUM", "FREE", "GRATIS", "GRATUITA"];

// Segundos que se guarda en caché una consulta (reduce llamadas a la API)
const CACHE_SEGUNDOS = 60;

function doGet(e) {
  let resultado;
  try {
    const cedula = e && e.parameter ? e.parameter.cedula : "";
    if (!cedula) throw new Error("Falta el parámetro 'cedula'.");
    resultado = verificarMembresia(cedula);
  } catch (err) {
    resultado = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Consulta la cédula en la API y determina si tiene membresía activa.
 * Freemium, vacía, "Ninguna", vencida o no registrada => tieneMembresia: false
 */
function verificarMembresia(cedulaIngresada) {
  const cedula = limpiarCedula(cedulaIngresada);
  if (!cedula) throw new Error("Ingrese una cédula válida (solo números).");

  const cache = CacheService.getScriptCache();
  const claveCache = "mem_" + cedula;
  const enCache = cache.get(claveCache);
  if (enCache) return JSON.parse(enCache);

  const resp = UrlFetchApp.fetch(API_USUARIOS + encodeURIComponent(cedula), {
    method: "get",
    muteHttpExceptions: true,
    headers: { "Accept": "application/json" }
  });
  const status = resp.getResponseCode();

  let resultado;
  if (status === 404) {
    resultado = respuestaNoRegistrado(cedula);
  } else if (status < 200 || status >= 300) {
    throw new Error("El servicio respondió con error " + status + ". Intente de nuevo.");
  } else {
    let json;
    try {
      json = JSON.parse(resp.getContentText());
    } catch (err) {
      throw new Error("El servicio devolvió una respuesta no válida.");
    }
    resultado = (json && json.document) ? clasificar(json) : respuestaNoRegistrado(cedula);
  }

  cache.put(claveCache, JSON.stringify(resultado), CACHE_SEGUNDOS);
  return resultado;
}

function clasificar(json) {
  const membresiaOriginal = (json.membership == null ? "" : String(json.membership)).trim();
  const fechaFin = normalizarFecha(json.membership_end_date);
  const hoy = Utilities.formatDate(new Date(), "America/Caracas", "yyyy-MM-dd");

  let tieneMembresia = true;
  let motivo = "Membresía activa";

  if (esSinMembresia(membresiaOriginal)) {
    tieneMembresia = false;
    motivo = esFreemium(membresiaOriginal)
      ? "Plan Freemium (se considera sin membresía)"
      : "No tiene membresía";
  } else if (fechaFin && fechaFin < hoy) {
    tieneMembresia = false;
    motivo = "Membresía vencida el " + formatearFechaVista(fechaFin);
  }

  return {
    ok: true,
    registrado: true,
    cedula: String(json.document),
    nombre: json.name || "",
    membresiaOriginal: membresiaOriginal || "Ninguna",
    membresia: tieneMembresia ? membresiaOriginal : "Ninguna",
    tieneMembresia: tieneMembresia,
    fechaFin: fechaFin ? formatearFechaVista(fechaFin) : "",
    motivo: motivo
  };
}

// ---------- Utilidades ----------

function respuestaNoRegistrado(cedula) {
  return {
    ok: true, registrado: false, cedula: cedula, nombre: "",
    membresiaOriginal: "Ninguna", membresia: "Ninguna",
    tieneMembresia: false, fechaFin: "", motivo: "Cédula no registrada en la app"
  };
}

/** Acepta "V-12.345.678", "e 1234567", etc. y deja solo los dígitos. */
function limpiarCedula(valor) {
  const soloDigitos = String(valor || "").replace(/\D/g, "");
  return (soloDigitos.length >= 5 && soloDigitos.length <= 10) ? soloDigitos : "";
}

function normalizarTexto(txt) {
  return String(txt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
}

function esFreemium(membresia) {
  return /FREE/.test(normalizarTexto(membresia));
}

function esSinMembresia(membresia) {
  const m = normalizarTexto(membresia);
  return SIN_MEMBRESIA.indexOf(m) !== -1 || esFreemium(m);
}

/** Devuelve "yyyy-MM-dd" a partir de "2026-12-01" o "2026-12-01T00:00:00Z"; "" si no es válida. */
function normalizarFecha(valor) {
  if (!valor) return "";
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[1] + "-" + m[2] + "-" + m[3]) : "";
}

function formatearFechaVista(yyyyMMdd) {
  const p = yyyyMMdd.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

// Prueba rápida desde el editor: Ejecutar > probar
function probar() {
  Logger.log(JSON.stringify(verificarMembresia("12345678"), null, 2));
}
