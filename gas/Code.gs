const SPREADSHEET_ID = '12SCiQm8V1KWoDCcvSME3rLUsQUM7YNqKPbT7IsKf2s4';
const SHEETS = { MAPEO: 'MAPEO', RACKS: 'RACKS', CATALOGO: 'CATALOGO', CONFIG: 'CONFIG' };

function setup() {
  ensureStructure_();
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('MAPEO_API_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('MAPEO_API_KEY', key);
  }
  console.log('MAPEO_API_KEY=' + key);
  console.log('SPREADSHEET_ID=' + SPREADSHEET_ID);
  return { ok: true, apiKey: key, spreadsheetId: SPREADSHEET_ID };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = sanitizeCallback_(p.callback || 'callback');
  try {
    authorize_(p.key);
    const action = String(p.action || 'ping');
    let data;
    if (action === 'ping') data = { ok: true, version: '1.1.0', time: new Date().toISOString() };
    else if (action === 'bootstrap') data = { ok: true, racks: racks_(), recent: recent_(12), catalog: catalog_(), spreadsheetId: SPREADSHEET_ID };
    else if (action === 'rack') data = rack_(String(p.rack || 'A').toUpperCase());
    else if (action === 'search') data = search_(String(p.q || ''));
    else if (action === 'recent') data = { ok: true, recent: recent_(20) };
    else if (action === 'catalog') data = { ok: true, catalog: catalog_() };
    else if (action === 'lookupMaterial') data = { ok: true, material: lookupMaterial_(upper_(p.code)) };
    else if (action === 'saveMapping') data = saveMapping_(p);
    else if (action === 'updateRack') data = updateRack_(p);
    else if (action === 'deleteMapping') data = deleteMapping_(p);
    else data = { ok: false, error: 'Acción no reconocida' };
    return jsonp_(callback, data);
  } catch (err) {
    return jsonp_(callback, { ok: false, error: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    authorize_(body.key);
    const action = String(body.action || '');
    let data;
    if (action === 'saveMapping') data = saveMapping_(body);
    else if (action === 'updateRack') data = updateRack_(body);
    else if (action === 'deleteMapping') data = deleteMapping_(body);
    else data = { ok: false, error: 'Acción POST no reconocida' };
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message || String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function authorize_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('MAPEO_API_KEY');
  if (!expected) throw new Error('Primero ejecuta setup() una vez en Apps Script');
  if (!key || String(key) !== String(expected)) throw new Error('Clave de captura incorrecta');
}

function ensureStructure_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const defs = [
    ['MAPEO', ['ID','FechaHora','Rack','Posicion','Nivel','CodigoMaterial','Descripcion','CantidadPiezas','Observaciones','Usuario','Estado']],
    ['RACKS', ['Rack','Posiciones','Niveles','Activo','Notas','UltimaActualizacion']],
    ['CATALOGO', ['CodigoMaterial','Descripcion','Categoria','Unidad','Activo']],
    ['CONFIG', ['Clave','Valor','Descripcion','Editable']]
  ];
  defs.forEach(function(d) {
    let sh = ss.getSheetByName(d[0]);
    if (!sh) sh = ss.insertSheet(d[0]);
    const current = sh.getRange(1,1,1,d[1].length).getValues()[0];
    if (!current[0]) sh.getRange(1,1,1,d[1].length).setValues([d[1]]); else if (d[0] === 'MAPEO' && current.indexOf('CantidadPiezas') < 0) { sh.insertColumnAfter(7); sh.getRange(1,8).setValue('CantidadPiezas'); }
  });
  const racks = ss.getSheetByName('RACKS');
  if (racks.getLastRow() < 27) {
    const existing = racks.getLastRow() > 1 ? racks.getRange(2,1,racks.getLastRow()-1,1).getValues().flat().map(String) : [];
    const add = [];
    for (let i=65;i<=90;i++) {
      const r = String.fromCharCode(i);
      if (existing.indexOf(r) < 0) add.push([r,0,0,true,'Pendiente de mapear','']);
    }
    if (add.length) racks.getRange(racks.getLastRow()+1,1,add.length,6).setValues(add);
  }
}

function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(name){ const sh = ss_().getSheetByName(name); if (!sh) throw new Error('No existe hoja ' + name); return sh; }
function clean_(v){ return v == null ? '' : String(v).trim(); }
function upper_(v){ return clean_(v).toUpperCase(); }
function tz_(){ return ss_().getSpreadsheetTimeZone() || 'America/Mexico_City'; }
function sanitizeCallback_(v){ return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(v) ? v : 'callback'; }
function jsonp_(callback,obj){ return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT); }

function racks_() {
  const sh = sheet_(SHEETS.RACKS), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,6).getValues().filter(function(r){return r[0]}).map(function(r){
    return { rack: upper_(r[0]), positions: Number(r[1])||0, levels: Number(r[2])||0, active: r[3] !== false, notes: clean_(r[4]), updated: r[5] || '' };
  });
}

function activeMappings_() {
  const sh = sheet_(SHEETS.MAPEO), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,11).getValues().filter(function(r){
    return upper_(r[10] || 'ACTIVO') !== 'ELIMINADO' && r[5];
  }).map(mapRow_);
}

function mapRow_(r) {
  const d = r[1] instanceof Date ? Utilities.formatDate(r[1], tz_(), 'yyyy-MM-dd HH:mm') : clean_(r[1]);
  return { id:clean_(r[0]), date:d, timeLabel:d ? d.slice(5,16) : '', rack:upper_(r[2]), position:Number(r[3])||0, level:Number(r[4])||0, code:upper_(r[5]), description:clean_(r[6]), quantity:Number(r[7])||0, notes:clean_(r[8]), user:clean_(r[9]), status:upper_(r[10]||'ACTIVO') };
}

function rack_(rack) {
  if (!/^[A-Z]$/.test(rack)) throw new Error('Rack inválido');
  const cfg = racks_().find(function(x){return x.rack === rack}) || { rack:rack, positions:0, levels:0, notes:'' };
  return { ok:true, rack:cfg, records:activeMappings_().filter(function(r){return r.rack===rack}) };
}

function recent_(limit){ return activeMappings_().slice(-Number(limit||20)).reverse(); }

function search_(q) {
  q = upper_(q);
  if (!q) return { ok:true, results:[] };
  const results = activeMappings_().filter(function(r){
    return r.code.indexOf(q)>-1 || upper_(r.description).indexOf(q)>-1;
  }).sort(function(a,b){
    return a.code.localeCompare(b.code) || a.rack.localeCompare(b.rack) || a.position-b.position || a.level-b.level;
  });
  return { ok:true, results:results.slice(0,200) };
}

function saveMapping_(b) {
  const rack = upper_(b.rack), position = Number(b.position), level = Number(b.level), code = upper_(b.code);
  if (!/^[A-Z]$/.test(rack)) throw new Error('Rack inválido');
  if (!position || !level) throw new Error('Posición y nivel son obligatorios');
  if (!code) throw new Error('Código requerido');

  const cfg = racks_().find(function(x){return x.rack===rack});
  if (cfg && cfg.positions && position > cfg.positions) throw new Error('Posición fuera del rango configurado');
  if (cfg && cfg.levels && level > cfg.levels) throw new Error('Nivel fuera del rango configurado');

  const sh = sheet_(SHEETS.MAPEO), last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2,3,last-1,9).getValues();
    const dup = vals.some(function(r){
      return upper_(r[0])===rack && Number(r[1])===position && Number(r[2])===level && upper_(r[3])===code && upper_(r[8]||'ACTIVO')!=='ELIMINADO';
    });
    if (dup) return { ok:true, duplicate:true, message:'Ese código ya está mapeado en la misma ubicación' };
  }

  const quantity = Math.max(0, Number(b.quantity)||0);
  let description = clean_(b.description);
  if (!description) description = catalogDescription_(code);
  const id = Utilities.getUuid();
  sh.appendRow([id,new Date(),rack,position,level,code,description,quantity,clean_(b.notes),clean_(b.user),'ACTIVO']);
  if (description) upsertCatalog_(code,description);
  return { ok:true, id:id, rack:rack, position:position, level:level, code:code, quantity:quantity };
}

function updateRack_(b) {
  const rack = upper_(b.rack), positions = Number(b.positions), levels = Number(b.levels);
  if (!/^[A-Z]$/.test(rack) || positions < 1 || levels < 1) throw new Error('Configuración inválida');
  const sh = sheet_(SHEETS.RACKS), last = Math.max(2,sh.getLastRow());
  const vals = sh.getRange(2,1,last-1,6).getValues();
  const idx = vals.findIndex(function(r){return upper_(r[0])===rack});
  const row = [rack,positions,levels,true,clean_(b.notes),new Date()];
  if (idx >= 0) sh.getRange(idx+2,1,1,6).setValues([row]); else sh.appendRow(row);
  return { ok:true, rack:rack, positions:positions, levels:levels };
}

function deleteMapping_(b) {
  const id = clean_(b.id);
  if (!id) throw new Error('ID requerido');
  const sh = sheet_(SHEETS.MAPEO), last = sh.getLastRow();
  if (last < 2) throw new Error('Sin registros');
  const ids = sh.getRange(2,1,last-1,1).getValues().flat().map(String);
  const i = ids.indexOf(id);
  if (i < 0) throw new Error('Registro no encontrado');
  sh.getRange(i+2,11).setValue('ELIMINADO');
  return { ok:true, id:id };
}

function catalog_() {
  const sh = sheet_(SHEETS.CATALOGO), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,5).getValues().filter(function(r){return r[0] && r[4]!==false}).map(function(r){return {code:upper_(r[0]),description:clean_(r[1]),category:clean_(r[2]),unit:clean_(r[3])}});
}

function lookupMaterial_(code) {
  const r = catalog_().find(function(x){return x.code===code});
  return r || null;
}

function catalogDescription_(code) {
  const r = lookupMaterial_(code);
  return r ? r.description : '';
}

function upsertCatalog_(code,description) {
  const sh = sheet_(SHEETS.CATALOGO), last = sh.getLastRow();
  if (last >= 2) {
    const codes = sh.getRange(2,1,last-1,1).getValues().flat().map(upper_);
    const i = codes.indexOf(code);
    if (i >= 0) {
      if (!clean_(sh.getRange(i+2,2).getValue())) sh.getRange(i+2,2).setValue(description);
      return;
    }
  }
  sh.appendRow([code,description,'','',true]);
}