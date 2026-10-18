/**
 * Nuestros lugares — servidor en Google Apps Script
 *
 * Qué hace: guarda los datos en la hoja de cálculo donde está pegado este código
 * y guarda las fotos/videos en una carpeta de tu Google Drive.
 * Todas las acciones piden la CLAVE (la misma que escribes al entrar a la página).
 */

// ⬇️ CAMBIA ESTO por la clave que quieras (y no la subas a GitHub)
const CLAVE = 'cambia-esta-clave';

const HOJA = 'Lugares';
const CARPETA = 'Nuestros lugares (fotos)';
const COLS = ['id', 'name', 'zone', 'date', 'status', 'fav', 'tipo', 'dist', 'src', 'fileId', 'mime', 'created'];
const EDITABLES = ['name', 'zone', 'date', 'status', 'fav', 'tipo', 'dist', 'src'];
const MAX_BYTES = 30 * 1024 * 1024;

function doGet() {
  return salida_({ ok: true, mensaje: 'Nuestros lugares: el servidor funciona' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var tiene = false;
  try {
    var req = JSON.parse(e.postData.contents);
    if (!claveOk_(req.clave)) return salida_({ ok: false, error: 'clave' });
    lock.waitLock(25000);
    tiene = true;
    switch (req.action) {
      case 'ping':
        return salida_({ ok: true });
      case 'list':
        return salida_({ ok: true, rows: leerTodo_() });
      case 'create':
        return salida_({ ok: true, row: crear_(req.rec || {}, req.file) });
      case 'update':
        return salida_({ ok: true, row: actualizar_(req.id, req.patch || {}, req.file) });
      case 'delete':
        borrar_(req.id);
        return salida_({ ok: true });
      default:
        return salida_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return salida_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    if (tiene) lock.releaseLock();
  }
}

function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- clave (con bloqueo si adivinan muchas veces) ----------
function claveOk_(c) {
  if (CLAVE === 'cambia-esta-clave') throw new Error('Falta poner tu clave en Code.gs');
  var cache = CacheService.getScriptCache();
  var fallos = Number(cache.get('fallos') || 0);
  if (fallos >= 10) throw new Error('Demasiados intentos. Espera 10 minutos.');
  if (typeof c === 'string' && c === CLAVE) {
    if (fallos) cache.remove('fallos');
    return true;
  }
  cache.put('fallos', String(fallos + 1), 600);
  Utilities.sleep(500);
  return false;
}

// ---------- hoja de cálculo ----------
function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);
    sh.setFrozenRows(1);
    sh.getRange(1, 4, sh.getMaxRows(), 1).setNumberFormat('@'); // columna "date" como texto
  }
  return sh;
}

function fecha_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}

function aObjeto_(v) {
  var o = {};
  COLS.forEach(function (c, i) { o[c] = v[i]; });
  o.date = fecha_(o.date);
  o.fav = o.fav === true || String(o.fav).toLowerCase() === 'true';
  o.created = o.created instanceof Date ? o.created.toISOString() : String(o.created || '');
  ['id', 'name', 'zone', 'status', 'tipo', 'dist', 'src', 'fileId', 'mime'].forEach(function (c) {
    o[c] = o[c] == null ? '' : String(o[c]);
  });
  return o;
}

function leerTodo_() {
  var sh = hoja_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, COLS.length).getValues().map(aObjeto_);
}

function buscarFila_(id) {
  var sh = hoja_();
  var n = sh.getLastRow();
  if (n >= 2) {
    var ids = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  }
  throw new Error('No existe ese lugar');
}

function escribirFila_(fila, valores) {
  var sh = hoja_();
  sh.getRange(fila, 4).setNumberFormat('@');
  sh.getRange(fila, 1, 1, COLS.length).setValues([valores]);
}

function limpiar_(k, v) {
  if (k === 'fav') return v === true || v === 'true';
  v = v == null ? '' : String(v).trim();
  if (k === 'status') return v === 'plan' ? 'plan' : 'vis';
  if (k === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  if (k === 'src') return /^https?:\/\//i.test(v) ? v.slice(0, 500) : '';
  return v.slice(0, 200);
}

function crear_(rec, file) {
  var o = { id: Utilities.getUuid(), created: new Date().toISOString(), fileId: '', mime: '' };
  EDITABLES.forEach(function (k) { o[k] = limpiar_(k, rec[k]); });
  if (!o.name) throw new Error('Falta el nombre');
  var f = guardarArchivo_(file, o.name);
  if (f) { o.fileId = f.fileId; o.mime = f.mime; }
  var fila = hoja_().getLastRow() + 1;
  escribirFila_(fila, COLS.map(function (c) { return o[c]; }));
  return o;
}

function actualizar_(id, patch, file) {
  var sh = hoja_();
  var fila = buscarFila_(id);
  var o = aObjeto_(sh.getRange(fila, 1, 1, COLS.length).getValues()[0]);
  EDITABLES.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) o[k] = limpiar_(k, patch[k]);
  });
  if (!o.name) throw new Error('Falta el nombre');
  var f = guardarArchivo_(file, o.name);
  if (f) { quitarArchivo_(o.fileId); o.fileId = f.fileId; o.mime = f.mime; }
  escribirFila_(fila, COLS.map(function (c) { return o[c]; }));
  return o;
}

function borrar_(id) {
  var sh = hoja_();
  var fila = buscarFila_(id);
  var o = aObjeto_(sh.getRange(fila, 1, 1, COLS.length).getValues()[0]);
  quitarArchivo_(o.fileId);
  sh.deleteRow(fila);
}

// ---------- Google Drive ----------
function carpeta_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CARPETA_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* la crea de nuevo */ }
  }
  var f = DriveApp.createFolder(CARPETA);
  props.setProperty('CARPETA_ID', f.getId());
  return f;
}

function guardarArchivo_(file, nombre) {
  if (!file || !file.b64) return null;
  var mime = String(file.mime || '');
  if (mime.indexOf('image/') !== 0 && mime.indexOf('video/') !== 0) throw new Error('Solo se permiten fotos o videos');
  var bytes = Utilities.base64Decode(file.b64);
  if (bytes.length > MAX_BYTES) throw new Error('El archivo es demasiado grande');
  var blob = Utilities.newBlob(bytes, mime, nombre + ' - ' + (file.name || 'archivo'));
  var f = carpeta_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { fileId: f.getId(), mime: mime };
}

function quitarArchivo_(fileId) {
  if (!fileId) return;
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* ya no existía */ }
}
