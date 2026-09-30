/**
 * FramePlan Studio — UI Manager
 * Connects toolbars, inspector, layers, shot list, notes, modals, context menu, and export/print.
 */

window.FPS_UI = (function() {
  'use strict';

  let activeModalCategory = 'props';

  function init() {
    bindTopBar();
    bindContextualBar();
    bindLeftToolbar();
    bindRightSidebar();
    bindModals();
    bindContextMenu();
    bindStateEvents();

    // Initial UI state update
    updateTopBarScene();
    updateLayersList();
    updateShotList();
    updateSceneNotes();
    updateLegend();
  }

  // --- 1. TOP BAR BINDINGS ---
  function bindTopBar() {
    // Project Menu Button
    const btnProjectMenu = document.getElementById('btn-project-menu');
    if (btnProjectMenu) {
      btnProjectMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = prompt('Project Options:\n1. Type "new" to create a New Project\n2. Type "demo" to Reset to Demo Scene\n3. Type "export" to Export JSON\n4. Type "cancel" to exit', 'demo');
        if (action === 'new') {
          const name = prompt('Enter Project Name:', 'New Film Project');
          if (name) {
            window.FPS_STATE.createScene('Scene 1');
            window.FPS_STATE.updateProjectTitle(name);
          }
        } else if (action === 'demo') {
          if (confirm('Reset to the sample Terrace Scene demo?')) {
            window.FPS_STATE.resetToDemo();
          }
        } else if (action === 'export') {
          exportJsonFile();
        }
      });
    }

    // Project Name Edit
    const titleInput = document.getElementById('project-title-input');
    if (titleInput) {
      titleInput.addEventListener('change', (e) => {
        window.FPS_STATE.updateProjectTitle(e.target.value);
      });
    }

    // Direct Blank Project & Demo Buttons
    const btnBlank = document.getElementById('btn-new-blank-project');
    if (btnBlank) {
      btnBlank.addEventListener('click', () => {
        if (confirm('Start a fresh, empty project? All objects on canvas will be cleared.')) {
          window.FPS_STATE.resetToEmptyProject();
        }
      });
    }

    const btnDemo = document.getElementById('btn-load-demo');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => {
        if (confirm('Load sample Terrace Scene demo with blocked actors and camera setups?')) {
          window.FPS_STATE.resetToDemo();
        }
      });
    }

    // Scene Picker Dropdown
    const btnScenePicker = document.getElementById('btn-scene-picker');
    const scenesDropdown = document.getElementById('scenes-dropdown');
    if (btnScenePicker && scenesDropdown) {
      btnScenePicker.addEventListener('click', (e) => {
        e.stopPropagation();
        scenesDropdown.classList.toggle('hidden');
        renderScenesDropdown();
      });
    }

    // Add Scene button inside dropdown
    const btnAddScene = document.getElementById('btn-add-scene');
    if (btnAddScene) {
      btnAddScene.addEventListener('click', (e) => {
        e.stopPropagation();
        const num = (window.FPS_STATE.getProject().scenes.length + 1).toString();
        window.FPS_STATE.createScene('Scene ' + num);
        if (scenesDropdown) scenesDropdown.classList.add('hidden');
      });
    }

    // Slugline Click to Edit
    const slugline = document.getElementById('scene-slugline');
    if (slugline) {
      slugline.addEventListener('click', () => {
        switchSidebarTab('notes');
      });
    }

    // Undo / Redo buttons
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.addEventListener('click', () => window.FPS_STATE.undo());
    if (btnRedo) btnRedo.addEventListener('click', () => window.FPS_STATE.redo());

    // Save Project Button
    const btnSave = document.getElementById('btn-save-project');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        window.FPS_STATE.saveToLocalStorage();
        const statusText = document.getElementById('save-status-text');
        if (statusText) statusText.textContent = 'Saved ✓';
      });
    }

    // Legend Toggle
    const btnToggleLegend = document.getElementById('btn-toggle-legend');
    const legendEl = document.getElementById('canvas-legend');
    if (btnToggleLegend && legendEl) {
      btnToggleLegend.addEventListener('click', () => {
        legendEl.classList.toggle('hidden');
        btnToggleLegend.classList.toggle('active', !legendEl.classList.contains('hidden'));
      });
    }

    // Quick Shotlist Button
    const btnQuickShotlist = document.getElementById('btn-quick-shotlist');
    if (btnQuickShotlist) {
      btnQuickShotlist.addEventListener('click', () => {
        switchSidebarTab('shots');
      });
    }

    // Export Dropdown
    const btnExportMenu = document.getElementById('btn-export-menu');
    const exportDropdown = document.getElementById('export-dropdown');
    if (btnExportMenu && exportDropdown) {
      btnExportMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('hidden');
      });
    }

    // Export Actions
    const btnExpPng = document.getElementById('btn-export-png');
    const btnExpJpg = document.getElementById('btn-export-jpg');
    const btnExpSvg = document.getElementById('btn-export-svg');
    const btnExpJson = document.getElementById('btn-export-json');
    const btnImpJson = document.getElementById('btn-import-json');
    const jsonFileInput = document.getElementById('json-file-input');
    const btnPrint = document.getElementById('btn-print-scene');

    if (btnExpPng) btnExpPng.addEventListener('click', () => exportImage('png'));
    if (btnExpJpg) btnExpJpg.addEventListener('click', () => exportImage('jpeg'));
    if (btnExpSvg) btnExpSvg.addEventListener('click', exportSvg);
    if (btnExpJson) btnExpJson.addEventListener('click', exportJsonFile);
    if (btnImpJson && jsonFileInput) {
      btnImpJson.addEventListener('click', () => jsonFileInput.click());
      jsonFileInput.addEventListener('change', handleJsonFileImport);
    }
    if (btnPrint) btnPrint.addEventListener('click', printScene);

    // Theme Toggle (Light / Dark)
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', toggleTheme);
    }

    // Fullscreen Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    // Help Button
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    if (btnHelp && helpModal) {
      btnHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
    }

    // Global click to close dropdowns
    window.addEventListener('click', () => {
      if (scenesDropdown) scenesDropdown.classList.add('hidden');
      if (exportDropdown) exportDropdown.classList.add('hidden');
      const ctxMenu = document.getElementById('context-menu');
      if (ctxMenu) ctxMenu.classList.add('hidden');
    });
  }

  // --- 2. CONTEXTUAL BAR ---
  function bindContextualBar() {
    const chkSnap = document.getElementById('chk-snap-grid');
    if (chkSnap) {
      chkSnap.addEventListener('change', (e) => {
        window.FPS_CANVAS.setSnapEnabled(e.target.checked);
      });
    }

    const btnCenter = document.getElementById('btn-quick-center');
    if (btnCenter) {
      btnCenter.addEventListener('click', () => {
        window.FPS_CANVAS.fitToScreen();
      });
    }

    // Zoom HUD buttons
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const btnFitScreen = document.getElementById('btn-fit-screen');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => window.FPS_CANVAS.zoomIn());
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => window.FPS_CANVAS.zoomOut());
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => window.FPS_CANVAS.resetZoom());
    if (btnFitScreen) btnFitScreen.addEventListener('click', () => window.FPS_CANVAS.fitToScreen());
  }

  function updateContextualBar(toolName) {
    const modeEl = document.getElementById('active-tool-name');
    const container = document.getElementById('context-controls-container');
    if (!modeEl || !container) return;

    const toolLabels = {
      select: 'Select & Move (V)',
      pan: 'Hand / Pan (H or Space)',
      actors: 'Actors Library (A)',
      cameras: 'Camera Library (C)',
      lighting: 'Lighting Library (L)',
      props: 'Props Library (P)',
      vehicles: 'Vehicles Library (VH)',
      blocking: 'Movement Blocking (B)',
      draw: 'Freehand Draw (D)',
      shapes: 'Shapes & Walls (S)',
      text: 'Text Annotation (T)',
      eraser: 'Eraser (E)',
      measure: 'Measurement Ruler (M)'
    };
    modeEl.textContent = toolLabels[toolName] || toolName;

    // Build tool-specific quick controls
    if (toolName === 'draw') {
      container.innerHTML = `
        <div class="context-group">
          <label class="toggle-checkbox">Type:
            <select id="ctx-draw-type" class="input-select" style="width: auto; padding: 2px 6px;">
              <option value="pencil">Pencil</option>
              <option value="brush">Brush</option>
              <option value="highlighter">Highlighter</option>
            </select>
          </label>
          <label class="toggle-checkbox">Color:
            <input type="color" id="ctx-draw-color" value="#3b82f6" style="width: 24px; height: 24px; padding: 0;" />
          </label>
          <label class="toggle-checkbox">Width:
            <select id="ctx-draw-width" class="input-select" style="width: auto; padding: 2px 6px;">
              <option value="2">2px</option>
              <option value="4" selected>4px</option>
              <option value="8">8px</option>
              <option value="14">14px</option>
            </select>
          </label>
        </div>
      `;
      setupDrawContextListeners();
    } else if (toolName === 'shapes') {
      container.innerHTML = `
        <div class="context-group">
          <label class="toggle-checkbox">Shape:
            <select id="ctx-shape-type" class="input-select" style="width: auto; padding: 2px 6px;">
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="wall">Architectural Wall</option>
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
            </select>
          </label>
          <label class="toggle-checkbox">Color:
            <input type="color" id="ctx-draw-color" value="#3b82f6" style="width: 24px; height: 24px; padding: 0;" />
          </label>
        </div>
      `;
      setupDrawContextListeners();
    } else if (toolName === 'blocking') {
      container.innerHTML = `
        <span class="context-hint">Click Start point on canvas, then click End point to create movement arrow.</span>
      `;
    } else if (toolName === 'measure') {
      container.innerHTML = `
        <span class="context-hint">Click point A and drag to point B to measure physical distance in meters / feet.</span>
      `;
    } else {
      container.innerHTML = `
        <span class="context-hint">Click object to select · Shift+Click for multi-select · Space+Drag to pan canvas</span>
      `;
    }
  }

  function setupDrawContextListeners() {
    const typeSelect = document.getElementById('ctx-draw-type') || document.getElementById('ctx-shape-type');
    const colorInput = document.getElementById('ctx-draw-color');
    const widthSelect = document.getElementById('ctx-draw-width');

    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        window.FPS_CANVAS.setDrawConfig({ type: e.target.value });
      });
      window.FPS_CANVAS.setDrawConfig({ type: typeSelect.value });
    }
    if (colorInput) {
      colorInput.addEventListener('input', (e) => {
        window.FPS_CANVAS.setDrawConfig({ color: e.target.value });
      });
    }
    if (widthSelect) {
      widthSelect.addEventListener('change', (e) => {
        window.FPS_CANVAS.setDrawConfig({ strokeWidth: parseInt(e.target.value, 10) });
      });
    }
  }

  // --- 3. LEFT TOOLBAR ---
  function bindLeftToolbar() {
    const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        
        // Asset Library tools open the modal
        if (['actors', 'cameras', 'lighting', 'props', 'vehicles'].includes(tool)) {
          openAssetModal(tool);
          return;
        }

        // Set tool
        toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.FPS_CANVAS.setTool(tool);
        updateContextualBar(tool);
      });
    });

    // Delete tool button
    const btnDelete = document.getElementById('tool-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        window.FPS_STATE.deleteSelected();
      });
    }

    // Floorplan upload
    const btnImage = document.getElementById('tool-image');
    const fileInput = document.getElementById('floorplan-file-input');
    if (btnImage && fileInput) {
      btnImage.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFloorplanUpload);
    }

    // Grid tool quick toggle
    const btnGrid = document.getElementById('tool-grid');
    if (btnGrid) {
      btnGrid.addEventListener('click', () => {
        const gridRect = document.getElementById('canvas-grid-rect');
        if (gridRect) {
          const isHidden = gridRect.getAttribute('fill') === 'none';
          gridRect.setAttribute('fill', isHidden ? 'url(#grid-pattern-medium)' : 'none');
          btnGrid.classList.toggle('active', isHidden);
        }
      });
    }
  }

  // --- 4. RIGHT SIDEBAR (TABS & INSPECTOR) ---
  function bindRightSidebar() {
    // Tab switching
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        switchSidebarTab(target);
      });
    });

    // Inspector Inputs
    const inputName = document.getElementById('prop-object-name');
    const inputX = document.getElementById('prop-pos-x');
    const inputY = document.getElementById('prop-pos-y');
    const inputW = document.getElementById('prop-width');
    const inputH = document.getElementById('prop-height');
    const inputRot = document.getElementById('prop-rotation');
    const inputOpacity = document.getElementById('prop-opacity');
    const colorPicker = document.getElementById('prop-color-picker');
    const colorHex = document.getElementById('prop-color-hex');
    const strokePicker = document.getElementById('prop-stroke-picker');
    const strokeHex = document.getElementById('prop-stroke-hex');
    const strokeWidth = document.getElementById('prop-stroke-width');
    const strokeStyle = document.getElementById('prop-stroke-style');

    if (inputName) {
      inputName.addEventListener('change', (e) => {
        const sel = window.FPS_STATE.getSelectedObjects();
        if (sel.length === 1) window.FPS_STATE.updateObject(sel[0].id, { name: e.target.value });
      });
    }

    if (inputX) inputX.addEventListener('change', (e) => updateSelectedTransform({ x: parseFloat(e.target.value) }));
    if (inputY) inputY.addEventListener('change', (e) => updateSelectedTransform({ y: parseFloat(e.target.value) }));
    if (inputW) inputW.addEventListener('change', (e) => updateSelectedTransform({ width: Math.max(10, parseFloat(e.target.value)) }));
    if (inputH) inputH.addEventListener('change', (e) => updateSelectedTransform({ height: Math.max(10, parseFloat(e.target.value)) }));

    if (inputRot) {
      inputRot.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('prop-rotation-val').textContent = `${val}°`;
        updateSelectedTransform({ rotation: val });
      });
    }

    // Quick rotation buttons
    document.querySelectorAll('.btn-rot-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const rot = parseInt(btn.getAttribute('data-rot'), 10);
        if (inputRot) inputRot.value = rot;
        document.getElementById('prop-rotation-val').textContent = `${rot}°`;
        updateSelectedTransform({ rotation: rot });
      });
    });

    if (inputOpacity) {
      inputOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('prop-opacity-val').textContent = `${Math.round(val * 100)}%`;
        updateSelectedTransform({ opacity: val });
      });
    }

    // Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const c = swatch.getAttribute('data-color');
        if (colorPicker) colorPicker.value = c;
        if (colorHex) colorHex.value = c;
        updateSelectedTransform({ color: c });
      });
    });

    if (colorPicker && colorHex) {
      colorPicker.addEventListener('input', (e) => {
        colorHex.value = e.target.value;
        updateSelectedTransform({ color: e.target.value });
      });
      colorHex.addEventListener('change', (e) => {
        colorPicker.value = e.target.value;
        updateSelectedTransform({ color: e.target.value });
      });
    }

    if (strokePicker && strokeHex) {
      strokePicker.addEventListener('input', (e) => {
        strokeHex.value = e.target.value;
        updateSelectedTransform({ strokeColor: e.target.value });
      });
      strokeHex.addEventListener('change', (e) => {
        strokePicker.value = e.target.value;
        updateSelectedTransform({ strokeColor: e.target.value });
      });
    }

    if (strokeWidth) {
      strokeWidth.addEventListener('change', (e) => {
        updateSelectedTransform({ strokeWidth: parseInt(e.target.value, 10) });
      });
    }

    if (strokeStyle) {
      strokeStyle.addEventListener('change', (e) => {
        updateSelectedTransform({ strokeStyle: e.target.value });
      });
    }

    // Camera Specific Inputs
    const camFocal = document.getElementById('cam-prop-focal');
    const camShotType = document.getElementById('cam-prop-shot-type');
    const camMovement = document.getElementById('cam-prop-movement');
    const camFovRange = document.getElementById('cam-prop-fov-range');

    if (camFocal) {
      camFocal.addEventListener('change', (e) => {
        updateSelectedTransform({ focal: parseInt(e.target.value, 10) });
      });
    }
    if (camShotType) {
      camShotType.addEventListener('change', (e) => {
        updateSelectedTransform({ shotType: e.target.value });
      });
    }
    if (camMovement) {
      camMovement.addEventListener('change', (e) => {
        updateSelectedTransform({ movement: e.target.value });
      });
    }
    if (camFovRange) {
      camFovRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('cam-prop-fov-range-val').textContent = `${val.toFixed(1)}m`;
        updateSelectedTransform({ fovRange: val });
      });
    }

    // Lighting Specific Inputs
    const lightIntensity = document.getElementById('light-prop-intensity');
    const lightBeamAngle = document.getElementById('light-prop-beam-angle');
    const lightBeamDistance = document.getElementById('light-prop-beam-distance');

    if (lightIntensity) {
      lightIntensity.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('light-prop-intensity-val').textContent = `${val}%`;
        updateSelectedTransform({ intensity: val });
      });
    }
    if (lightBeamAngle) {
      lightBeamAngle.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('light-prop-beam-angle-val').textContent = `${val}°`;
        updateSelectedTransform({ beamAngle: val });
      });
    }
    if (lightBeamDistance) {
      lightBeamDistance.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('light-prop-beam-distance-val').textContent = `${val.toFixed(1)}m`;
        updateSelectedTransform({ beamDistance: val });
      });
    }

    // Light Temperature Presets
    document.querySelectorAll('.btn-temp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-temp');
        if (colorPicker) colorPicker.value = color;
        if (colorHex) colorHex.value = color;
        updateSelectedTransform({ color: color });
      });
    });

    // Actor Specific Inputs
    const actorRole = document.getElementById('actor-prop-role');
    const actorPose = document.getElementById('actor-prop-pose');
    const actorNote = document.getElementById('actor-prop-blocking-note');

    if (actorRole) actorRole.addEventListener('change', (e) => updateSelectedTransform({ role: e.target.value }));
    if (actorPose) actorPose.addEventListener('change', (e) => updateSelectedTransform({ pose: e.target.value }));
    if (actorNote) actorNote.addEventListener('change', (e) => updateSelectedTransform({ blockingNote: e.target.value }));

    // Text Specific Inputs
    const textContent = document.getElementById('text-prop-content');
    const textSize = document.getElementById('text-prop-size');
    const btnBold = document.getElementById('btn-text-bold');
    const btnItalic = document.getElementById('btn-text-italic');
    const btnBadge = document.getElementById('btn-text-badge');

    if (textContent) textContent.addEventListener('input', (e) => updateSelectedTransform({ content: e.target.value }));
    if (textSize) textSize.addEventListener('change', (e) => updateSelectedTransform({ fontSize: parseInt(e.target.value, 10) }));
    if (btnBold) {
      btnBold.addEventListener('click', () => {
        btnBold.classList.toggle('active');
        updateSelectedTransform({ bold: btnBold.classList.contains('active') });
      });
    }
    if (btnItalic) {
      btnItalic.addEventListener('click', () => {
        btnItalic.classList.toggle('active');
        updateSelectedTransform({ italic: btnItalic.classList.contains('active') });
      });
    }
    if (btnBadge) {
      btnBadge.addEventListener('click', () => {
        btnBadge.classList.toggle('active');
        updateSelectedTransform({ showBadge: btnBadge.classList.contains('active') });
      });
    }

    // Inspector Action Buttons (Duplicate, Lock, Delete, Order)
    const btnDup = document.getElementById('btn-obj-duplicate');
    const btnLock = document.getElementById('btn-obj-lock');
    const btnDel = document.getElementById('btn-obj-delete');
    const btnFront = document.getElementById('btn-order-front');
    const btnBack = document.getElementById('btn-order-back');
    const btnForward = document.getElementById('btn-order-forward');
    const btnBackward = document.getElementById('btn-order-backward');
    const btnGroup = document.getElementById('btn-group-toggle');
    const btnSaveAsset = document.getElementById('btn-save-as-asset');

    if (btnDup) btnDup.addEventListener('click', () => window.FPS_STATE.duplicateSelected());
    if (btnLock) {
      btnLock.addEventListener('click', () => {
        const sel = window.FPS_STATE.getSelectedObjects();
        sel.forEach(o => window.FPS_STATE.toggleLock(o.id));
      });
    }
    if (btnDel) btnDel.addEventListener('click', () => window.FPS_STATE.deleteSelected());

    // Add to Timeline Track from Inspector
    const btnAddTimeline = document.getElementById('btn-add-to-timeline');
    if (btnAddTimeline) {
      btnAddTimeline.addEventListener('click', () => {
        const sel = window.FPS_STATE.getSelectedObjects();
        if (sel.length === 0) {
          alert('Please select an actor, camera, light, or prop on the canvas first.');
          return;
        }
        if (window.FPS_TIMELINE) {
          window.FPS_TIMELINE.addSelectedToTimeline(sel);
        }
      });
    }

    if (btnFront) btnFront.addEventListener('click', () => reorderSelected('front'));
    if (btnBack) btnBack.addEventListener('click', () => reorderSelected('back'));
    if (btnForward) btnForward.addEventListener('click', () => reorderSelected('forward'));
    if (btnBackward) btnBackward.addEventListener('click', () => reorderSelected('backward'));

    if (btnGroup) {
      btnGroup.addEventListener('click', () => {
        const sel = window.FPS_STATE.getSelectedObjects();
        if (sel.some(o => o.groupId)) {
          window.FPS_STATE.ungroupSelected();
        } else {
          window.FPS_STATE.groupSelected();
        }
      });
    }

    if (btnSaveAsset) {
      btnSaveAsset.addEventListener('click', () => {
        const sel = window.FPS_STATE.getSelectedObjects();
        if (sel.length > 0) {
          window.FPS_STATE.saveToMyAssets(sel[0]);
          alert(`Saved "${sel[0].name}" to My Assets!`);
        }
      });
    }

    // Empty state quick buttons
    const btnAddActor = document.getElementById('btn-quick-add-actor');
    const btnAddCam = document.getElementById('btn-quick-add-cam');
    if (btnAddActor) btnAddActor.addEventListener('click', () => openAssetModal('actors'));
    if (btnAddCam) btnAddCam.addEventListener('click', () => openAssetModal('cameras'));

    // Scene Notes inputs
    const metaNum = document.getElementById('scene-meta-number');
    const metaName = document.getElementById('scene-meta-name');
    const metaEnv = document.getElementById('scene-meta-env');
    const metaTime = document.getElementById('scene-meta-time');
    const metaLoc = document.getElementById('scene-meta-location');
    const metaNotes = document.getElementById('scene-director-notes');

    [metaNum, metaName, metaEnv, metaTime, metaLoc, metaNotes].forEach(el => {
      if (el) {
        el.addEventListener('change', () => {
          window.FPS_STATE.updateSceneMeta({
            number: metaNum ? metaNum.value : '1',
            name: metaName ? metaName.value : 'Scene 1',
            env: metaEnv ? metaEnv.value : 'INT.',
            time: metaTime ? metaTime.value : 'DAY',
            location: metaLoc ? metaLoc.value : 'SET',
            notes: metaNotes ? metaNotes.value : ''
          });
        });
      }
    });

    // Shot list Add Shot
    const btnAddShot = document.getElementById('btn-add-shot');
    if (btnAddShot) {
      btnAddShot.addEventListener('click', () => {
        window.FPS_STATE.addShot({
          camera: 'Camera 1',
          type: 'Medium Shot',
          focal: '35mm',
          movement: 'Static',
          desc: 'Action begins...'
        });
      });
    }
  }

  function reorderSelected(dir) {
    const sel = window.FPS_STATE.getSelectedObjects();
    sel.forEach(o => window.FPS_STATE.reorderObject(o.id, dir));
  }

  function updateSelectedTransform(partial) {
    const sel = window.FPS_STATE.getSelectedObjects();
    sel.forEach(o => {
      window.FPS_STATE.updateObject(o.id, partial);
    });
    window.FPS_CANVAS.renderScene();
  }

  function switchSidebarTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.sidebar-pane').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tabName}`);
    });
  }

  function updateInspector() {
    const selected = window.FPS_STATE.getSelectedObjects();
    const emptyState = document.getElementById('inspector-empty-state');
    const content = document.getElementById('inspector-content');

    if (selected.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (content) content.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const obj = selected[0];

    // Populate common fields
    const inputName = document.getElementById('prop-object-name');
    const tagCategory = document.getElementById('prop-object-category');
    const inputX = document.getElementById('prop-pos-x');
    const inputY = document.getElementById('prop-pos-y');
    const inputW = document.getElementById('prop-width');
    const inputH = document.getElementById('prop-height');
    const inputRot = document.getElementById('prop-rotation');
    const rotVal = document.getElementById('prop-rotation-val');
    const inputOpacity = document.getElementById('prop-opacity');
    const opacityVal = document.getElementById('prop-opacity-val');
    const colorPicker = document.getElementById('prop-color-picker');
    const colorHex = document.getElementById('prop-color-hex');
    const lockLabel = document.getElementById('label-obj-lock');

    if (inputName) inputName.value = obj.name || 'Object';
    if (tagCategory) tagCategory.textContent = obj.category || 'Prop';
    if (inputX) inputX.value = Math.round(obj.x);
    if (inputY) inputY.value = Math.round(obj.y);
    if (inputW) inputW.value = Math.round(obj.width || 60);
    if (inputH) inputH.value = Math.round(obj.height || 60);
    if (inputRot) inputRot.value = obj.rotation || 0;
    if (rotVal) rotVal.textContent = `${obj.rotation || 0}°`;
    if (inputOpacity) inputOpacity.value = obj.opacity !== undefined ? obj.opacity : 1;
    if (opacityVal) opacityVal.textContent = `${Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100)}%`;
    if (colorPicker && obj.color) colorPicker.value = obj.color;
    if (colorHex && obj.color) colorHex.value = obj.color;
    if (lockLabel) lockLabel.textContent = obj.locked ? 'Unlock' : 'Lock';

    // Toggle specific sections
    const secCam = document.getElementById('inspector-camera-section');
    const secLight = document.getElementById('inspector-light-section');
    const secActor = document.getElementById('inspector-actor-section');
    const secText = document.getElementById('inspector-text-section');

    if (secCam) secCam.classList.toggle('hidden', obj.category !== 'camera');
    if (secLight) secLight.classList.toggle('hidden', obj.category !== 'lighting');
    if (secActor) secActor.classList.toggle('hidden', obj.category !== 'actor');
    if (secText) secText.classList.toggle('hidden', obj.category !== 'text');

    if (obj.category === 'camera') {
      const fovInput = document.getElementById('cam-prop-fov-range');
      const focalSelect = document.getElementById('cam-prop-focal');
      const shotSelect = document.getElementById('cam-prop-shot-type');
      if (fovInput) {
        fovInput.value = obj.fovRange || 8;
        document.getElementById('cam-prop-fov-range-val').textContent = `${(obj.fovRange || 8).toFixed(1)}m`;
      }
      if (focalSelect) focalSelect.value = obj.focal || 35;
      if (shotSelect) shotSelect.value = obj.shotType || 'Medium Shot';
    } else if (obj.category === 'lighting') {
      const intensityInput = document.getElementById('light-prop-intensity');
      const beamInput = document.getElementById('light-prop-beam-angle');
      const distInput = document.getElementById('light-prop-beam-distance');
      if (intensityInput) {
        intensityInput.value = obj.intensity !== undefined ? obj.intensity : 85;
        document.getElementById('light-prop-intensity-val').textContent = `${intensityInput.value}%`;
      }
      if (beamInput) {
        beamInput.value = obj.beamAngle || 65;
        document.getElementById('light-prop-beam-angle-val').textContent = `${beamInput.value}°`;
      }
      if (distInput) {
        distInput.value = obj.beamDistance || 6;
        document.getElementById('light-prop-beam-distance-val').textContent = `${distInput.value}m`;
      }
    } else if (obj.category === 'actor') {
      const roleInput = document.getElementById('actor-prop-role');
      const poseSelect = document.getElementById('actor-prop-pose');
      if (roleInput) roleInput.value = obj.role || '';
      if (poseSelect) poseSelect.value = obj.pose || 'standing';
    } else if (obj.category === 'text') {
      const textInput = document.getElementById('text-prop-content');
      const sizeInput = document.getElementById('text-prop-size');
      if (textInput) textInput.value = obj.content || '';
      if (sizeInput) sizeInput.value = obj.fontSize || 14;
    }
  }

  // --- 5. LAYERS PANEL ---
  function updateLayersList() {
    const list = document.getElementById('layers-list');
    const countEl = document.getElementById('layers-total-count');
    if (!list) return;

    const objects = window.FPS_STATE.getObjects();
    if (countEl) countEl.textContent = objects.length;
    list.innerHTML = '';

    // Reverse to show top layers at the top of the UI
    const reversed = objects.slice().reverse();

    reversed.forEach(obj => {
      const li = document.createElement('li');
      li.className = `layer-item ${window.FPS_STATE.isSelected(obj.id) ? 'active' : ''} ${obj.locked ? 'locked' : ''}`;
      li.setAttribute('data-id', obj.id);

      const iconEmoji = getCategoryEmoji(obj.category, obj.propType || obj.subType);

      li.innerHTML = `
        <span class="layer-icon">${iconEmoji}</span>
        <span class="layer-name" title="Click to select">${escapeHtml(obj.name)}</span>
        <div class="layer-controls">
          <button class="btn-icon-micro btn-layer-vis" title="${obj.visible === false ? 'Show' : 'Hide'}">
            ${obj.visible === false ? '👁️‍🗨️' : '👁️'}
          </button>
          <button class="btn-icon-micro btn-layer-lock" title="${obj.locked ? 'Unlock' : 'Lock'}">
            ${obj.locked ? '🔒' : '🔓'}
          </button>
          <button class="btn-icon-micro btn-layer-del" title="Delete">✕</button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-layer-vis')) {
          window.FPS_STATE.toggleVisibility(obj.id);
        } else if (e.target.closest('.btn-layer-lock')) {
          window.FPS_STATE.toggleLock(obj.id);
        } else if (e.target.closest('.btn-layer-del')) {
          window.FPS_STATE.selectObject(obj.id);
          window.FPS_STATE.deleteSelected();
        } else {
          window.FPS_STATE.selectObject(obj.id, e.shiftKey);
        }
      });

      list.appendChild(li);
    });
  }

  function getCategoryEmoji(category, sub) {
    if (category === 'actor') return '👤';
    if (category === 'camera') return '📷';
    if (category === 'lighting') return '💡';
    if (category === 'vehicle') return '🚗';
    if (category === 'blocking') return '↗️';
    if (category === 'drawing') return '✏️';
    if (category === 'text') return '🔤';
    if (category === 'measurement') return '📏';
    if (sub === 'chair' || sub === 'armchair') return '🪑';
    if (sub === 'table' || sub === 'coffee_table') return '☕';
    if (sub === 'bed') return '🛏️';
    if (sub === 'tree') return '🌳';
    if (sub === 'door') return '🚪';
    if (sub === 'window') return '🪟';
    return '📦';
  }

  // --- 6. SHOT LIST PANEL ---
  function updateShotList() {
    const container = document.getElementById('shotlist-container');
    const topCount = document.getElementById('top-shots-count');
    if (!container) return;

    const scene = window.FPS_STATE.getCurrentScene();
    const shots = scene ? (scene.shots || []) : [];
    if (topCount) topCount.textContent = shots.length;

    container.innerHTML = '';
    if (shots.length === 0) {
      container.innerHTML = `<div class="pane-empty-state" style="padding: 20px;"><p class="empty-desc">No shots planned yet. Click "+ Add Shot" to create your storyboard sequence.</p></div>`;
      return;
    }

    shots.forEach(shot => {
      const card = document.createElement('div');
      card.className = 'shot-card';
      card.innerHTML = `
        <div class="shot-card-header">
          <span class="shot-number-badge">SHOT ${shot.number}</span>
          <span class="shot-cam-tag">${escapeHtml(shot.camera)} · ${escapeHtml(shot.focal)}</span>
          <button class="btn-icon-micro btn-shot-del" title="Delete Shot">✕</button>
        </div>
        <div class="shot-details-row">
          <span><strong>Type:</strong> ${escapeHtml(shot.type)}</span>
          <span><strong>Move:</strong> ${escapeHtml(shot.movement)}</span>
        </div>
        <input type="text" class="input-text shot-desc-input" value="${escapeHtml(shot.desc)}" placeholder="Shot action notes..." />
      `;

      const descInput = card.querySelector('.shot-desc-input');
      if (descInput) {
        descInput.addEventListener('change', (e) => {
          window.FPS_STATE.updateShot(shot.id, { desc: e.target.value });
        });
      }

      const delBtn = card.querySelector('.btn-shot-del');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          window.FPS_STATE.deleteShot(shot.id);
        });
      }

      container.appendChild(card);
    });
  }

  // --- 7. SCENE NOTES & SUMMARY ---
  function updateSceneNotes() {
    const scene = window.FPS_STATE.getCurrentScene();
    if (!scene) return;

    const metaNum = document.getElementById('scene-meta-number');
    const metaName = document.getElementById('scene-meta-name');
    const metaEnv = document.getElementById('scene-meta-env');
    const metaTime = document.getElementById('scene-meta-time');
    const metaLoc = document.getElementById('scene-meta-location');
    const metaNotes = document.getElementById('scene-director-notes');

    if (metaNum) metaNum.value = scene.number || '1';
    if (metaName) metaName.value = scene.name || 'Scene';
    if (metaEnv) metaEnv.value = scene.env || 'INT.';
    if (metaTime) metaTime.value = scene.time || 'DAY';
    if (metaLoc) metaLoc.value = scene.location || 'SET';
    if (metaNotes) metaNotes.value = scene.notes || '';

    // Update Slugline Banner in Topbar
    const slugEnv = document.getElementById('slug-env');
    const slugLoc = document.getElementById('slug-location');
    const slugTime = document.getElementById('slug-time');
    if (slugEnv) slugEnv.textContent = scene.env || 'INT.';
    if (slugLoc) slugLoc.textContent = scene.location || 'SET';
    if (slugTime) slugTime.textContent = scene.time || 'DAY';

    // Update Summary Stats
    const objects = scene.objects || [];
    let actors = 0, cameras = 0, lights = 0, props = 0, vehicles = 0, drawings = 0;
    objects.forEach(o => {
      if (o.category === 'actor') actors++;
      else if (o.category === 'camera') cameras++;
      else if (o.category === 'lighting') lights++;
      else if (o.category === 'prop') props++;
      else if (o.category === 'vehicle') vehicles++;
      else if (o.category === 'drawing') drawings++;
    });

    const statActors = document.getElementById('stat-actors');
    const statCams = document.getElementById('stat-cameras');
    const statLights = document.getElementById('stat-lights');
    const statProps = document.getElementById('stat-props');
    const statVehicles = document.getElementById('stat-vehicles');
    const statDrawings = document.getElementById('stat-drawings');

    if (statActors) statActors.textContent = actors;
    if (statCams) statCams.textContent = cameras;
    if (statLights) statLights.textContent = lights;
    if (statProps) statProps.textContent = props;
    if (statVehicles) statVehicles.textContent = vehicles;
    if (statDrawings) statDrawings.textContent = drawings;
  }

  function updateTopBarScene() {
    const scene = window.FPS_STATE.getCurrentScene();
    const proj = window.FPS_STATE.getProject();
    if (!scene || !proj) return;

    const projInput = document.getElementById('project-title-input');
    if (projInput) projInput.value = proj.title || 'Untitled Film Project';

    const badge = document.getElementById('current-scene-badge');
    const nameLabel = document.getElementById('top-scene-name');
    if (badge) badge.textContent = `SCENE ${scene.number || '1'}`;
    if (nameLabel) nameLabel.textContent = scene.name || 'Scene';
  }

  function renderScenesDropdown() {
    const container = document.getElementById('scenes-list-container');
    if (!container) return;

    const proj = window.FPS_STATE.getProject();
    const currentScene = window.FPS_STATE.getCurrentScene();
    container.innerHTML = '';

    proj.scenes.forEach(s => {
      const li = document.createElement('li');
      li.className = `dropdown-item ${s.id === currentScene.id ? 'active' : ''}`;
      li.innerHTML = `
        <span class="scene-badge" style="margin-right: 6px;">SCENE ${s.number}</span>
        <span style="flex: 1;">${escapeHtml(s.name)}</span>
        <span style="color: var(--text-muted); font-size: 10px;">${s.env} ${s.time}</span>
      `;
      li.addEventListener('click', () => {
        window.FPS_STATE.switchScene(s.id);
        const dropdown = document.getElementById('scenes-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
      });
      container.appendChild(li);
    });
  }

  // --- 8. FLOATING CANVAS LEGEND ---
  function updateLegend() {
    const content = document.getElementById('legend-content');
    if (!content) return;

    const objects = window.FPS_STATE.getObjects();
    const uniqueItems = new Map();

    objects.forEach(o => {
      const key = `${o.category}_${o.name}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, o);
      }
    });

    content.innerHTML = '';
    if (uniqueItems.size === 0) {
      content.innerHTML = `<span style="color: var(--text-muted); font-size: 10px;">Scene is empty</span>`;
      return;
    }

    uniqueItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      const emoji = getCategoryEmoji(item.category, item.propType || item.subType);
      row.innerHTML = `
        <span class="legend-symbol">${emoji}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.name)}</span>
      `;
      content.appendChild(row);
    });
  }

  // --- 9. ASSET MODAL & SEARCH ---
  function bindModals() {
    const assetModal = document.getElementById('asset-modal');
    const btnCloseAsset = document.getElementById('btn-close-asset-modal');
    const btnDoneAsset = document.getElementById('btn-modal-done');
    const searchInput = document.getElementById('asset-search-input');
    const clearSearch = document.getElementById('btn-clear-search');

    if (btnCloseAsset && assetModal) btnCloseAsset.addEventListener('click', () => assetModal.classList.add('hidden'));
    if (btnDoneAsset && assetModal) btnDoneAsset.addEventListener('click', () => assetModal.classList.add('hidden'));

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (clearSearch) clearSearch.classList.toggle('hidden', query.length === 0);
        renderAssetGrid(query);
      });
    }

    if (clearSearch && searchInput) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.classList.add('hidden');
        renderAssetGrid('');
      });
    }

    // Help modal close
    const helpModal = document.getElementById('help-modal');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const btnHelpOk = document.getElementById('btn-help-ok');

    if (btnCloseHelp && helpModal) btnCloseHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
    if (btnHelpOk && helpModal) btnHelpOk.addEventListener('click', () => helpModal.classList.add('hidden'));
  }

  function openAssetModal(category) {
    activeModalCategory = category || 'props';
    const modal = document.getElementById('asset-modal');
    const title = document.getElementById('asset-modal-title');
    const searchInput = document.getElementById('asset-search-input');
    if (searchInput) searchInput.value = '';

    const titles = {
      actors: 'Actors Library',
      cameras: 'Camera & Lens Library',
      lighting: 'Lighting Fixtures Library',
      props: 'Props & Set Dressing Library',
      vehicles: 'Vehicles Library'
    };
    if (title) title.textContent = titles[category] || 'Asset Library';

    renderCategoryTabs();
    renderAssetGrid('');

    if (modal) modal.classList.remove('hidden');
  }

  function renderCategoryTabs() {
    const bar = document.getElementById('asset-category-tabs');
    if (!bar) return;
    bar.innerHTML = '';

    const tabs = [
      { id: 'actors', label: 'Actors' },
      { id: 'cameras', label: 'Cameras' },
      { id: 'lighting', label: 'Lighting' },
      { id: 'props', label: 'Props' },
      { id: 'vehicles', label: 'Vehicles' },
      { id: 'my_assets', label: 'My Assets' }
    ];

    tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.className = `asset-tab ${t.id === activeModalCategory ? 'active' : ''}`;
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        activeModalCategory = t.id;
        renderCategoryTabs();
        renderAssetGrid('');
      });
      bar.appendChild(btn);
    });
  }

  function renderAssetGrid(query) {
    const grid = document.getElementById('asset-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let items = [];
    if (activeModalCategory === 'my_assets') {
      items = window.FPS_STATE.getMyAssets();
    } else {
      items = window.FPS_DATA.CATALOG[activeModalCategory] || [];
    }

    if (query) {
      items = items.filter(item => item.name.toLowerCase().includes(query));
    }

    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">No assets found matching "${escapeHtml(query)}"</div>`;
      return;
    }

    items.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      const emoji = getCategoryEmoji(asset.category, asset.propType || asset.subType);

      card.innerHTML = `
        <div class="asset-preview">
          <span style="font-size: 28px;">${emoji}</span>
        </div>
        <span class="asset-title" title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</span>
      `;

      card.addEventListener('click', () => {
        // Place asset at center of current view
        const rect = document.getElementById('scene-svg').getBoundingClientRect();
        const world = window.FPS_CANVAS.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);

        const newObj = Object.assign({}, asset, {
          x: Math.round(world.x),
          y: Math.round(world.y)
        });
        delete newObj.id; // Allow state to generate unique ID

        window.FPS_STATE.addObject(newObj);
        document.getElementById('asset-modal').classList.add('hidden');
      });

      grid.appendChild(card);
    });
  }

  // --- 10. CONTEXT MENU (RIGHT CLICK) ---
  function bindContextMenu() {
    const svgEl = document.getElementById('scene-svg');
    const menu = document.getElementById('context-menu');
    if (!svgEl || !menu) return;

    svgEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const objEl = e.target.closest('.fps-scene-object');
      if (objEl) {
        const id = objEl.getAttribute('data-id');
        if (!window.FPS_STATE.isSelected(id)) {
          window.FPS_STATE.selectObject(id);
        }
      }

      const selected = window.FPS_STATE.getSelectedObjects();
      if (selected.length === 0) {
        menu.classList.add('hidden');
        return;
      }

      document.getElementById('ctx-obj-name').textContent = selected.length === 1 ? selected[0].name : `${selected.length} Objects`;
      
      menu.style.left = `${Math.min(window.innerWidth - 220, e.clientX)}px`;
      menu.style.top = `${Math.min(window.innerHeight - 340, e.clientY)}px`;
      menu.classList.remove('hidden');
    });

    document.getElementById('ctx-duplicate').addEventListener('click', () => window.FPS_STATE.duplicateSelected());
    
    const ctxAddTimeline = document.getElementById('ctx-add-timeline');
    if (ctxAddTimeline) {
      ctxAddTimeline.addEventListener('click', () => {
        menu.classList.add('hidden');
        const sel = window.FPS_STATE.getSelectedObjects();
        if (window.FPS_TIMELINE) {
          window.FPS_TIMELINE.addSelectedToTimeline(sel);
        }
      });
    }

    document.getElementById('ctx-delete').addEventListener('click', () => window.FPS_STATE.deleteSelected());
    document.getElementById('ctx-front').addEventListener('click', () => reorderSelected('front'));
    document.getElementById('ctx-forward').addEventListener('click', () => reorderSelected('forward'));
    document.getElementById('ctx-backward').addEventListener('click', () => reorderSelected('backward'));
    document.getElementById('ctx-back').addEventListener('click', () => reorderSelected('back'));
    document.getElementById('ctx-group').addEventListener('click', () => window.FPS_STATE.groupSelected());
    document.getElementById('ctx-lock').addEventListener('click', () => {
      const sel = window.FPS_STATE.getSelectedObjects();
      sel.forEach(o => window.FPS_STATE.toggleLock(o.id));
    });
    document.getElementById('ctx-hide').addEventListener('click', () => {
      const sel = window.FPS_STATE.getSelectedObjects();
      sel.forEach(o => window.FPS_STATE.toggleVisibility(o.id));
    });
  }

  // --- 11. EXPORT & PRINT ENGINE ---
  function exportImage(type = 'png') {
    const svg = document.getElementById('scene-svg');
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function() {
      canvas.width = svg.clientWidth * 2; // 2x high resolution
      canvas.height = svg.clientHeight * 2;
      ctx.fillStyle = document.body.classList.contains('theme-light') ? '#f8fafc' : '#12151e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png';
      const a = document.createElement('a');
      a.download = `FramePlan_${window.FPS_STATE.getCurrentScene().name.replace(/\s+/g, '_')}.${type === 'jpeg' ? 'jpg' : 'png'}`;
      a.href = canvas.toDataURL(mime, 0.95);
      a.click();
    };
    img.src = url;
  }

  function exportSvg() {
    const svg = document.getElementById('scene-svg');
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `FramePlan_${window.FPS_STATE.getCurrentScene().name.replace(/\s+/g, '_')}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
  }

  function exportJsonFile() {
    const jsonStr = window.FPS_STATE.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `${window.FPS_STATE.getProject().title.replace(/\s+/g, '_')}_project.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  }

  function handleJsonFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = window.FPS_STATE.importJSON(event.target.result);
      if (success) {
        alert('Project imported successfully!');
      } else {
        alert('Failed to import project JSON. Invalid format.');
      }
    };
    reader.readAsText(file);
  }

  function handleFloorplanUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      window.FPS_STATE.addObject({
        category: 'floorplan',
        name: 'Floorplan ' + file.name,
        imageUrl: event.target.result,
        x: 500,
        y: 400,
        width: 800,
        height: 600,
        opacity: 0.65,
        locked: true
      });
    };
    reader.readAsDataURL(file);
  }

  function printScene() {
    const scene = window.FPS_STATE.getCurrentScene();
    const proj = window.FPS_STATE.getProject();
    if (!scene) return;

    // Fill print sheet
    document.getElementById('print-project-name').textContent = proj.title;
    document.getElementById('print-date').textContent = new Date().toLocaleDateString();
    document.getElementById('print-scene-heading').textContent = `SCENE ${scene.number} — ${scene.env} ${scene.location} - ${scene.time}`;
    document.getElementById('print-notes-text').textContent = scene.notes || 'No director blocking notes recorded.';

    // Copy SVG elements into print SVG
    const printSvg = document.getElementById('print-diagram-svg');
    const mainSvg = document.getElementById('scene-svg');
    if (printSvg && mainSvg) {
      printSvg.innerHTML = mainSvg.innerHTML;
    }

    // Populate Print Legend
    const legendBody = document.getElementById('print-legend-body');
    if (legendBody) {
      const objects = scene.objects || [];
      const lines = objects.map(o => `<div><strong>${escapeHtml(o.name)}</strong> (${o.category})</div>`).join('');
      legendBody.innerHTML = lines || 'No objects';
    }

    // Populate Print Shot List
    const tbody = document.getElementById('print-shotlist-tbody');
    if (tbody) {
      tbody.innerHTML = (scene.shots || []).map(s => `
        <tr>
          <td><strong>${s.number}</strong></td>
          <td>${escapeHtml(s.camera)}</td>
          <td>${escapeHtml(s.type)}</td>
          <td>${escapeHtml(s.focal)}</td>
          <td>${escapeHtml(s.movement)}</td>
          <td>${escapeHtml(s.desc)}</td>
        </tr>
      `).join('');
    }

    window.print();
  }

  function toggleTheme() {
    const isLight = document.body.classList.toggle('theme-light');
    document.body.classList.toggle('theme-dark', !isLight);
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if (sun && moon) {
      sun.classList.toggle('hidden', isLight);
      moon.classList.toggle('hidden', !isLight);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  // --- 12. STATE SUBSCRIBER ---
  function bindStateEvents() {
    window.FPS_STATE.subscribe((type, detail) => {
      window.FPS_CANVAS.renderScene();
      updateInspector();
      updateLayersList();
      updateTopBarScene();
      updateSceneNotes();
      updateLegend();

      // Undo / Redo button states
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      if (btnUndo) btnUndo.disabled = !window.FPS_STATE.canUndo();
      if (btnRedo) btnRedo.disabled = !window.FPS_STATE.canRedo();

      if (type === 'shot_updated') {
        updateShotList();
      }
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  return {
    init: init,
    updateInspector: updateInspector,
    updateLayersList: updateLayersList,
    updateShotList: updateShotList,
    updateSceneNotes: updateSceneNotes,
    openAssetModal: openAssetModal
  };
})();
