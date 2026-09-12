const AUTO_BACKUP_FS_KEY='shoppos_backup_folder_handle',AUTO_BACKUP_INTERVAL_MS=0xc*0x3c*0x3c*0x3e8;let _backupFolderHandle=null,_autoBackupIntervalId=null;async function buildBackupPayload(){const _0x1ae563=await dbGetAll('products'),_0x4b531f=await dbGetAll('sales'),_0x1091e6=await dbGetAll('customers'),_0x1cf93a=await dbGetAll('settings'),_0x412581=await dbGetAll('promotions'),_0x55169d=await dbGetAll('expenses'),_0x7a8b9c=await dbGetAll('suppliers'),_0x2c3d4e=await dbGetAll('purchases'),_0x8f5e6a=await dbGetAll('zreports'),_0xc0ffee=await dbGetAll('categories'),_0xdeadbe=await dbGetAll('product_variants'),_0x00cabcd=await dbGetAll('auditlog');return{'version':'2.0','timestamp':new Date()['toISOString'](),'products':_0x1ae563,'sales':_0x4b531f,'customers':_0x1091e6,'settings':_0x1cf93a,'promotions':_0x412581,'expenses':_0x55169d,'suppliers':_0x7a8b9c,'purchases':_0x2c3d4e,'zreports':_0x8f5e6a,'users':await dbGetAll('users'),'categories':_0xc0ffee,'product_variants':_0xdeadbe,'auditlog':_0x00cabcd,'totalProducts':_0x1ae563['length'],'totalSales':_0x4b531f['length'],'totalCustomers':_0x1091e6['length']};}async function loadSavedFolderHandle(){try{const _0x8066c7=await dbGet('settings',AUTO_BACKUP_FS_KEY);if(!_0x8066c7||!_0x8066c7['handle'])return null;const _0x5dc937=await _0x8066c7['handle']['queryPermission']({'mode':'readwrite'});if(_0x5dc937==='granted')return _0x8066c7['handle'];return null;}catch(_0x4cc761){return null;}}async function saveFolderHandle(_0x2b2713){try{await dbPut('settings',{'key':AUTO_BACKUP_FS_KEY,'handle':_0x2b2713});}catch(_0x252340){}}async function writeBackupToFolder(_0x1e8a96,_0x1f5b82,_0x41c57d){const _0x3482a2=await _0x1e8a96['getFileHandle'](_0x1f5b82,{'create':!![]}),_0x583bc1=await _0x3482a2['createWritable']();await _0x583bc1['write'](_0x41c57d),await _0x583bc1['close']();}function downloadBackupSilent(_0x44d9b7,_0x5c0dba){const _0x1edbba=new Blob([_0x5c0dba],{'type':'application/json'}),_0x583427=URL['createObjectURL'](_0x1edbba),_0x381d67=document['createElement']('a');_0x381d67['href']=_0x583427,_0x381d67['download']=_0x44d9b7,_0x381d67['style']['display']='none',document['body']['appendChild'](_0x381d67),_0x381d67['click'](),document['body']['removeChild'](_0x381d67),setTimeout(()=>URL['revokeObjectURL'](_0x583427),0x2710);}async function performAutoBackupDownload(_0x304138=!![],_0x1e7e24=![]){if(window['autoBackupEnabled']===![]&&!_0x1e7e24){console['log']('ℹ️\x20Auto-backup\x20is\x20disabled,\x20skipping\x20download');return;}try{const _0x53b05c=await buildBackupPayload(),_0x19ca8f=JSON['stringify'](_0x53b05c,null,0x2),_0xa17324=new Date()['toISOString']()['replace'](/[:.]/g,'-')['slice'](0x0,0x13),_0x466d32='backup_'+_0xa17324+'.json',_0x11a371=_0x1e7e24||window['cloudBackupEnabled']===!![];if(_0x11a371&&'showDirectoryPicker'in window){!_backupFolderHandle&&(_backupFolderHandle=await loadSavedFolderHandle());if(_backupFolderHandle){await writeBackupToFolder(_backupFolderHandle,_0x466d32,_0x19ca8f),console['log']('✅\x20Backup\x20written\x20to\x20folder:\x20'+_0x466d32);if(!_0x304138)showToast(t('backupSaved',{'filename':_0x466d32}),'success');return;}}downloadBackupSilent(_0x466d32,_0x19ca8f),console['log']('✅\x20Backup\x20downloaded:\x20'+_0x466d32+'\x20('+_0x53b05c['totalProducts']+'\x20produits,\x20'+_0x53b05c['totalSales']+'\x20ventes)');if(!_0x304138)showToast(t('backupDownloaded',{'filename':_0x466d32}),'success');}catch(_0x3da127){console['error']('❌\x20Auto-backup\x20failed:',_0x3da127);}}async function pickBackupFolder(){if(!('showDirectoryPicker'in window)){showToast(t('folderNotSupported'),'info');return;}try{const _0x3095e2=await window['showDirectoryPicker']({'mode':'readwrite'});_backupFolderHandle=_0x3095e2,await saveFolderHandle(_0x3095e2),showToast(t('folderSelected'),'success'),await performAutoBackupDownload(![],!![]);}catch(_0x18b55c){_0x18b55c['name']!=='AbortError'&&(console['error']('Folder\x20pick\x20error:',_0x18b55c),showToast(t('folderError'),'error'));}}let _lastCloudSetting=null,_cloudSettingInitialized=![];async function setCloudBackupFromSettings(_0x519358){_0x519358=!!_0x519358;const _0x8f641e=!_cloudSettingInitialized;_cloudSettingInitialized=!![];const _0xb8ebbb=_0x8f641e||_lastCloudSetting!==_0x519358;_lastCloudSetting=_0x519358,window['cloudBackupEnabled']=_0x519358,window['__cloudBackupEnabled']=_0x519358;if(_0x8f641e)return;if(!_0xb8ebbb)return;_0x519358?(!_backupFolderHandle&&(_backupFolderHandle=await loadSavedFolderHandle()),_backupFolderHandle?(await performAutoBackupDownload(![],!![]),showToast(t('cloudBackupOn'),'success')):(showToast(t('cloudBackupFolderNeeded'),'info'),await pickBackupFolder())):showToast(t('cloudBackupOff'),'warning');}function initAutoBackupSchedule(){_autoBackupIntervalId&&(clearInterval(_autoBackupIntervalId),_autoBackupIntervalId=null),_autoBackupIntervalId=setInterval(()=>{window['autoBackupEnabled']!==![]?performAutoBackupDownload(!![]):console['log']('ℹ️\x20Auto-backup\x20is\x20disabled,\x20skipping\x20scheduled\x20backup');},AUTO_BACKUP_INTERVAL_MS);}window['addEventListener']('beforeunload',function(){if(typeof window['saveCheckoutPending']==='function')window['saveCheckoutPending']();}),window['addEventListener']('pagehide',function(){if(location['protocol']!=='http:'&&location['protocol']!=='https:')return;if(typeof navigator['sendBeacon']!=='function')return;try{navigator['sendBeacon']('/__shutdown__');}catch(_0x50167f){}}),document['addEventListener']('visibilitychange',function(){if(document['hidden']){if(typeof window['saveCheckoutPending']==='function')window['saveCheckoutPending']();}});async function restoreAutoBackup(){try{const _0x2ae3f2=await loadSavedFolderHandle();if(!_0x2ae3f2)return![];const _0x14638c=[];for await(const [_0x442ce6,_0x184552]of _0x2ae3f2['entries']()){typeof _0x442ce6==='string'&&_0x442ce6['startsWith']('backup_')&&_0x442ce6['endsWith']('.json')&&_0x14638c['push']({'name':_0x442ce6,'fh':_0x184552});}if(_0x14638c['length']===0x0)return![];_0x14638c['sort']((_0x25c5ef,_0x2d4e7e)=>_0x2d4e7e['name']['localeCompare'](_0x25c5ef['name']));const _0x3968d8=await _0x14638c[0x0]['fh']['getFile'](),_0x45a6db=await _0x3968d8['text'](),_0x1caf23=JSON['parse'](_0x45a6db),_0x193835=['products','sales','customers','settings','promotions','expenses','suppliers','purchases','zreports','categories','product_variants','users','auditlog'];for(const _0xaf157f of _0x193835){if(Array['isArray'](_0x1caf23[_0xaf157f])&&_0x1caf23[_0xaf157f]['length']>0x0){for(const _0xd70bc9 of _0x1caf23[_0xaf157f])await dbPut(_0xaf157f,_0xd70bc9);}}return console['log']('✅\x20Auto-restore\x20réalisé\x20depuis\x20le\x20dossier\x20de\x20sauvegarde'),!![];}catch(_0x531d42){return console['error']('Auto-restore\x20error:',_0x531d42),![];}}window['performAutoBackupDownload']=performAutoBackupDownload,window['initAutoBackupSchedule']=initAutoBackupSchedule,window['pickBackupFolder']=pickBackupFolder,window['setCloudBackupFromSettings']=setCloudBackupFromSettings,window['buildBackupPayload']=buildBackupPayload,window['restoreAutoBackup']=restoreAutoBackup,window['__db_createAutoBackup']=performAutoBackupDownload,window['__db_restoreAutoBackup']=restoreAutoBackup,window['_productsCache']=[];async function refreshProductsCache(){try{window['_productsCache']=await dbGetAll('products');}catch(_0x4daf94){window['_productsCache']=[];}}window['refreshProductsCache']=refreshProductsCache;
// === HOURLY AUTO-EXPORT ===
function _vapp(){return (typeof vollarApp!=='undefined')?vollarApp:null;}
var _hourlyExportPath=null,_hourlyExportInterval=null,_hourlyExportEnabled=false,_hourlyExportMinutes=60,_hourlyExportRetention=30,_hourlyExportLastTime=null,_hourlyExportNextTime=null;
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
      if(res&&res.ok){console.log('Hourly export saved: '+filename);cleanupHourlyBackups();}
      else{console.error('Hourly export failed:',res&&res.error);}
      return res;
    });
  });
}
function cleanupHourlyBackups(){
  var a=_vapp();
  if(!_hourlyExportPath||!a||!a.listFiles||!a.deleteFile)return;
  // Only prune HOURLY auto-export files — never shutdown (`backup_SHUTDOWN_…`)
  // or manually saved backups, which are meant for recovery.
  var hourlyRe=/^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}\.json$/;
  a.listFiles(_hourlyExportPath).then(function(result){
    if(!result||!result.files)return;
    var cutoff=Date.now()-_hourlyExportRetention*24*60*60*1000;
    result.files.forEach(function(f){
      if(f.name&&hourlyRe.test(f.name)&&f.mtime<cutoff){a.deleteFile(_hourlyExportPath+'/'+f.name)['catch'](function(){});}
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
}
window['pickHourlyExportFolder']=pickHourlyExportFolder;
window['performHourlyExport']=performHourlyExport;
window['setHourlyExportFromSettings']=setHourlyExportFromSettings;
window['cleanupHourlyBackups']=cleanupHourlyBackups;

// === SHUTDOWN BACKUP (called from Electron main process via IPC) ===
function performShutdownBackup(){
  var a=_vapp();
  if(!a||!a.saveFile)return Promise.resolve();
  return buildBackupPayload().then(function(payload){
    payload.exportType='shutdown';
    var json=JSON.stringify(payload,null,2);
    var ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    var filename='backup_SHUTDOWN_'+ts+'.json';
    if(_hourlyExportPath){return a.saveFile(_hourlyExportPath,filename,json);}
    if(a.getDesktopPath){return a.getDesktopPath().then(function(r){return r&&r.path?a.saveFile(r.path,filename,json):null;});}
    return null;
  })['catch'](function(e){console.error('Shutdown backup error:',e);return null;});
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
  if (settings.hourlyExportEnabled === true || settings.hourlyExportMinutes || settings.hourlyExportPath) {
    setHourlyExportFromSettings(settings.hourlyExportEnabled === true, settings.hourlyExportMinutes, settings.hourlyExportRetention, settings.hourlyExportPath);
  }
  if (typeof updateHourlyExportUI === 'function') {
    updateHourlyExportUI(settings.hourlyExportEnabled === true, settings.hourlyExportMinutes, settings.hourlyExportRetention, settings.hourlyExportPath);
  }
})();
