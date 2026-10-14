const SPREADSHEET_ID = '12SCiQm8V1KWoDCcvSME3rLUsQUM7YNqKPbT7IsKf2s4';
const SHEETS = { MAPEO: 'MAPEO', RACKS: 'RACKS', CATALOGO: 'CATALOGO', CONFIG: 'CONFIG', RACK_LAYOUT: 'RACK_LAYOUT' };

function setup() {
  ensureStructure_();
  console.log('SPREADSHEET_ID=' + SPREADSHEET_ID);
  return { ok: true, spreadsheetId: SPREADSHEET_ID, authMode: 'public-webapp' };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = sanitizeCallback_(p.callback || 'callback');
  try {
    const action = String(p.action || 'ping');
    let data;
    if (action === 'ping') data = { ok: true, version: '2.6.0', time: new Date().toISOString(), revision: dataRevision_() };
    else if (action === 'revision') data = { ok:true, revision:dataRevision_(), time:new Date().toISOString() };
    else if (action === 'bootstrap') data = { ok: true, racks: racks_(), recent: recent_(12), catalog: catalog_(), layout: rackLayout_(), revision:dataRevision_(), spreadsheetId: SPREADSHEET_ID };
    else if (action === 'rack') data = rack_(String(p.rack || 'A').toUpperCase());
    else if (action === 'search') data = search_(String(p.q || ''));
    else if (action === 'recent') data = { ok: true, recent: recent_(20) };
    else if (action === 'records') data = { ok: true, records: activeMappings_().slice().reverse(), layout: rackLayout_(), revision:dataRevision_() };
    else if (action === 'bulkDelete') data = bulkDeleteMappings_(p.ids || '');
    else if (action === 'catalog') data = { ok: true, catalog: catalog_() };
    else if (action === 'lookupMaterial') data = { ok: true, material: lookupMaterial_(p.code || p.q || p.description || '') };
    else if (action === 'addMaterial') data = addMaterial_(p);
    else if (action === 'saveMapping') data = saveMapping_(p);
    else if (action === 'updateRack') data = updateRack_(p);
    else if (action === 'saveRackLayout') data = saveRackLayout_(p);
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
    const action = String(body.action || '');
    let data;
    if (action === 'saveMapping') data = saveMapping_(body);
    else if (action === 'addMaterial') data = addMaterial_(body);
    else if (action === 'updateRack') data = updateRack_(body);
    else if (action === 'saveRackLayout') data = saveRackLayout_(body);
    else if (action === 'deleteMapping') data = deleteMapping_(body);
    else if (action === 'bulkDelete') data = bulkDeleteMappings_(body.ids || '');
    else data = { ok: false, error: 'Acción POST no reconocida' };
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message || String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}


function dataRevision_() {
  const p = PropertiesService.getScriptProperties();
  let v = p.getProperty('DATA_REVISION');
  if (!v) {
    v = String(Date.now());
    p.setProperty('DATA_REVISION',v);
  }
  return v;
}

function bumpRevision_() {
  const v = String(Date.now());
  PropertiesService.getScriptProperties().setProperty('DATA_REVISION',v);
  return v;
}

function ensureStructure_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const defs = [
    ['MAPEO', ['ID','FechaHora','Rack','Posicion','Nivel','CodigoMaterial','Descripcion','CantidadPiezas','Observaciones','Usuario','Estado']],
    ['RACKS', ['Rack','Posiciones','Niveles','Activo','Notas','UltimaActualizacion']],
    ['CATALOGO', ['CodigoMaterial','Descripcion','Categoria','Unidad','Activo']],
    ['CONFIG', ['Clave','Valor','Descripcion','Editable']],
    ['RACK_LAYOUT', ['Rack','X','Y','UpdatedBy','UpdatedAt','Version']]
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
  const layout = ss.getSheetByName('RACK_LAYOUT');
  if (layout.getLastRow() < 27) {
    const rows = [];
    for (let i=0;i<26;i++) rows.push([String.fromCharCode(65+i),(i%6)*2,Math.floor(i/6)*2,'','',1]);
    layout.getRange(2,1,26,6).setValues(rows);
  }
}

function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(name){ const sh = ss_().getSheetByName(name); if (!sh) throw new Error('No existe hoja ' + name); return sh; }
function clean_(v){ return v == null ? '' : String(v).trim(); }
function upper_(v){ return clean_(v).toUpperCase(); }
function tz_(){ return ss_().getSpreadsheetTimeZone() || 'America/Mexico_City'; }
function sanitizeCallback_(v){ return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(v) ? v : 'callback'; }
function jsonp_(callback,obj){ return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT); }

function rackLayout_() {
  const sh = sheet_(SHEETS.RACK_LAYOUT), last = sh.getLastRow();
  const out = {};
  if (last >= 2) {
    sh.getRange(2,1,last-1,6).getValues().forEach(function(r){
      const rack = upper_(r[0]);
      if (/^[A-Z]$/.test(rack)) out[rack] = { rack:rack, x:Number(r[1])||0, y:Number(r[2])||0, updatedBy:clean_(r[3]), updatedAt:r[4] || '', version:Number(r[5])||1 };
    });
  }
  for (let i=0;i<26;i++) {
    const rack=String.fromCharCode(65+i);
    if (!out[rack]) out[rack]={rack:rack,x:(i%6)*2,y:Math.floor(i/6)*2,updatedBy:'',updatedAt:'',version:1};
  }
  return out;
}

function saveRackLayout_(b) {
  const raw = clean_(b.layout);
  if (!raw) throw new Error('Layout requerido');
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { throw new Error('Layout inválido'); }
  if (!Array.isArray(arr) || !arr.length) throw new Error('Layout inválido');
  const byRack = {};
  arr.forEach(function(item){
    const rack = upper_(item && item.rack);
    const x = Number(item && item.x), y = Number(item && item.y);
    if (!/^[A-Z]$/.test(rack)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 10 || y < 0 || y > 8) return;
    byRack[rack] = {rack:rack,x:Math.round(x),y:Math.round(y)};
  });
  const current = rackLayout_();
  const user = clean_(b.user);
  const now = new Date();
  const version = now.getTime();
  const rows = [];
  for (let i=65;i<=90;i++) {
    const rack=String.fromCharCode(i), p=byRack[rack] || current[rack] || {x:0,y:0};
    rows.push([rack,Number(p.x)||0,Number(p.y)||0,user,now,version]);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh=sheet_(SHEETS.RACK_LAYOUT);
    sh.getRange(2,1,26,6).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  const revision=bumpRevision_();
  return {ok:true, layout:rackLayout_(), version:version, revision:revision};
}

function racks_() {
  const sh = sheet_(SHEETS.RACKS), last = sh.getLastRow();
  const base = last < 2 ? [] : sh.getRange(2,1,last-1,6).getValues().filter(function(r){return r[0]}).map(function(r){
    return { rack: upper_(r[0]), positions: Number(r[1])||0, levels: Number(r[2])||0, active: r[3] !== false, notes: clean_(r[4]), updated: r[5] || '', mappedCount:0 };
  });
  const byRack = {};
  base.forEach(function(x){ byRack[x.rack]=x; });
  activeMappings_().forEach(function(m){
    if (!byRack[m.rack]) byRack[m.rack]={rack:m.rack,positions:0,levels:0,active:true,notes:'',updated:'',mappedCount:0};
    byRack[m.rack].positions=Math.max(byRack[m.rack].positions,Number(m.position)||0);
    byRack[m.rack].levels=Math.max(byRack[m.rack].levels,Number(m.level)||0);
    byRack[m.rack].mappedCount++;
  });
  return Object.keys(byRack).sort().map(function(k){return byRack[k]});
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

  const material = catalogByCode_(code);
  if (!material) throw new Error('MATERIAL_NOT_IN_CATALOG');

  const cfg = racks_().find(function(x){return x.rack===rack});
  if (cfg && cfg.positions && position > cfg.positions) throw new Error('Posición fuera del rango configurado');
  if (cfg && cfg.levels && level > cfg.levels) throw new Error('Nivel fuera del rango configurado');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_(SHEETS.MAPEO), last = sh.getLastRow();
    if (last >= 2) {
      const vals = sh.getRange(2,3,last-1,9).getValues();
      const dup = vals.some(function(r){
        return upper_(r[0])===rack && Number(r[1])===position && Number(r[2])===level && upper_(r[3])===code && upper_(r[8]||'ACTIVO')!=='ELIMINADO';
      });
      if (dup) return { ok:true, duplicate:true, message:'Ese código ya está mapeado en la misma ubicación', rack:rack, position:position, level:level, code:code, clientId:clean_(b.clientId), revision:dataRevision_() };
    }

    const quantity = Math.max(0, Number(b.quantity)||0);
    const description = material.description;
    const id = Utilities.getUuid();
    sh.appendRow([id,new Date(),rack,position,level,code,description,quantity,clean_(b.notes),clean_(b.user),'ACTIVO']);
    touchRackFromMapping_(rack,position,level);
    const revision=bumpRevision_();
    return { ok:true, id:id, rack:rack, position:position, level:level, code:code, quantity:quantity, clientId:clean_(b.clientId), revision:revision };
  } finally {
    lock.releaseLock();
  }
}

function touchRackFromMapping_(rack, position, level) {
  const sh = sheet_(SHEETS.RACKS), last = Math.max(2,sh.getLastRow());
  const vals = sh.getRange(2,1,last-1,6).getValues();
  const idx = vals.findIndex(function(r){return upper_(r[0])===rack});
  if (idx >= 0) {
    const row = vals[idx];
    const nextPos = Math.max(Number(row[1])||0, Number(position)||0);
    const nextLev = Math.max(Number(row[2])||0, Number(level)||0);
    sh.getRange(idx+2,2,1,5).setValues([[nextPos,nextLev,true,clean_(row[4])||'Detectado automáticamente desde MAPEO',new Date()]]);
  } else {
    sh.appendRow([rack,Number(position)||1,Number(level)||1,true,'Detectado automáticamente desde MAPEO',new Date()]);
  }
}

function updateRack_(b) {
  const rack = upper_(b.rack), positions = Number(b.positions), levels = Number(b.levels);
  if (!/^[A-Z]$/.test(rack) || positions < 1 || levels < 1) throw new Error('Configuración inválida');
  const sh = sheet_(SHEETS.RACKS), last = Math.max(2,sh.getLastRow());
  const vals = sh.getRange(2,1,last-1,6).getValues();
  const idx = vals.findIndex(function(r){return upper_(r[0])===rack});
  const row = [rack,positions,levels,true,clean_(b.notes),new Date()];
  if (idx >= 0) sh.getRange(idx+2,1,1,6).setValues([row]); else sh.appendRow(row);
  const revision=bumpRevision_();
  return { ok:true, rack:rack, positions:positions, levels:levels, revision:revision };
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
  const revision=bumpRevision_();
  return { ok:true, id:id, revision:revision };
}
function bulkDeleteMappings_(idsValue) {
  const ids = Array.isArray(idsValue) ? idsValue.map(clean_).filter(Boolean) : clean_(idsValue).split(',').map(clean_).filter(Boolean);
  if (!ids.length) throw new Error('Sin IDs para eliminar');
  const wanted = {};
  ids.forEach(function(id){ wanted[id] = true; });
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_(SHEETS.MAPEO), last = sh.getLastRow();
    if (last < 2) return { ok:true, deleted:0, ids:[] };
    const rows = sh.getRange(2,1,last-1,11).getValues();
    const status = rows.map(function(r){ return [r[10] || 'ACTIVO']; });
    const deletedIds = [];
    rows.forEach(function(r,i){
      const id = clean_(r[0]);
      if (wanted[id] && upper_(r[10] || 'ACTIVO') !== 'ELIMINADO') {
        status[i][0] = 'ELIMINADO';
        deletedIds.push(id);
      }
    });
    let revision=dataRevision_();
    if (deletedIds.length) { sh.getRange(2,11,status.length,1).setValues(status); revision=bumpRevision_(); }
    return { ok:true, deleted:deletedIds.length, ids:deletedIds, revision:revision };
  } finally {
    lock.releaseLock();
  }
}


function catalog_() {
  const sh = sheet_(SHEETS.CATALOGO), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,5).getValues().filter(function(r){return r[0] && r[4]!==false}).map(function(r){return {code:upper_(r[0]),description:clean_(r[1]),category:clean_(r[2]),unit:clean_(r[3])}});
}

function normalizeMaterial_(v) {
  return clean_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[´’‘`]/g,"'").replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function lookupMaterial_(query) {
  const q = clean_(query);
  if (!q) return null;
  const rows = catalog_();
  const code = upper_(q);
  let r = rows.find(function(x){ return x.code === code; });
  if (r) return r;
  const n = normalizeMaterial_(q);
  r = rows.find(function(x){ return normalizeMaterial_(x.description) === n; });
  if (r) return r;
  const partial = rows.filter(function(x){
    const d = normalizeMaterial_(x.description);
    return n.length >= 8 && d && (d.indexOf(n) > -1 || n.indexOf(d) > -1);
  });
  return partial.length === 1 ? partial[0] : null;
}

function catalogDescription_(code) {
  const r = lookupMaterial_(code);
  return r ? r.description : '';
}

function catalogByCode_(code) {
  code = upper_(code);
  if (!code) return null;
  const sh = sheet_(SHEETS.CATALOGO), last = sh.getLastRow();
  if (last < 2) return null;
  const rows = sh.getRange(2,1,last-1,5).getValues();
  for (let i=0;i<rows.length;i++) {
    if (upper_(rows[i][0]) === code && rows[i][4] !== false) {
      return { code:code, description:clean_(rows[i][1]), category:clean_(rows[i][2]), unit:clean_(rows[i][3]) };
    }
  }
  return null;
}

function addMaterial_(b) {
  const code = upper_(b.code), description = clean_(b.description);
  if (!code) throw new Error('Código requerido');
  if (!description) throw new Error('Descripción requerida');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_(SHEETS.CATALOGO), last = sh.getLastRow();
    if (last >= 2) {
      const rows = sh.getRange(2,1,last-1,5).getValues();
      for (let i=0;i<rows.length;i++) {
        if (upper_(rows[i][0]) === code) {
          const rowNum=i+2;
          const currentDesc=clean_(rows[i][1]) || description;
          sh.getRange(rowNum,2,1,4).setValues([[currentDesc,'Material de empaque',clean_(rows[i][3]),true]]);
          const revision=bumpRevision_();
          return { ok:true, existing:true, material:{code:code,description:currentDesc,category:'Material de empaque',unit:clean_(rows[i][3])}, revision:revision };
        }
      }
    }
    sh.appendRow([code,description,'Material de empaque','',true]);
    const revision=bumpRevision_();
    return { ok:true, existing:false, material:{code:code,description:description,category:'Material de empaque',unit:''}, revision:revision };
  } finally {
    lock.releaseLock();
  }
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