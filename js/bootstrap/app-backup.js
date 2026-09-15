const AUTO_BACKUP_FS_KEY='shoppos_backup_folder_handle',AUTO_BACKUP_INTERVAL_MS=0xc*0x3c*0x3c*0x3e8;let _backupFolderHandle=null,_autoBackupIntervalId=null;async function buildBackupPayload(){const _0x1ae563=await dbGetAll('products'),_0x4b531f=await dbGetAll('sales'),_0x1091e6=await dbGetAll('customers'),_0x1cf93a=await dbGetAll('settings'),_0x412581=await dbGetAll('promotions'),_0x55169d=await dbGetAll('expenses'),_0x7a8b9c=await dbGetAll('suppliers'),_0x2c3d4e=await dbGetAll('purchases'),_0x8f5e6a=await dbGetAll('zreports'),_0xc0ffee=await dbGetAll('categories'),_0xdeadbe=await dbGetAll('product_variants'),_0x00cabcd=await dbGetAll('auditlog');return{'version':'2.0','timestamp':new Date()['toISOString'](),'products':_0x1ae563,'sales':_0x4b531f,'customers':_0x1091e6,'settings':_0x1cf93a,'promotions':_0x412581,'expenses':_0x55169d,'suppliers':_0x7a8b9c,'purchases':_0x2c3d4e,'zreports':_0x8f5e6a,'users':await dbGetAll('users'),'categories':_0xc0ffee,'product_variants':_0xdeadbe,'auditlog':_0x00cabcd,'totalProducts':_0x1ae563['length'],'totalSales':_0x4b531f['length'],'totalCustomers':_0x1091e6['length']};}async function loadSavedFolderHandle(){try{const _0x8066c7=await dbGet('settings',AUTO_BACKUP_FS_KEY);if(!_0x8066c7||!_0x8066c7['handle'])return null;const _0x5dc937=await _0x8066c7['handle']['queryPermission']({'mode':'readwrite'});if(_0x5dc937==='granted')return _0x8066c7['handle'];return null;}catch(_0x4cc761){return null;}}async function saveFolderHandle(_0x2b2713){try{await dbPut('settings',{'key':AUTO_BACKUP_FS_KEY,'handle':_0x2b2713});}catch(_0x252340){}}async function writeBackupToFolder(_0x1e8a96,_0x1f5b82,_0x41c57d){const _0x3482a2=await _0x1e8a96['getFileHandle'](_0x1f5b82,{'create':!![]}),_0x583bc1=await _0x3482a2['createWritable']();await _0x583bc1['write'](_0x41c57d),await _0x583bc1['close']();}function downloadBackupSilent(_0x44d9b7,_0x5c0dba){const _0x1edbba=new Blob([_0x5c0dba],{'type':'application/json'}),_0x583427=URL['createObjectURL'](_0x1edbba),_0x381d67=document['createElement']('a');_0x381d67['href']=_0x583427,_0x381d67['download']=_0x44d9b7,_0x381d67['style']['display']='none',document['body']['appendChild'](_0x381d67),_0x381d67['click'](),document['body']['removeChild'](_0x381d67),setTimeout(()=>URL['revokeObjectURL'](_0x583427),0x2710);}async function performAutoBackupDownload(_0x304138=!![],_0x1e7e24=![]){if(window['autoBackupEnabled']===![]&&!_0x1e7e24){console['log']('ℹ️\x20Auto-backup\x20is\x20disabled,\x20skipping\x20download');return;}try{const _0x53b05c=await buildBackupPayload(),_0x19ca8f=JSON['stringify'](_0x53b05c,null,0x2),_0xa17324=new Date()['toISOString']()['replace'](/[:.]/g,'-')['slice'](0x0,0x13),_0x466d32='backup_'+_0xa17324+'.json',_0x11a371=_0x1e7e24||window['cloudBackupEnabled']===!![];if(_0x11a371&&'showDirectoryPicker'in window){!_backupFolderHandle&&(_backupFolderHandle=await loadSavedFolderHandle());if(_backupFolderHandle){await writeBackupToFolder(_backupFolderHandle,_0x466d32,_0x19ca8f),console['log']('✅\x20Backup\x20written\x20to\x20folder:\x20'+_0x466d32);if(!_0x304138)showToast(t('backupSaved',{'filename':_0x466d32}),'success');return;}}downloadBackupSilent(_0x466d32,_0x19ca8f),console['log']('✅\x20Backup\x20downloaded:\x20'+_0x466d32+'\x20('+_0x53b05c['totalProducts']+'\x20produits,\x20'+_0x53b05c['totalSales']+'\x20ventes)');if(!_0x304138)showToast(t('backupDownloaded',{'filename':_0x466d32}),'success');}catch(_0x3da127){console['error']('❌\x20Auto-backup\x20failed:',_0x3da127);}}async function pickBackupFolder(){if(!('showDirectoryPicker'in window)){showToast(t('folderNotSupported'),'info');return;}try{const _0x3095e2=await window['showDirectoryPicker']({'mode':'readwrite'});_backupFolderHandle=_0x3095e2,await saveFolderHandle(_0x3095e2),showToast(t('folderSelected'),'success'),await performAutoBackupDownload(![],!![]);}catch(_0x18b55c){_0x18b55c['name']!=='AbortError'&&(console['error']('Folder\x20pick\x20error:',_0x18b55c),showToast(t('folderError'),'error'));}}let _lastCloudSetting=null,_cloudSettingInitialized=![];async function setCloudBackupFromSettings(_0x519358){_0x519358=!!_0x519358;const _0x8f641e=!_cloudSettingInitialized;_cloudSettingInitialized=!![];const _0xb8ebbb=_0x8f641e||_lastCloudSetting!==_0x519358;_lastCloudSetting=_0x519358,window['cloudBackupEnabled']=_0x519358,window['__cloudBackupEnabled']=_0x519358;if(_0x8f641e)return;if(!_0xb8ebbb)return;_0x519358?(!_backupFolderHandle&&(_backupFolderHandle=await loadSavedFolderHandle()),_backupFolderHandle?(await performAutoBackupDownload(![],!![]),showToast(t('cloudBackupOn'),'success')):(showToast(t('cloudBackupFolderNeeded'),'info'),await pickBackupFolder())):showToast(t('cloudBackupOff'),'warning');}function initAutoBackupSchedule(){_autoBackupIntervalId&&(clearInterval(_autoBackupIntervalId),_autoBackupIntervalId=null),_autoBackupIntervalId=setInterval(()=>{window['autoBackupEnabled']!==![]?performAutoBackupDownload(!![]):console['log']('ℹ️\x20Auto-backup\x20is\x20disabled,\x20skipping\x20scheduled\x20backup');},AUTO_BACKUP_INTERVAL_MS);}window['addEventListener']('beforeunload',function(){if(typeof window['saveCheckoutPending']==='function')window['saveCheckoutPending']();}),window['addEventListener']('pagehide',function(){if(location['protocol']!=='http:'&&location['protocol']!=='https:')return;if(typeof navigator['sendBeacon']!=='function')return;try{navigator['sendBeacon']('/__shutdown__');}catch(_0x50167f){}}),document['addEventListener']('visibilitychange',function(){if(document['hidden']){if(typeof window['saveCheckoutPending']==='function')window['saveCheckoutPending']();}});async function restoreAutoBackup(){try{const _0x2ae3f2=await loadSavedFolderHandle();if(!_0x2ae3f2)return![];const _0x14638c=[];for await(const [_0x442ce6,_0x184552]of _0x2ae3f2['entries']()){typeof _0x442ce6==='string'&&_0x442ce6['startsWith']('backup_')&&_0x442ce6['endsWith']('.json')&&_0x14638c['push']({'name':_0x442ce6,'fh':_0x184552});}if(_0x14638c['length']===0x0)return![];_0x14638c['sort']((_0x25c5ef,_0x2d4e7e)=>_0x2d4e7e['name']['localeCompare'](_0x25c5ef['name']));const _0x3968d8=await _0x14638c[0x0]['fh']['getFile'](),_0x45a6db=await _0x3968d8['text'](),_0x1caf23=JSON['parse'](_0x45a6db),_0x193835=['products','sales','customers','settings','promotions','expenses','suppliers','purchases','zreports','categories','product_variants','users','auditlog'];for(const _0xaf157f of _0x193835){if(Array['isArray'](_0x1caf23[_0xaf157f])&&_0x1caf23[_0xaf157f]['length']>0x0){for(const _0xd70bc9 of _0x1caf23[_0xaf157f])await dbPut(_0xaf157f,_0xd70bc9);}}return console['log']('✅\x20Auto-restore\x20réalisé\x20depuis\x20le\x20dossier\x20de\x20sauvegarde'),!![];}catch(_0x531d42){return console['error']('Auto-restore\x20error:',_0x531d42),![];}}window['performAutoBackupDownload']=performAutoBackupDownload,window['initAutoBackupSchedule']=initAutoBackupSchedule,window['pickBackupFolder']=pickBackupFolder,window['setCloudBackupFromSettings']=setCloudBackupFromSettings,window['buildBackupPayload']=buildBackupPayload,window['restoreAutoBackup']=restoreAutoBackup,window['__db_createAutoBackup']=performAutoBackupDownload,window['__db_restoreAutoBackup']=restoreAutoBackup,window['_productsCache']=[];async function refreshProductsCache(){try{window['_productsCache']=await dbGetAll('products');}catch(_0x4daf94){window['_productsCache']=[];}}window['refreshProductsCache']=refreshProductsCache;
// === HOURLY AUTO-EXPORT ===
function _vapp(){return (typeof vollarApp!=='undefined')?vollarApp:null;}
var _hourlyExportPath=null,_hourlyExportInterval=null,_hourlyExportEnabled=false,_hourlyExportMinutes=60,_hourlyExportRetention=30,_hourlyExportLastTime=null,_hourlyExportNextTime=null,_autoBackupPath=null;
function pickHourlyExportFolder(){
  var a=_vapp();
  if(!a||!a.pickFolder){showToast((t('hourlyExportUnavailable')||'Cette option est disponible uniquement dans la version bureau (exe).'),'warning');return Promise.resolve(null);}
  return a.pickFolder().then(function(result){
    if(result&&result.path){_hourlyExportPath=result.path;settings.hourlyExportPath=result.path;dbPut('settings',{'key':'hourlyExportPath','value':result.path})['catch'](function(){});showToast(t('hourlyExportFolderSaved')||'Dossier d\x20export: '+result.path,'success');performHourlyExport();_startHourlySchedule();return result;}
    return null;
  });
}
function performHourlyExport(){
  var a=_vapp();
  if(!_hourlyExportEnabled||!_hourlyExportPath)return Promise.resolve();
  if(!a||!a.saveFile)return Promise.resolve();
  return buildBackupPayload().then(function(payload){
    payload.exportType='hourly';
    var json=JSON.stringify(payload,null,2);
    var now=new Date();
    var ts=now.toISOString().replace(/[:.]/g,'-').slice(0,16);
    var filename='backup_'+ts+'.json';
    _hourlyExportLastTime=now.toISOString();
    _hourlyExportNextTime=new Date(now.getTime()+_hourlyExportMinutes*60000).toISOString();
    return a.saveFile(_hourlyExportPath,filename,json).then(function(res){
      if(res&&res.ok){console.log('Hourly export saved: '+filename);cleanupHourlyBackups();_mirrorBackupFile(filename,json);}
      else{console.error('Hourly export failed:',res&&res.error);}
      return res;
    });
  });
}
function cleanupHourlyBackups(){
  var a=_vapp();
  if(!_hourlyExportPath||!a||!a.listFiles||!a.deleteFile)return;
  // Only prune disposable periodic backups: hourly exports
  // (`backup_YYYY-…-MM.json`) and per-transaction auto-backups
  // (`backup_YYYY-…-SS.json`). Never touch shutdown backups
  // (`backup_SHUTDOWN_…`) or manual ones kept for recovery, and always keep
  // the newest 3 backups regardless of age so the folder is never emptied.
  var backupRe=/^backup_(?!SHUTDOWN_)[A-Za-z0-9._-]+\.json$/;
  var KEEP_NEWEST=(typeof _backupKeepCount==='number')?_backupKeepCount:3;
  a.listFiles(_hourlyExportPath).then(function(result){
    if(!result||!result.files)return;
    var cutoff=Date.now()-_hourlyExportRetention*24*60*60*1000;
    var candidates=result.files.filter(function(f){return f.name&&backupRe.test(f.name);});
    candidates.sort(function(x,y){return (y.mtime||0)-(x.mtime||0);});
    candidates.forEach(function(f,idx){
      if(idx>=KEEP_NEWEST&&(f.mtime||0)<cutoff){a.deleteFile(_hourlyExportPath+'/'+f.name)['catch'](function(){});}
    });
  })['catch'](function(){});
}
function _startHourlySchedule(){
  if(_hourlyExportInterval)clearInterval(_hourlyExportInterval);
  if(!_hourlyExportEnabled)return;
  _hourlyExportInterval=setInterval(function(){performHourlyExport();},_hourlyExportMinutes*60*1000);
}
function setHourlyExportFromSettings(enabled,minutes,retention,path){
  _hourlyExportEnabled=!!enabled;
  if(minutes)_hourlyExportMinutes=parseInt(minutes)||60;
  if(retention)_hourlyExportRetention=parseInt(retention)||30;
  if(path)_hourlyExportPath=path;
  settings.hourlyExportEnabled=_hourlyExportEnabled;
  settings.hourlyExportMinutes=_hourlyExportMinutes;
  settings.hourlyExportRetention=_hourlyExportRetention;
  if(path)settings.hourlyExportPath=path;
  _startHourlySchedule();
  if(_hourlyExportEnabled&&_hourlyExportPath)performHourlyExport();
  if(typeof updateHourlyExportUI==='function')updateHourlyExportUI(_hourlyExportEnabled,_hourlyExportMinutes,_hourlyExportRetention,_hourlyExportPath);
  if(typeof updateBackupMirrorUI==='function')updateBackupMirrorUI();
  if(typeof refreshDriveWarnings==='function')setTimeout(refreshDriveWarnings,0);
}
window['pickHourlyExportFolder']=pickHourlyExportFolder;
window['performHourlyExport']=performHourlyExport;
window['setHourlyExportFromSettings']=setHourlyExportFromSettings;
window['cleanupHourlyBackups']=cleanupHourlyBackups;

// === SHUTDOWN BACKUP (called from Electron main process via IPC) ===
// Dedicated "Données du POS auto" folder on the Desktop, auto-created by the
// main process on every launch. Only the newest AUTO_BACKUP_KEEP files are
// kept; older ones are deleted after each save.
var AUTO_BACKUP_KEEP = 30;

function performShutdownBackup(){
  var a=_vapp();
  if(!a||!a.saveFile)return Promise.resolve();
  return buildBackupPayload().then(function(payload){
    payload.exportType='shutdown';
    var json=JSON.stringify(payload,null,2);
    var ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    var filename='backup_SHUTDOWN_'+ts+'.json';
    return a.getAutoBackupFolder().then(function(r){
      if(!r||!r.path)return null;
      return a.saveFile(r.path,filename,json).then(function(res){
        if(res&&res.ok){console.log('Shutdown backup saved: '+(res.path||filename));_mirrorBackupFile(filename,json);}
        else{console.error('Shutdown backup failed:',res&&res.error);}
        return res;
      }).then(function(res){
        // Keep the shutdown window open until the retention cleanup finishes.
        return cleanupAutoBackupFolder(r.path).then(function(){return res;});
      });
    });
  })['catch'](function(e){console.error('Shutdown backup error:',e);return null;});
}

// Keep only the newest AUTO_BACKUP_KEEP backup files in the auto folder:
// sorted by modification time (newest first), anything past the limit deleted.
function cleanupAutoBackupFolder(dirPath){
  var a=_vapp();
  if(!dirPath||!a||!a.listFiles||!a.deleteFile)return Promise.resolve();
  return a.listFiles(dirPath).then(function(result){
    if(!result||!result.files)return;
    var files=result.files.filter(function(f){return f.name&&/^backup_/.test(f.name)&&/\.json$/.test(f.name);});
    files.sort(function(x,y){return (y.mtime||0)-(x.mtime||0);});
    files.forEach(function(f,idx){
      if(idx>=AUTO_BACKUP_KEEP){a.deleteFile(dirPath+'/'+f.name)['catch'](function(){});}
    });
  })['catch'](function(){});
}
window['performShutdownBackup']=performShutdownBackup;

// === Quit listener from Electron main process ===
(function(){
  var a=_vapp();
  if(a&&a.onAppQuit){
    a.onAppQuit(function(){
      performShutdownBackup().then(function(){if(typeof vollarApp!=='undefined'&&vollarApp.quitReady)vollarApp.quitReady();});
    });
  }
})();

// === Settings UI helpers for hourly export ===
function saveHourlyExportPrefs() {
  var interval = document.getElementById('settings-hourly-export-interval');
  var retention = document.getElementById('settings-hourly-export-retention');
  if (interval) settings.hourlyExportMinutes = parseInt(interval.value) || 60;
  if (retention) settings.hourlyExportRetention = parseInt(retention.value) || 30;
  dbPut('settings', { key: 'hourlyExportMinutes', value: settings.hourlyExportMinutes })['catch'](function(){});
  dbPut('settings', { key: 'hourlyExportRetention', value: settings.hourlyExportRetention })['catch'](function(){});
  if (typeof _startHourlySchedule === 'function') _startHourlySchedule();
  if (typeof updateHourlyExportUI === 'function') updateHourlyExportUI(settings.hourlyExportEnabled, settings.hourlyExportMinutes, settings.hourlyExportRetention, settings.hourlyExportPath);
  showToast(t('settingsSaved'), 'success');
}
function updateHourlyExportUI(enabled, minutes, retention, path) {
  var statusEl = document.getElementById('hourly-export-status');
  if (statusEl) {
    statusEl.innerHTML = (enabled ? (t('hourlyExportStatusOn') || 'Export horaire ACTIVE') : (t('hourlyExportStatusOff') || 'Export horaire DESACTIVE'));
  }
  var pathEl = document.getElementById('hourly-export-path-display');
  if (pathEl) {
    pathEl.textContent = (path && path.length ? path : (t('hourlyExportFolderNone') || 'Non configuré'));
  }
  var iv = document.getElementById('settings-hourly-export-interval');
  if (iv && minutes) iv.value = String(minutes);
  var rt = document.getElementById('settings-hourly-export-retention');
  if (rt && retention) rt.value = String(retention);
}
window['saveHourlyExportPrefs'] = saveHourlyExportPrefs;
window['updateHourlyExportUI'] = updateHourlyExportUI;

// === Auto-init hourly export on load (settings.js loads before app-backup.js) ===
(function(){
  if (typeof settings === 'undefined' || !settings) return;
  if (settings.autoBackupPath) _autoBackupPath = settings.autoBackupPath;
  if (settings.hourlyExportEnabled === true || settings.hourlyExportMinutes || settings.hourlyExportPath) {
    setHourlyExportFromSettings(settings.hourlyExportEnabled === true, settings.hourlyExportMinutes, settings.hourlyExportRetention, settings.hourlyExportPath);
  }
  if (typeof updateHourlyExportUI === 'function') {
    updateHourlyExportUI(settings.hourlyExportEnabled === true, settings.hourlyExportMinutes, settings.hourlyExportRetention, settings.hourlyExportPath);
  }
  if (typeof updateBackupMirrorUI === 'function') updateBackupMirrorUI();
  if (typeof updateBackupDestDisplay === 'function') updateBackupDestDisplay();
  if (typeof updateShutdownDestDisplay === 'function') setTimeout(updateShutdownDestDisplay, 300);
  if (typeof refreshDriveWarnings === 'function') setTimeout(refreshDriveWarnings, 500);
})();

// === DESKTOP HARDENING: mirror copy + real-file auto-backup + drive warnings ===
// Browser behaviour is untouched — every desktop-only branch is guarded by the
// vollarApp bridge (_vapp()).

var _backupKeepCount = 3; // see cleanupHourlyBackups

// Write the same backup JSON to the optional "second folder" (settings.backupMirrorPath).
function _mirrorBackupFile(name, content) {
  var a = _vapp();
  if (!a || !a.saveFile) return Promise.resolve();
  var mirror = settings && settings.backupMirrorPath;
  if (!mirror) return Promise.resolve();
  return a.saveFile(mirror, name, content).then(function (r) {
    if (r && r.ok) console.log('Mirror backup saved: ' + name);
    else console.error('Mirror backup failed:', r && r.error);
    return r;
  });
}

// Auto-backup delivery, desktop-aware. The minified performAutoBackupDownload
// falls back to a browser Blob download when no showDirectoryPicker is present
// — in Electron that landed in the Chromium download dir. When an export folder
// is configured, write a real file there instead (plus the mirror copy).
(function () {
  var origDownloadBackupSilent = (typeof downloadBackupSilent === 'function') ? downloadBackupSilent : function (name, content) { /* noop */ };
  window['downloadBackupSilent'] = function (name, content) {
    var a = _vapp();
    var dir = (a && a.saveFile) ? (_autoBackupPath || _hourlyExportPath) : null;
    if (dir) {
      a.saveFile(dir, name, content).then(function (r) {
        if (r && r.ok) {
          console.log('Auto-backup written to folder: ' + name);
          if (_autoBackupPath) cleanupAutoBackups();
          else cleanupHourlyBackups();
        } else console.error('Auto-backup file write failed:', r && r.error);
      });
      _mirrorBackupFile(name, content);
      return;
    }
    return origDownloadBackupSilent(name, content);
  };
})();

// Choose the "second folder" that receives a copy of every backup file.
function pickBackupMirrorFolder() {
  var a = _vapp();
  if (!a || !a.pickFolder) {
    showToast(t('hourlyExportUnavailable') || 'Cette option est disponible uniquement dans la version bureau (exe).', 'warning');
    return Promise.resolve(null);
  }
  return a.pickFolder().then(function (result) {
    if (result && result.path) {
      settings.backupMirrorPath = result.path;
      dbPut('settings', { key: 'backupMirrorPath', value: result.path }).catch(function () {});
      showToast(t('backupMirrorSelected', { path: result.path }), 'success');
      if (typeof updateBackupMirrorUI === 'function') updateBackupMirrorUI();
      if (typeof refreshDriveWarnings === 'function') refreshDriveWarnings();
      return result;
    }
    return null;
  });
}
function clearBackupMirror() {
  settings.backupMirrorPath = '';
  dbPut('settings', { key: 'backupMirrorPath', value: '' }).catch(function () {});
  showToast(t('backupMirrorCleared') || 'Dossier secondaire de sauvegarde retiré.', 'info');
  if (typeof updateBackupMirrorUI === 'function') updateBackupMirrorUI();
  if (typeof refreshDriveWarnings === 'function') refreshDriveWarnings();
}
function updateBackupMirrorUI() {
  var el = document.getElementById('backup-mirror-path-display');
  if (!el) return;
  var mp = (settings && settings.backupMirrorPath) || '';
  el.textContent = mp || (t('backupMirrorNone') || 'Non configuré');
  if (typeof updateBackupDestDisplay === 'function') updateBackupDestDisplay();
}

// "Emplacement des sauvegardes" in the Sauvegarde Automatique card: on the
// installed desktop app auto-backups become real files in the export folder
// (mirror as extra copy); everywhere else they are downloads.
function updateBackupDestDisplay() {
  _autoBackupPath = (settings && settings.autoBackupPath) || _autoBackupPath;
  var el = document.getElementById('auto-backup-path-display');
  if (!el) return;
  var p = (settings && settings.autoBackupPath) || '';
  if (!p && settings && settings.hourlyExportPath) p = settings.hourlyExportPath;
  if (!p && settings && settings.backupMirrorPath) p = settings.backupMirrorPath;
  var a = (typeof _vapp === 'function') ? _vapp() : null;
  el.textContent = p || (a ? (t('backupDestDefault') || 'Dossier par défaut (Téléchargements)') : (t('backupDestBrowser') || 'Téléchargements (navigateur)'));
}

// Same-drive warnings: backups stored on the SAME drive as the data or the
// mirror on the same drive as the primary folder add no real disaster recovery.
function refreshDriveWarnings() {
  var a = _vapp();
  if (!a) return;
  var el = document.getElementById('drive-warning-text');
  if (!el) return;
  var ep = (settings && settings.hourlyExportPath) || '';
  var mp = (settings && settings.backupMirrorPath) || '';
  var getDP = a.getDataPath ? a.getDataPath() : Promise.resolve(null);
  return getDP.then(function (d) {
    var dataPath = d && d.path ? d.path : '';
    if (!dataPath) { el.style.display = 'none'; return; }
    var warns = [];
    var jobs = [];
    function addPair(label, pa, pb) {
      if (!pa || !pb || pa === pb) return;
      jobs.push(a.sameDrive ? a.sameDrive(pa, pb).then(function (same) { if (same) warns.push(label); }) : Promise.resolve());
    }
    addPair(t('driveSameData'), ep, dataPath);
    addPair(t('driveSameDataMirror'), mp, dataPath);
    addPair(t('driveSameDisk'), ep, mp);
    return Promise.all(jobs).then(function () {
      if (warns.length) { el.style.display = 'block'; el.textContent = t('driveWarnTitle') + ' ' + warns.join(' — '); }
      else { el.style.display = 'none'; }
    });
  }).catch(function () { if (el) el.style.display = 'none'; });
}
window['pickBackupMirrorFolder'] = pickBackupMirrorFolder;
window['clearBackupMirror'] = clearBackupMirror;
window['updateBackupMirrorUI'] = updateBackupMirrorUI;
window['refreshDriveWarnings'] = refreshDriveWarnings;

// === AUTO-BACKUP FOLDER (dossier dédié, indépendant de l'export horaire) ===
// Pick the folder where automatic backups (backup_YYYY-MM-DDTHH-MM-SS.json) are
// written on the desktop app. Falls back to the hourly export folder when unset,
// then to a browser download.
function pickAutoBackupFolder() {
  var a = _vapp();
  if (!a || !a.pickFolder) {
    showToast((t('hourlyExportUnavailable') || 'Cette option est disponible uniquement dans la version bureau (exe).'), 'warning');
    return Promise.resolve(null);
  }
  return a.pickFolder().then(function (result) {
    if (result && result.path) {
      _autoBackupPath = result.path;
      settings.autoBackupPath = result.path;
      dbPut('settings', { key: 'autoBackupPath', value: result.path }).catch(function () {});
      showToast(t('autoBackupFolderSaved', { path: result.path }), 'success');
      if (typeof updateBackupDestDisplay === 'function') updateBackupDestDisplay();
      return result;
    }
    return null;
  });
}

// Prune per-transaction auto-backups from the dedicated auto-backup folder:
// keep the newest KEEP_NEWEST regardless of age, delete the rest past the
// hourly-export retention window. Never touches backup_SHUTDOWN_* files.
function cleanupAutoBackups() {
  var a = _vapp();
  if (!a || !a.listFiles || !a.deleteFile) return;
  var dir = _autoBackupPath;
  if (!dir) return;
  var backupRe = /^backup_(?!SHUTDOWN_)[A-Za-z0-9._-]+\.json$/;
  var KEEP_NEWEST = (typeof _backupKeepCount === 'number') ? _backupKeepCount : 3;
  a.listFiles(dir).then(function (result) {
    if (!result || !result.files) return;
    var cutoff = Date.now() - _hourlyExportRetention * 24 * 60 * 60 * 1000;
    var candidates = result.files.filter(function (f) { return f.name && backupRe.test(f.name); });
    candidates.sort(function (x, y) { return (y.mtime || 0) - (x.mtime || 0); });
    candidates.forEach(function (f, idx) {
      if (idx >= KEEP_NEWEST && (f.mtime || 0) < cutoff) {
        a.deleteFile(dir + '/' + f.name).catch(function () {});
      }
    });
  }).catch(function () {});
}

// Show where the shutdown backup (« Données du POS auto » on the Desktop) is
// written, refreshed at startup. Browser mode shows a dash.
function updateShutdownDestDisplay() {
  var el = document.getElementById('shutdown-dest-display');
  if (!el) return;
  var a = _vapp();
  if (!a || !a.getAutoBackupFolder) { el.textContent = '-'; return; }
  a.getAutoBackupFolder().then(function (r) {
    el.textContent = (r && r.path) ? r.path : '-';
  }).catch(function () { el.textContent = '-'; });
}
window['pickAutoBackupFolder'] = pickAutoBackupFolder;
window['cleanupAutoBackups'] = cleanupAutoBackups;
window['updateShutdownDestDisplay'] = updateShutdownDestDisplay;