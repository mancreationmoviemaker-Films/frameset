/**
 * FramePlan Studio — State Management
 * Project, Scenes, Objects, Selection, History (Undo/Redo), Clipboard & Local Storage.
 */

window.FPS_STATE = (function() {
  'use strict';

  const STORAGE_KEY = 'frameplan_studio_project_v1';
  const ASSETS_KEY = 'frameplan_studio_my_assets_v1';
  const MAX_HISTORY = 100;

  let project = null;
  let selectedIds = new Set();
  let clipboard = [];
  let undoStack = [];
  let redoStack = [];
  let isUndoRedoing = false;
  let saveTimer = null;
  let myAssets = [];

  // Listeners
  const changeListeners = [];

  function subscribe(fn) {
    changeListeners.push(fn);
  }

  function notify(changeType, detail) {
    changeListeners.forEach(fn => {
      try {
        fn(changeType, detail);
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
    scheduleAutoSave();
  }

  function init() {
    loadMyAssets();
    const loaded = loadFromLocalStorage();
    // Default to a fresh empty project if first time or if the stored project is the old preloaded demo
    if (!loaded || (project && project.title === 'Neon Nights Feature')) {
      project = JSON.parse(JSON.stringify(window.FPS_DATA.EMPTY_PROJECT));
      pushHistory('Fresh Empty Project');
      saveToLocalStorage();
    } else {
      // Ensure all scenes have timeline structure
      if (project && project.scenes) {
        project.scenes.forEach(ensureTimeline);
      }
    }
    notify('init', { project: project });
  }

  function ensureTimeline(scene) {
    if (!scene) return;
    if (!scene.timeline) {
      scene.timeline = { duration: 60, currentTime: 0, tracks: [] };
    }
    if (!scene.timeline.tracks) scene.timeline.tracks = [];
    if (scene.timeline.duration === undefined) scene.timeline.duration = 60;
    if (scene.timeline.currentTime === undefined) scene.timeline.currentTime = 0;
  }

  function getCurrentScene() {
    if (!project || !project.scenes) return null;
    return project.scenes.find(s => s.id === project.currentSceneId) || project.scenes[0];
  }

  function getObjects() {
    const scene = getCurrentScene();
    return scene ? (scene.objects || []) : [];
  }

  function getObjectById(id) {
    return getObjects().find(o => o.id === id);
  }

  // --- SELECTION ---
  function getSelectedIds() {
    return Array.from(selectedIds);
  }

  function getSelectedObjects() {
    return getObjects().filter(o => selectedIds.has(o.id));
  }

  function isSelected(id) {
    return selectedIds.has(id);
  }

  function selectObject(id, multi = false) {
    if (!multi) {
      selectedIds.clear();
    }
    if (id) {
      selectedIds.add(id);
    }
    notify('selection_change', { selectedIds: getSelectedIds() });
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    notify('selection_change', { selectedIds: getSelectedIds() });
  }

  function selectMultiple(ids) {
    selectedIds.clear();
    ids.forEach(id => selectedIds.add(id));
    notify('selection_change', { selectedIds: getSelectedIds() });
  }

  function selectAll() {
    const objects = getObjects();
    selectedIds.clear();
    objects.forEach(o => {
      if (!o.locked && o.visible !== false) {
        selectedIds.add(o.id);
      }
    });
    notify('selection_change', { selectedIds: getSelectedIds() });
  }

  function deselectAll() {
    if (selectedIds.size > 0) {
      selectedIds.clear();
      notify('selection_change', { selectedIds: [] });
    }
  }

  // --- HISTORY (UNDO / REDO) ---
  function pushHistory(label) {
    if (isUndoRedoing) return;
    const snapshot = JSON.stringify(project);
    undoStack.push({
      label: label || 'Action',
      data: snapshot,
      selected: getSelectedIds()
    });
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = []; // Clear redo on new action
    notify('history_change', { canUndo: canUndo(), canRedo: canRedo() });
  }

  function canUndo() {
    return undoStack.length > 1;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function undo() {
    if (!canUndo()) return;
    isUndoRedoing = true;
    const current = undoStack.pop();
    redoStack.push(current);

    const prev = undoStack[undoStack.length - 1];
    project = JSON.parse(prev.data);
    selectedIds = new Set(prev.selected || []);
    isUndoRedoing = false;

    notify('project_update', { reason: 'undo' });
    notify('history_change', { canUndo: canUndo(), canRedo: canRedo() });
  }

  function redo() {
    if (!canRedo()) return;
    isUndoRedoing = true;
    const next = redoStack.pop();
    undoStack.push(next);

    project = JSON.parse(next.data);
    selectedIds = new Set(next.selected || []);
    isUndoRedoing = false;

    notify('project_update', { reason: 'redo' });
    notify('history_change', { canUndo: canUndo(), canRedo: canRedo() });
  }

  // --- OBJECT MUTATIONS ---
  function addObject(rawObj, selectIt = true) {
    const scene = getCurrentScene();
    if (!scene) return null;
    if (!scene.objects) scene.objects = [];

    const obj = Object.assign({
      id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: rawObj.name || 'Object',
      category: rawObj.category || 'prop',
      x: rawObj.x !== undefined ? rawObj.x : 500,
      y: rawObj.y !== undefined ? rawObj.y : 400,
      width: rawObj.width || 60,
      height: rawObj.height || 60,
      rotation: rawObj.rotation || 0,
      scale: rawObj.scale || 1,
      opacity: rawObj.opacity !== undefined ? rawObj.opacity : 1,
      locked: false,
      visible: true
    }, rawObj);

    scene.objects.push(obj);
    if (selectIt) {
      selectedIds.clear();
      selectedIds.add(obj.id);
    }

    pushHistory('Add ' + obj.name);
    notify('object_added', { object: obj });
    return obj;
  }

  function updateObject(id, partial, skipHistory = false) {
    const obj = getObjectById(id);
    if (!obj) return;
    Object.assign(obj, partial);
    if (!skipHistory) {
      pushHistory('Update ' + obj.name);
    }
    notify('object_updated', { object: obj, id: id });
  }

  function updateMultipleObjects(updates, label = 'Update Objects') {
    updates.forEach(u => {
      const obj = getObjectById(u.id);
      if (obj) Object.assign(obj, u.changes);
    });
    pushHistory(label);
    notify('objects_updated', { count: updates.length });
  }

  function deleteSelected() {
    const scene = getCurrentScene();
    if (!scene || selectedIds.size === 0) return;

    const initialLen = scene.objects.length;
    scene.objects = scene.objects.filter(o => !selectedIds.has(o.id));
    const deletedCount = initialLen - scene.objects.length;

    selectedIds.clear();
    pushHistory('Delete ' + deletedCount + ' items');
    notify('object_deleted', { count: deletedCount });
  }

  function duplicateSelected() {
    const scene = getCurrentScene();
    if (!scene || selectedIds.size === 0) return;

    const newIds = [];
    const selected = getSelectedObjects();

    selected.forEach(orig => {
      const clone = JSON.parse(JSON.stringify(orig));
      clone.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      clone.name = incrementName(orig.name);
      clone.x += 30; // offset slightly
      clone.y += 30;
      scene.objects.push(clone);
      newIds.push(clone.id);
    });

    selectedIds.clear();
    newIds.forEach(id => selectedIds.add(id));

    pushHistory('Duplicate Objects');
    notify('objects_duplicated', { newIds: newIds });
  }

  function incrementName(name) {
    const match = name.match(/^(.*?)(?:\s+(\d+))?$/);
    if (!match) return name + ' 2';
    const base = match[1];
    const num = match[2] ? parseInt(match[2], 10) + 1 : 2;
    return `${base} ${num}`;
  }

  // Grouping
  function groupSelected() {
    const selected = getSelectedObjects();
    if (selected.length < 2) return;

    const groupId = 'group_' + Date.now();
    selected.forEach(o => {
      o.groupId = groupId;
    });

    pushHistory('Group Objects');
    notify('objects_grouped', { groupId: groupId });
  }

  function ungroupSelected() {
    const selected = getSelectedObjects();
    let ungrouped = false;
    selected.forEach(o => {
      if (o.groupId) {
        delete o.groupId;
        ungrouped = true;
      }
    });

    if (ungrouped) {
      pushHistory('Ungroup Objects');
      notify('objects_ungrouped', {});
    }
  }

  // Layer Ordering
  function reorderObject(id, direction) {
    const scene = getCurrentScene();
    if (!scene) return;
    const idx = scene.objects.findIndex(o => o.id === id);
    if (idx === -1) return;

    const item = scene.objects[idx];
    scene.objects.splice(idx, 1);

    if (direction === 'front') {
      scene.objects.push(item);
    } else if (direction === 'back') {
      scene.objects.unshift(item);
    } else if (direction === 'forward') {
      scene.objects.splice(Math.min(scene.objects.length, idx + 1), 0, item);
    } else if (direction === 'backward') {
      scene.objects.splice(Math.max(0, idx - 1), 0, item);
    }

    pushHistory('Reorder Layer');
    notify('layers_reordered', {});
  }

  function toggleLock(id) {
    const obj = getObjectById(id);
    if (!obj) return;
    obj.locked = !obj.locked;
    pushHistory((obj.locked ? 'Lock ' : 'Unlock ') + obj.name);
    notify('object_updated', { object: obj, id: id });
  }

  function toggleVisibility(id) {
    const obj = getObjectById(id);
    if (!obj) return;
    obj.visible = obj.visible === false ? true : false;
    pushHistory((obj.visible ? 'Show ' : 'Hide ') + obj.name);
    notify('object_updated', { object: obj, id: id });
  }

  // Clipboard
  function copySelected() {
    clipboard = JSON.parse(JSON.stringify(getSelectedObjects()));
    notify('clipboard_copy', { count: clipboard.length });
  }

  function pasteClipboard() {
    if (!clipboard || clipboard.length === 0) return;
    const scene = getCurrentScene();
    if (!scene) return;

    const newIds = [];
    clipboard.forEach(orig => {
      const clone = JSON.parse(JSON.stringify(orig));
      clone.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      clone.name = incrementName(orig.name);
      clone.x += 40;
      clone.y += 40;
      scene.objects.push(clone);
      newIds.push(clone.id);
    });

    selectedIds.clear();
    newIds.forEach(id => selectedIds.add(id));

    pushHistory('Paste Objects');
    notify('objects_pasted', { newIds: newIds });
  }

  function cutSelected() {
    copySelected();
    deleteSelected();
  }

  // --- SCENE OPERATIONS ---
  function createScene(name) {
    const num = (project.scenes.length + 1).toString();
    const newScene = {
      id: 'scene_' + Date.now(),
      number: num,
      name: name || ('Scene ' + num),
      env: 'INT.',
      location: 'SET ' + num,
      time: 'DAY',
      notes: '',
      shots: [],
      objects: []
    };
    project.scenes.push(newScene);
    project.currentSceneId = newScene.id;
    selectedIds.clear();

    pushHistory('Create ' + newScene.name);
    notify('scene_switched', { scene: newScene });
  }

  function switchScene(sceneId) {
    const found = project.scenes.find(s => s.id === sceneId);
    if (!found) return;
    project.currentSceneId = found.id;
    selectedIds.clear();
    notify('scene_switched', { scene: found });
  }

  function deleteScene(sceneId) {
    if (project.scenes.length <= 1) return; // Keep at least 1 scene
    const idx = project.scenes.findIndex(s => s.id === sceneId);
    if (idx === -1) return;

    project.scenes.splice(idx, 1);
    if (project.currentSceneId === sceneId) {
      project.currentSceneId = project.scenes[0].id;
    }
    selectedIds.clear();

    pushHistory('Delete Scene');
    notify('scene_switched', { scene: getCurrentScene() });
  }

  function duplicateScene(sceneId) {
    const orig = project.scenes.find(s => s.id === sceneId);
    if (!orig) return;

    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = 'scene_' + Date.now();
    clone.name = orig.name + ' (Copy)';
    clone.number = (project.scenes.length + 1).toString();

    project.scenes.push(clone);
    project.currentSceneId = clone.id;
    selectedIds.clear();

    pushHistory('Duplicate Scene');
    notify('scene_switched', { scene: clone });
  }

  function updateSceneMeta(meta) {
    const scene = getCurrentScene();
    if (!scene) return;
    Object.assign(scene, meta);
    pushHistory('Update Scene Info');
    notify('scene_meta_updated', { scene: scene });
  }

  function updateProjectTitle(title) {
    if (!project) return;
    project.title = title || 'Untitled Film Project';
    pushHistory('Rename Project');
    notify('project_renamed', { title: project.title });
  }

  // --- SHOT LIST OPERATIONS ---
  function addShot(shotData) {
    const scene = getCurrentScene();
    if (!scene) return;
    if (!scene.shots) scene.shots = [];

    const num = (scene.shots.length + 1).toString().padStart(2, '0');
    const shot = Object.assign({
      id: 'shot_' + Date.now(),
      number: num,
      camera: 'Camera 1',
      type: 'Medium Shot',
      focal: '35mm',
      movement: 'Static',
      desc: 'Shot description'
    }, shotData);

    scene.shots.push(shot);
    pushHistory('Add Shot ' + shot.number);
    notify('shot_updated', { scene: scene });
  }

  function updateShot(shotId, data) {
    const scene = getCurrentScene();
    if (!scene || !scene.shots) return;
    const shot = scene.shots.find(s => s.id === shotId);
    if (!shot) return;

    Object.assign(shot, data);
    pushHistory('Update Shot ' + shot.number);
    notify('shot_updated', { scene: scene });
  }

  function deleteShot(shotId) {
    const scene = getCurrentScene();
    if (!scene || !scene.shots) return;
    scene.shots = scene.shots.filter(s => s.id !== shotId);
    pushHistory('Delete Shot');
    notify('shot_updated', { scene: scene });
  }

  // --- TIMELINE OPERATIONS ---
  function getTimeline() {
    const scene = getCurrentScene();
    if (!scene) return { duration: 60, currentTime: 0, tracks: [] };
    ensureTimeline(scene);
    return scene.timeline;
  }

  function setTimelineTime(timeInSeconds, notifyCanvas = true) {
    const scene = getCurrentScene();
    if (!scene) return;
    ensureTimeline(scene);
    scene.timeline.currentTime = Math.max(0, Math.min(scene.timeline.duration, timeInSeconds));
    notify('timeline_time_updated', { currentTime: scene.timeline.currentTime, notifyCanvas });
  }

  function setTimelineDuration(durationInSeconds) {
    const scene = getCurrentScene();
    if (!scene) return;
    ensureTimeline(scene);
    scene.timeline.duration = Math.max(10, durationInSeconds);
    pushHistory('Change Timeline Duration');
    notify('timeline_updated', { reason: 'duration' });
  }

  function addTimelineTrack(trackData) {
    const scene = getCurrentScene();
    if (!scene) return null;
    ensureTimeline(scene);

    const track = Object.assign({
      id: 'track_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      objectId: null,
      category: 'actor',
      name: 'Actor Track',
      color: '#3b82f6',
      cues: []
    }, trackData);

    scene.timeline.tracks.push(track);
    pushHistory('Add Track ' + track.name);
    notify('timeline_updated', { reason: 'add_track', track });
    return track;
  }

  function addSelectedToTimeline(targetObjs) {
    let selected = targetObjs;
    if (!selected) {
      selected = getSelectedObjects();
    } else if (!Array.isArray(selected)) {
      selected = [selected];
    }
    const scene = getCurrentScene();
    if (!scene) return [];
    ensureTimeline(scene);

    if (selected.length === 0) {
      // If nothing selected, prompt or add a generic Actor track
      const track = addTimelineTrack({
        name: 'Actor Action',
        category: 'actor',
        color: '#3b82f6',
        cues: [
          {
            id: 'cue_' + Date.now(),
            startTime: scene.timeline.currentTime || 0,
            duration: 6,
            label: 'Actor: Action mark'
          }
        ]
      });
      return [track];
    }

    const addedTracks = [];
    selected.forEach(obj => {
      // Find existing track for this object
      let track = scene.timeline.tracks.find(t => t.objectId === obj.id);
      const cueStartTime = Math.round((scene.timeline.currentTime || 0) * 10) / 10;
      const defaultDuration = 6;

      const cueLabel = obj.category === 'actor' 
        ? `${obj.name}: Action Cue` 
        : (obj.category === 'camera' ? `${obj.name}: Shot Take` : `${obj.name}: Cue`);

      if (!track) {
        track = {
          id: 'track_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          objectId: obj.id,
          category: obj.category,
          name: obj.name,
          color: obj.color || (obj.category === 'camera' ? '#f59e0b' : '#3b82f6'),
          cues: [
            {
              id: 'cue_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              startTime: cueStartTime,
              duration: defaultDuration,
              label: cueLabel
            }
          ]
        };
        scene.timeline.tracks.push(track);
      } else {
        track.cues.push({
          id: 'cue_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          startTime: cueStartTime,
          duration: defaultDuration,
          label: cueLabel
        });
      }
      addedTracks.push(track);
    });

    pushHistory('Add to Timeline');
    notify('timeline_updated', { reason: 'added_selected', tracks: addedTracks });
    return addedTracks;
  }

  function addTimelineCue(trackId, cueData) {
    const scene = getCurrentScene();
    if (!scene) return null;
    ensureTimeline(scene);
    const track = scene.timeline.tracks.find(t => t.id === trackId);
    if (!track) return null;

    const cue = Object.assign({
      id: 'cue_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      startTime: scene.timeline.currentTime || 0,
      duration: 6,
      label: track.name + ' Cue'
    }, cueData);

    track.cues.push(cue);
    pushHistory('Add Cue to ' + track.name);
    notify('timeline_updated', { reason: 'add_cue', trackId, cue });
    return cue;
  }

  function updateTimelineCue(trackId, cueId, partial) {
    const scene = getCurrentScene();
    if (!scene) return;
    ensureTimeline(scene);
    const track = scene.timeline.tracks.find(t => t.id === trackId);
    if (!track) return;
    const cue = track.cues.find(c => c.id === cueId);
    if (!cue) return;

    Object.assign(cue, partial);
    pushHistory('Update Cue ' + cue.label);
    notify('timeline_updated', { reason: 'update_cue', trackId, cueId });
  }

  function deleteTimelineCue(trackId, cueId) {
    const scene = getCurrentScene();
    if (!scene) return;
    ensureTimeline(scene);
    const track = scene.timeline.tracks.find(t => t.id === trackId);
    if (!track) return;

    track.cues = track.cues.filter(c => c.id !== cueId);
    pushHistory('Delete Cue');
    notify('timeline_updated', { reason: 'delete_cue', trackId, cueId });
  }

  function deleteTimelineTrack(trackId) {
    const scene = getCurrentScene();
    if (!scene) return;
    ensureTimeline(scene);
    scene.timeline.tracks = scene.timeline.tracks.filter(t => t.id !== trackId);
    pushHistory('Delete Track');
    notify('timeline_updated', { reason: 'delete_track', trackId });
  }

  function resetToEmptyProject() {
    project = JSON.parse(JSON.stringify(window.FPS_DATA.EMPTY_PROJECT));
    selectedIds.clear();
    pushHistory('New Empty Project');
    saveToLocalStorage();
    notify('project_update', { reason: 'empty_reset' });
  }

  // --- MY ASSETS SYSTEM ---
  function saveToMyAssets(obj) {
    const asset = JSON.parse(JSON.stringify(obj));
    asset.id = 'asset_' + Date.now();
    myAssets.push(asset);
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(myAssets));
    } catch (e) {
      console.warn('Storage limit reached:', e);
    }
    notify('my_assets_updated', { assets: myAssets });
  }

  function loadMyAssets() {
    try {
      const data = localStorage.getItem(ASSETS_KEY);
      if (data) {
        myAssets = JSON.parse(data);
      }
    } catch (e) {
      myAssets = [];
    }
  }

  function getMyAssets() {
    return myAssets;
  }

  // --- PERSISTENCE & AUTOSAVE ---
  function scheduleAutoSave() {
    if (saveTimer) clearTimeout(saveTimer);
    const indicator = document.getElementById('save-status-indicator');
    const dot = indicator ? indicator.querySelector('.status-dot') : null;
    const text = document.getElementById('save-status-text');
    if (dot) dot.classList.add('saving');
    if (text) text.textContent = 'Saving...';

    saveTimer = setTimeout(() => {
      saveToLocalStorage();
      if (dot) dot.classList.remove('saving');
      if (text) text.textContent = 'Saved';
    }, 1000);
  }

  function saveToLocalStorage() {
    if (!project) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (err) {
      console.warn('Failed saving to localStorage:', err);
    }
  }

  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        project = JSON.parse(data);
        pushHistory('Restore from Storage');
        return true;
      }
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
    return false;
  }

  function exportJSON() {
    return JSON.stringify(project, null, 2);
  }

  function importJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.scenes) {
        project = parsed;
        selectedIds.clear();
        pushHistory('Import Project');
        saveToLocalStorage();
        notify('project_update', { reason: 'import' });
        return true;
      }
    } catch (err) {
      console.error('Failed to parse project JSON:', err);
    }
    return false;
  }

  function resetToDemo() {
    project = JSON.parse(JSON.stringify(window.FPS_DATA.DEMO_PROJECT));
    selectedIds.clear();
    pushHistory('Reset Demo');
    saveToLocalStorage();
    notify('project_update', { reason: 'reset' });
  }

  return {
    init: init,
    subscribe: subscribe,
    getProject: () => project,
    getCurrentScene: getCurrentScene,
    getObjects: getObjects,
    getObjectById: getObjectById,
    getSelectedIds: getSelectedIds,
    getSelectedObjects: getSelectedObjects,
    isSelected: isSelected,
    selectObject: selectObject,
    toggleSelect: toggleSelect,
    selectMultiple: selectMultiple,
    selectAll: selectAll,
    deselectAll: deselectAll,
    pushHistory: pushHistory,
    canUndo: canUndo,
    canRedo: canRedo,
    undo: undo,
    redo: redo,
    addObject: addObject,
    updateObject: updateObject,
    updateMultipleObjects: updateMultipleObjects,
    deleteSelected: deleteSelected,
    duplicateSelected: duplicateSelected,
    groupSelected: groupSelected,
    ungroupSelected: ungroupSelected,
    reorderObject: reorderObject,
    toggleLock: toggleLock,
    toggleVisibility: toggleVisibility,
    copySelected: copySelected,
    pasteClipboard: pasteClipboard,
    cutSelected: cutSelected,
    createScene: createScene,
    switchScene: switchScene,
    deleteScene: deleteScene,
    duplicateScene: duplicateScene,
    updateSceneMeta: updateSceneMeta,
    updateProjectTitle: updateProjectTitle,
    addShot: addShot,
    updateShot: updateShot,
    deleteShot: deleteShot,
    getTimeline: getTimeline,
    setTimelineTime: setTimelineTime,
    setTimelineDuration: setTimelineDuration,
    addTimelineTrack: addTimelineTrack,
    addSelectedToTimeline: addSelectedToTimeline,
    addTimelineCue: addTimelineCue,
    updateTimelineCue: updateTimelineCue,
    deleteTimelineCue: deleteTimelineCue,
    deleteTimelineTrack: deleteTimelineTrack,
    resetToEmptyProject: resetToEmptyProject,
    saveToMyAssets: saveToMyAssets,
    getMyAssets: getMyAssets,
    saveToLocalStorage: saveToLocalStorage,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetToDemo: resetToDemo
  };
})();
