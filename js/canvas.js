/**
 * FramePlan Studio — Canvas Engine
 * Infinite viewport, pan/zoom, coordinate transformation, grid snapping,
 * object rendering, transformer bounding box, and interactive tools.
 */

window.FPS_CANVAS = (function() {
  'use strict';

  // Viewport State
  let panX = 100;
  let panY = 100;
  let zoom = 1.0;
  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 4.0;
  const GRID_SIZE = 40; // 40px = 1.0 meter

  // Canvas DOM references
  let viewportEl = null;
  let svgEl = null;
  let worldLayer = null;
  let transformerGroup = null;
  let transformBounds = null;
  let marqueeRect = null;
  let drawPreviewGroup = null;
  let cursorHud = null;

  // Active Tool & Interaction State
  let activeTool = 'select'; // 'select', 'pan', 'draw', 'shapes', 'blocking', 'text', 'eraser', 'measure'
  let drawConfig = {
    type: 'pencil', // 'pencil', 'brush', 'highlighter', 'line', 'arrow', 'rect', 'circle', 'wall', 'door', 'window'
    color: '#3b82f6',
    strokeWidth: 3,
    opacity: 1,
    fill: false,
    fillColor: '#3b82f6'
  };

  let isInteracting = false;
  let interactionMode = null; // 'pan', 'move', 'resize', 'rotate', 'marquee', 'draw', 'measure', 'blocking'
  let startPointer = { x: 0, y: 0 };
  let currentPointer = { x: 0, y: 0 };
  let startWorld = { x: 0, y: 0 };
  let activeHandle = null;
  let initialObjectStates = [];
  let currentDrawingPoints = [];
  let blockingPoints = [];
  let snapEnabled = true;

  function init() {
    viewportEl = document.getElementById('canvas-viewport');
    svgEl = document.getElementById('scene-svg');
    worldLayer = document.getElementById('world-layer');
    transformerGroup = document.getElementById('transformer-group');
    transformBounds = document.getElementById('transform-bounds');
    marqueeRect = document.getElementById('marquee-rect');
    drawPreviewGroup = document.getElementById('draw-preview-group');
    cursorHud = document.getElementById('cursor-hud');

    setupEventListeners();
    applyViewportTransform();

    // Center viewport initially
    fitToScreen();
  }

  function setTool(toolName) {
    activeTool = toolName;
    viewportEl.classList.remove('panning', 'drawing', 'erasing');
    if (toolName === 'pan') {
      viewportEl.classList.add('panning');
    } else if (toolName === 'draw' || toolName === 'shapes') {
      viewportEl.classList.add('drawing');
    } else if (toolName === 'eraser') {
      viewportEl.classList.add('erasing');
    }

    // Cancel pending blocking points if switched away
    if (toolName !== 'blocking') {
      blockingPoints = [];
      clearDrawPreview();
    }
  }

  function setDrawConfig(newConfig) {
    Object.assign(drawConfig, newConfig);
  }

  function setSnapEnabled(val) {
    snapEnabled = val;
  }

  // --- COORDINATE CONVERSION ---
  function screenToWorld(clientX, clientY) {
    const rect = svgEl.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const wx = (sx - panX) / zoom;
    const wy = (sy - panY) / zoom;
    return { x: wx, y: wy };
  }

  function worldToScreen(worldX, worldY) {
    const sx = (worldX * zoom) + panX;
    const sy = (worldY * zoom) + panY;
    return { x: sx, y: sy };
  }

  function snap(val) {
    if (!snapEnabled) return val;
    return Math.round(val / (GRID_SIZE / 2)) * (GRID_SIZE / 2);
  }

  function applyViewportTransform() {
    worldLayer.setAttribute('transform', `matrix(${zoom} 0 0 ${zoom} ${panX} ${panY})`);
    
    // Update Zoom percentage in HUD
    const zoomPctEl = document.getElementById('zoom-percentage');
    if (zoomPctEl) {
      zoomPctEl.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  // --- ZOOM & PAN CONTROLS ---
  function zoomAt(factor, clientX, clientY) {
    const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (targetZoom === zoom) return;

    const rect = svgEl.getBoundingClientRect();
    const mouseX = clientX !== undefined ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = clientY !== undefined ? (clientY - rect.top) : (rect.height / 2);

    // Keep world coordinate under cursor invariant
    const wx = (mouseX - panX) / zoom;
    const wy = (mouseY - panY) / zoom;

    zoom = targetZoom;
    panX = mouseX - (wx * zoom);
    panY = mouseY - (wy * zoom);

    applyViewportTransform();
  }

  function zoomIn() {
    zoomAt(1.25);
  }

  function zoomOut() {
    zoomAt(0.8);
  }

  function resetZoom() {
    const rect = svgEl.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const wx = (cx - panX) / zoom;
    const wy = (cy - panY) / zoom;
    zoom = 1.0;
    panX = cx - (wx * zoom);
    panY = cy - (wy * zoom);
    applyViewportTransform();
  }

  function fitToScreen() {
    const objects = window.FPS_STATE.getObjects();
    if (!objects || objects.length === 0) {
      panX = 100;
      panY = 100;
      zoom = 1.0;
      applyViewportTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(o => {
      const halfW = (o.width || 60) / 2;
      const halfH = (o.height || 60) / 2;
      minX = Math.min(minX, o.x - halfW);
      minY = Math.min(minY, o.y - halfH);
      maxX = Math.max(maxX, o.x + halfW);
      maxY = Math.max(maxY, o.y + halfH);
    });

    const rect = svgEl.getBoundingClientRect();
    const contentW = (maxX - minX) + 160;
    const contentH = (maxY - minY) + 160;
    const contentCx = (minX + maxX) / 2;
    const contentCy = (minY + maxY) / 2;

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    zoom = Math.min(1.5, Math.max(0.3, Math.min(scaleX, scaleY)));

    panX = (rect.width / 2) - (contentCx * zoom);
    panY = (rect.height / 2) - (contentCy * zoom);

    applyViewportTransform();
  }

  // --- SCENE RENDERING ---
  function renderScene() {
    const objects = window.FPS_STATE.getObjects();
    
    // Group references
    const gFloorplans = document.getElementById('layer-floorplans');
    const gDrawings = document.getElementById('layer-drawings');
    const gProps = document.getElementById('layer-props');
    const gVehicles = document.getElementById('layer-vehicles');
    const gLighting = document.getElementById('layer-lighting');
    const gCameras = document.getElementById('layer-cameras');
    const gActors = document.getElementById('layer-actors');
    const gBlocking = document.getElementById('layer-blocking');
    const gText = document.getElementById('layer-text');
    const gMeasurements = document.getElementById('layer-measurements');

    // Clear all layer children
    [gFloorplans, gDrawings, gProps, gVehicles, gLighting, gCameras, gActors, gBlocking, gText, gMeasurements].forEach(g => {
      if (g) g.innerHTML = '';
    });

    // Render each object
    objects.forEach(obj => {
      if (obj.visible === false) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'fps-scene-object');
      g.setAttribute('data-id', obj.id);
      g.setAttribute('transform', `translate(${obj.x}, ${obj.y}) rotate(${obj.rotation || 0}) scale(${obj.scale || 1})`);
      if (obj.opacity !== undefined) {
        g.setAttribute('opacity', obj.opacity);
      }

      // Generate SVG markup from shape dictionary
      let html = '';
      if (obj.category === 'actor') {
        html = window.FPS_DATA.SVG_SHAPES.actor(obj);
        gActors.appendChild(g);
      } else if (obj.category === 'camera') {
        html = window.FPS_DATA.SVG_SHAPES.camera(obj);
        gCameras.appendChild(g);
      } else if (obj.category === 'lighting') {
        html = window.FPS_DATA.SVG_SHAPES.lighting(obj);
        gLighting.appendChild(g);
      } else if (obj.category === 'prop') {
        html = window.FPS_DATA.SVG_SHAPES.prop(obj);
        gProps.appendChild(g);
      } else if (obj.category === 'vehicle') {
        html = window.FPS_DATA.SVG_SHAPES.vehicle(obj);
        gVehicles.appendChild(g);
      } else if (obj.category === 'blocking') {
        html = window.FPS_DATA.SVG_SHAPES.blockingPath(obj);
        gBlocking.appendChild(g);
      } else if (obj.category === 'text') {
        html = window.FPS_DATA.SVG_SHAPES.text(obj);
        gText.appendChild(g);
      } else if (obj.category === 'measurement') {
        html = window.FPS_DATA.SVG_SHAPES.measurement(obj);
        gMeasurements.appendChild(g);
      } else if (obj.category === 'drawing') {
        html = renderDrawingObject(obj);
        gDrawings.appendChild(g);
      } else if (obj.category === 'floorplan') {
        html = renderFloorplanObject(obj);
        gFloorplans.appendChild(g);
      }

      g.innerHTML = html;
    });

    updateTransformer();
  }

  function renderDrawingObject(obj) {
    const color = obj.strokeColor || obj.color || '#3b82f6';
    const fill = obj.fill ? (obj.fillColor || color) : 'none';
    const strokeWidth = obj.strokeWidth || 3;
    const strokeStyle = obj.strokeStyle === 'dashed' ? 'stroke-dasharray="6 4"' : (obj.strokeStyle === 'dotted' ? 'stroke-dasharray="2 4"' : '');

    if (obj.drawType === 'rect') {
      const w = obj.width || 80;
      const h = obj.height || 60;
      return `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" ${strokeStyle} />`;
    } else if (obj.drawType === 'circle') {
      const r = (obj.width || 60) / 2;
      return `<circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" ${strokeStyle} />`;
    } else if (obj.drawType === 'line' || obj.drawType === 'arrow') {
      const p1 = obj.p1 || {x: -40, y: 0};
      const p2 = obj.p2 || {x: 40, y: 0};
      const marker = obj.drawType === 'arrow' ? 'marker-end="url(#arrow-general)"' : '';
      return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" ${marker} ${strokeStyle} />`;
    } else if (obj.points && obj.points.length > 1) {
      // Freehand smoothed polyline/path
      let d = `M ${obj.points[0].x} ${obj.points[0].y}`;
      for (let i = 1; i < obj.points.length; i++) {
        d += ` L ${obj.points[i].x} ${obj.points[i].y}`;
      }
      return `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${strokeStyle} />`;
    }
    return '';
  }

  function renderFloorplanObject(obj) {
    const w = obj.width || 800;
    const h = obj.height || 600;
    return `
      <image href="${obj.imageUrl}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" opacity="${obj.opacity || 0.6}" preserveAspectRatio="none" />
    `;
  }

  // --- TRANSFORMER BOUNDING BOX ---
  function updateTransformer() {
    const selected = window.FPS_STATE.getSelectedObjects();

    if (selected.length === 0) {
      transformerGroup.classList.add('hidden');
      return;
    }

    transformerGroup.classList.remove('hidden');

    if (selected.length === 1) {
      const obj = selected[0];
      const w = (obj.width || 60) * (obj.scale || 1);
      const h = (obj.height || 60) * (obj.scale || 1);
      const rot = obj.rotation || 0;

      transformerGroup.setAttribute('transform', `translate(${obj.x}, ${obj.y}) rotate(${rot})`);
      transformBounds.setAttribute('x', -w / 2);
      transformBounds.setAttribute('y', -h / 2);
      transformBounds.setAttribute('width', w);
      transformBounds.setAttribute('height', h);

      // Handle positions
      document.getElementById('handle-nw').setAttribute('cx', -w / 2);
      document.getElementById('handle-nw').setAttribute('cy', -h / 2);
      document.getElementById('handle-ne').setAttribute('cx', w / 2);
      document.getElementById('handle-ne').setAttribute('cy', -h / 2);
      document.getElementById('handle-se').setAttribute('cx', w / 2);
      document.getElementById('handle-se').setAttribute('cy', h / 2);
      document.getElementById('handle-sw').setAttribute('cx', -w / 2);
      document.getElementById('handle-sw').setAttribute('cy', h / 2);

      document.getElementById('handle-n').setAttribute('cx', 0);
      document.getElementById('handle-n').setAttribute('cy', -h / 2);
      document.getElementById('handle-s').setAttribute('cx', 0);
      document.getElementById('handle-s').setAttribute('cy', h / 2);
      document.getElementById('handle-w').setAttribute('cx', -w / 2);
      document.getElementById('handle-w').setAttribute('cy', 0);
      document.getElementById('handle-e').setAttribute('cx', w / 2);
      document.getElementById('handle-e').setAttribute('cy', 0);

      const rotY = (-h / 2) - 24;
      document.getElementById('rot-stem').setAttribute('x1', 0);
      document.getElementById('rot-stem').setAttribute('y1', -h / 2);
      document.getElementById('rot-stem').setAttribute('x2', 0);
      document.getElementById('rot-stem').setAttribute('y2', rotY);
      document.getElementById('handle-rotate').setAttribute('cx', 0);
      document.getElementById('handle-rotate').setAttribute('cy', rotY);

      // Info Tag
      const labelText = document.getElementById('transform-label-text');
      const labelBg = document.getElementById('transform-label-bg');
      if (labelText && labelBg) {
        labelText.textContent = obj.name;
        const textWidth = Math.max(70, obj.name.length * 7 + 16);
        labelBg.setAttribute('x', -textWidth / 2);
        labelBg.setAttribute('y', (-h / 2) - 48);
        labelBg.setAttribute('width', textWidth);
        labelText.setAttribute('x', 0);
        labelText.setAttribute('y', (-h / 2) - 34);
      }

    } else {
      // Multiple selection bounds (axis-aligned bounding box)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selected.forEach(o => {
        const halfW = (o.width || 60) / 2;
        const halfH = (o.height || 60) / 2;
        minX = Math.min(minX, o.x - halfW);
        minY = Math.min(minY, o.y - halfH);
        maxX = Math.max(maxX, o.x + halfW);
        maxY = Math.max(maxY, o.y + halfH);
      });

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const w = maxX - minX;
      const h = maxY - minY;

      transformerGroup.setAttribute('transform', `translate(${cx}, ${cy}) rotate(0)`);
      transformBounds.setAttribute('x', -w / 2);
      transformBounds.setAttribute('y', -h / 2);
      transformBounds.setAttribute('width', w);
      transformBounds.setAttribute('height', h);

      // Corner handles
      document.getElementById('handle-nw').setAttribute('cx', -w / 2);
      document.getElementById('handle-nw').setAttribute('cy', -h / 2);
      document.getElementById('handle-ne').setAttribute('cx', w / 2);
      document.getElementById('handle-ne').setAttribute('cy', -h / 2);
      document.getElementById('handle-se').setAttribute('cx', w / 2);
      document.getElementById('handle-se').setAttribute('cy', h / 2);
      document.getElementById('handle-sw').setAttribute('cx', -w / 2);
      document.getElementById('handle-sw').setAttribute('cy', h / 2);

      // Edges
      document.getElementById('handle-n').setAttribute('cx', 0);
      document.getElementById('handle-n').setAttribute('cy', -h / 2);
      document.getElementById('handle-s').setAttribute('cx', 0);
      document.getElementById('handle-s').setAttribute('cy', h / 2);
      document.getElementById('handle-w').setAttribute('cx', -w / 2);
      document.getElementById('handle-w').setAttribute('cy', 0);
      document.getElementById('handle-e').setAttribute('cx', w / 2);
      document.getElementById('handle-e').setAttribute('cy', 0);

      const rotY = (-h / 2) - 24;
      document.getElementById('rot-stem').setAttribute('x1', 0);
      document.getElementById('rot-stem').setAttribute('y1', -h / 2);
      document.getElementById('rot-stem').setAttribute('x2', 0);
      document.getElementById('rot-stem').setAttribute('y2', rotY);
      document.getElementById('handle-rotate').setAttribute('cx', 0);
      document.getElementById('handle-rotate').setAttribute('cy', rotY);

      const labelText = document.getElementById('transform-label-text');
      const labelBg = document.getElementById('transform-label-bg');
      if (labelText && labelBg) {
        labelText.textContent = `${selected.length} Objects Selected`;
        labelBg.setAttribute('x', -60);
        labelBg.setAttribute('y', (-h / 2) - 48);
        labelBg.setAttribute('width', 120);
        labelText.setAttribute('x', 0);
        labelText.setAttribute('y', (-h / 2) - 34);
      }
    }
  }

  // --- POINTER / MOUSE EVENT HANDLERS ---
  function setupEventListeners() {
    viewportEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    viewportEl.addEventListener('wheel', onWheel, { passive: false });

    // Keyboard Shortcuts for Canvas (Space to pan, V to select, etc.)
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  let isSpacePressed = false;

  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' && !isSpacePressed) {
      isSpacePressed = true;
      viewportEl.classList.add('panning');
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      isSpacePressed = false;
      if (activeTool !== 'pan') {
        viewportEl.classList.remove('panning');
      }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Pinch / Ctrl + Wheel zoom
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(factor, e.clientX, e.clientY);
    } else {
      // Two-finger trackpad or wheel pan
      panX -= e.deltaX;
      panY -= e.deltaY;
      applyViewportTransform();
    }
  }

  function onPointerDown(e) {
    // Only primary mouse button or middle click
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      // Panning
      isInteracting = true;
      interactionMode = 'pan';
      startPointer = { x: e.clientX, y: e.clientY };
      viewportEl.classList.add('panning');
      return;
    }

    if (e.button !== 0) return; // Right click handled by contextmenu

    const world = screenToWorld(e.clientX, e.clientY);
    startPointer = { x: e.clientX, y: e.clientY };
    startWorld = { x: world.x, y: world.y };

    // Check if clicked on a transform handle
    if (e.target.classList.contains('transform-handle')) {
      const handleType = e.target.getAttribute('data-handle');
      isInteracting = true;
      activeHandle = handleType;
      interactionMode = (handleType === 'rot') ? 'rotate' : 'resize';
      snapshotObjectsForTransform();
      return;
    }

    // Check if clicked on an object
    const objEl = e.target.closest('.fps-scene-object');
    if (objEl) {
      const objId = objEl.getAttribute('data-id');
      const obj = window.FPS_STATE.getObjectById(objId);

      if (activeTool === 'eraser') {
        // Erase object
        window.FPS_STATE.selectObject(objId);
        window.FPS_STATE.deleteSelected();
        return;
      }

      if (obj && !obj.locked) {
        if (e.shiftKey) {
          window.FPS_STATE.toggleSelect(objId);
        } else if (!window.FPS_STATE.isSelected(objId)) {
          window.FPS_STATE.selectObject(objId);
        }

        isInteracting = true;
        interactionMode = 'move';
        snapshotObjectsForTransform();
        return;
      }
    }

    // If clicked empty canvas
    if (activeTool === 'select') {
      if (!e.shiftKey) {
        window.FPS_STATE.deselectAll();
      }
      isInteracting = true;
      interactionMode = 'marquee';
      marqueeRect.setAttribute('x', world.x);
      marqueeRect.setAttribute('y', world.y);
      marqueeRect.setAttribute('width', 0);
      marqueeRect.setAttribute('height', 0);
      marqueeRect.classList.remove('hidden');
    } else if (activeTool === 'draw' || activeTool === 'shapes') {
      isInteracting = true;
      interactionMode = 'draw';
      currentDrawingPoints = [{ x: snap(world.x), y: snap(world.y) }];
      renderDrawPreview();
    } else if (activeTool === 'blocking') {
      // Blocking path: click points sequentially
      blockingPoints.push({ x: snap(world.x), y: snap(world.y) });
      if (blockingPoints.length >= 2) {
        // Complete blocking path
        window.FPS_STATE.addObject({
          category: 'blocking',
          name: 'Movement Path',
          label: 'Walks to mark',
          points: blockingPoints.slice(),
          color: '#3b82f6'
        });
        blockingPoints = [];
        clearDrawPreview();
      } else {
        renderDrawPreview();
      }
    } else if (activeTool === 'text') {
      // Place text note at cursor
      window.FPS_STATE.addObject({
        category: 'text',
        name: 'Label',
        content: 'NOTE',
        x: snap(world.x),
        y: snap(world.y),
        fontSize: 14,
        color: '#ffffff',
        showBadge: true
      });
      setTool('select');
    } else if (activeTool === 'measure') {
      isInteracting = true;
      interactionMode = 'measure';
      currentDrawingPoints = [{ x: world.x, y: world.y }, { x: world.x, y: world.y }];
      renderDrawPreview();
    }
  }

  function onPointerMove(e) {
    const world = screenToWorld(e.clientX, e.clientY);
    currentPointer = { x: e.clientX, y: e.clientY };

    // Update cursor HUD
    if (cursorHud) {
      cursorHud.textContent = `X: ${Math.round(world.x)}  Y: ${Math.round(world.y)}`;
    }

    if (!isInteracting) return;

    if (interactionMode === 'pan') {
      const dx = e.clientX - startPointer.x;
      const dy = e.clientY - startPointer.y;
      panX += dx;
      panY += dy;
      startPointer = { x: e.clientX, y: e.clientY };
      applyViewportTransform();
      return;
    }

    if (interactionMode === 'move') {
      const rawDx = world.x - startWorld.x;
      const rawDy = world.y - startWorld.y;
      const dx = snapEnabled ? snap(rawDx) : rawDx;
      const dy = snapEnabled ? snap(rawDy) : rawDy;

      initialObjectStates.forEach(item => {
        const obj = window.FPS_STATE.getObjectById(item.id);
        if (obj) {
          obj.x = item.x + dx;
          obj.y = item.y + dy;
        }
      });
      renderScene();
      return;
    }

    if (interactionMode === 'rotate') {
      const selected = window.FPS_STATE.getSelectedObjects();
      if (selected.length === 0) return;
      const center = selected.length === 1 ? { x: selected[0].x, y: selected[0].y } : getSelectionCenter();
      
      const angleRad = Math.atan2(world.y - center.y, world.x - center.x);
      let angleDeg = Math.round(angleRad * (180 / Math.PI)) + 90; // offset so top is 0
      if (e.shiftKey) {
        angleDeg = Math.round(angleDeg / 15) * 15; // 15 deg snap
      }

      selected.forEach(obj => {
        obj.rotation = angleDeg;
      });
      renderScene();
      return;
    }

    if (interactionMode === 'resize') {
      const selected = window.FPS_STATE.getSelectedObjects();
      if (selected.length !== 1) return;
      const obj = selected[0];
      const initial = initialObjectStates[0];
      if (!initial) return;

      const dx = world.x - startWorld.x;
      const dy = world.y - startWorld.y;

      let newW = initial.width;
      let newH = initial.height;

      if (activeHandle.includes('e')) newW = Math.max(20, initial.width + dx);
      if (activeHandle.includes('w')) newW = Math.max(20, initial.width - dx);
      if (activeHandle.includes('s')) newH = Math.max(20, initial.height + dy);
      if (activeHandle.includes('n')) newH = Math.max(20, initial.height - dy);

      obj.width = Math.round(newW);
      obj.height = Math.round(newH);
      renderScene();
      return;
    }

    if (interactionMode === 'marquee') {
      const x = Math.min(startWorld.x, world.x);
      const y = Math.min(startWorld.y, world.y);
      const w = Math.abs(world.x - startWorld.x);
      const h = Math.abs(world.y - startWorld.y);
      marqueeRect.setAttribute('x', x);
      marqueeRect.setAttribute('y', y);
      marqueeRect.setAttribute('width', w);
      marqueeRect.setAttribute('height', h);
      return;
    }

    if (interactionMode === 'draw') {
      if (drawConfig.type === 'pencil' || drawConfig.type === 'brush' || drawConfig.type === 'highlighter') {
        currentDrawingPoints.push({ x: world.x, y: world.y });
      } else {
        // Shapes preview (startWorld to current world)
        currentDrawingPoints = [{ x: startWorld.x, y: startWorld.y }, { x: snap(world.x), y: snap(world.y) }];
      }
      renderDrawPreview();
      return;
    }

    if (interactionMode === 'measure') {
      currentDrawingPoints[1] = { x: world.x, y: world.y };
      renderDrawPreview();
      return;
    }
  }

  function onPointerUp(e) {
    if (!isInteracting) return;

    if (interactionMode === 'pan') {
      isInteracting = false;
      interactionMode = null;
      if (activeTool !== 'pan') {
        viewportEl.classList.remove('panning');
      }
      return;
    }

    if (interactionMode === 'move') {
      window.FPS_STATE.pushHistory('Move Objects');
    } else if (interactionMode === 'rotate') {
      window.FPS_STATE.pushHistory('Rotate Objects');
    } else if (interactionMode === 'resize') {
      window.FPS_STATE.pushHistory('Resize Object');
    } else if (interactionMode === 'marquee') {
      marqueeRect.classList.add('hidden');
      const x = parseFloat(marqueeRect.getAttribute('x'));
      const y = parseFloat(marqueeRect.getAttribute('y'));
      const w = parseFloat(marqueeRect.getAttribute('width'));
      const h = parseFloat(marqueeRect.getAttribute('height'));

      if (w > 5 && h > 5) {
        const objects = window.FPS_STATE.getObjects();
        const hitIds = [];
        objects.forEach(o => {
          if (!o.locked && o.visible !== false) {
            if (o.x >= x && o.x <= x + w && o.y >= y && o.y <= y + h) {
              hitIds.push(o.id);
            }
          }
        });
        window.FPS_STATE.selectMultiple(hitIds);
      }
    } else if (interactionMode === 'draw') {
      commitDrawing();
    } else if (interactionMode === 'measure') {
      if (currentDrawingPoints.length >= 2) {
        const p1 = currentDrawingPoints[0];
        const p2 = currentDrawingPoints[1];
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 10) {
          window.FPS_STATE.addObject({
            category: 'measurement',
            name: 'Ruler',
            p1: p1,
            p2: p2,
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
          });
        }
      }
      clearDrawPreview();
      setTool('select');
    }

    isInteracting = false;
    interactionMode = null;
    activeHandle = null;
    initialObjectStates = [];
  }

  function snapshotObjectsForTransform() {
    initialObjectStates = window.FPS_STATE.getSelectedObjects().map(o => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width || 60,
      height: o.height || 60,
      rotation: o.rotation || 0,
      scale: o.scale || 1
    }));
  }

  function getSelectionCenter() {
    const selected = window.FPS_STATE.getSelectedObjects();
    if (selected.length === 0) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    selected.forEach(o => { sx += o.x; sy += o.y; });
    return { x: sx / selected.length, y: sy / selected.length };
  }

  function renderDrawPreview() {
    if (!drawPreviewGroup) return;

    if (activeTool === 'blocking' && blockingPoints.length > 0) {
      const pts = blockingPoints.map(p => `${p.x},${p.y}`).join(' ');
      drawPreviewGroup.innerHTML = `
        <polyline points="${pts}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2" />
        ${blockingPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6" />`).join('')}
      `;
      return;
    }

    if (interactionMode === 'measure' && currentDrawingPoints.length === 2) {
      const p1 = currentDrawingPoints[0];
      const p2 = currentDrawingPoints[1];
      const dist = (Math.hypot(p2.x - p1.x, p2.y - p1.y) / GRID_SIZE).toFixed(2);
      drawPreviewGroup.innerHTML = `
        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" />
        <circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#ef4444" />
        <circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#ef4444" />
        <text x="${(p1.x+p2.x)/2}" y="${(p1.y+p2.y)/2 - 8}" fill="#ffffff" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">
          ${dist}m
        </text>
      `;
      return;
    }

    if (currentDrawingPoints.length === 0) {
      drawPreviewGroup.innerHTML = '';
      return;
    }

    const type = drawConfig.type;
    const color = drawConfig.color || '#3b82f6';
    const strokeWidth = drawConfig.strokeWidth || 3;
    const opacity = drawConfig.opacity || 1;

    if (type === 'pencil' || type === 'brush' || type === 'highlighter') {
      const pts = currentDrawingPoints.map(p => `${p.x},${p.y}`).join(' ');
      const strokeW = type === 'highlighter' ? 14 : (type === 'brush' ? 8 : strokeWidth);
      const op = type === 'highlighter' ? 0.4 : opacity;
      drawPreviewGroup.innerHTML = `
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${strokeW}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round" />
      `;
    } else if (currentDrawingPoints.length >= 2) {
      const p1 = currentDrawingPoints[0];
      const p2 = currentDrawingPoints[1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);

      if (type === 'rect') {
        drawPreviewGroup.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(59,130,246,0.1)" stroke="${color}" stroke-width="${strokeWidth}" />`;
      } else if (type === 'circle') {
        const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        drawPreviewGroup.innerHTML = `<circle cx="${p1.x}" cy="${p1.y}" r="${r}" fill="rgba(59,130,246,0.1)" stroke="${color}" stroke-width="${strokeWidth}" />`;
      } else if (type === 'line' || type === 'arrow') {
        drawPreviewGroup.innerHTML = `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
      } else if (type === 'wall') {
        drawPreviewGroup.innerHTML = `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#1e293b" stroke-width="16" stroke-linecap="square" />`;
      }
    }
  }

  function clearDrawPreview() {
    if (drawPreviewGroup) drawPreviewGroup.innerHTML = '';
  }

  function commitDrawing() {
    if (currentDrawingPoints.length < 2) {
      clearDrawPreview();
      return;
    }

    const type = drawConfig.type;
    const color = drawConfig.color || '#3b82f6';
    const strokeWidth = drawConfig.strokeWidth || 3;

    if (type === 'pencil' || type === 'brush' || type === 'highlighter') {
      // Calculate center point of freehand stroke
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      currentDrawingPoints.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      // Relative points
      const relPoints = currentDrawingPoints.map(p => ({ x: p.x - cx, y: p.y - cy }));

      window.FPS_STATE.addObject({
        category: 'drawing',
        name: type === 'highlighter' ? 'Highlight' : 'Drawing',
        drawType: 'freehand',
        x: cx,
        y: cy,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        points: relPoints,
        strokeColor: color,
        strokeWidth: type === 'highlighter' ? 14 : (type === 'brush' ? 8 : strokeWidth),
        opacity: type === 'highlighter' ? 0.45 : (drawConfig.opacity || 1)
      });
    } else {
      const p1 = currentDrawingPoints[0];
      const p2 = currentDrawingPoints[1];
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      if (type === 'rect') {
        window.FPS_STATE.addObject({
          category: 'drawing',
          name: 'Rectangle',
          drawType: 'rect',
          x: cx,
          y: cy,
          width: Math.max(20, w),
          height: Math.max(20, h),
          strokeColor: color,
          strokeWidth: strokeWidth,
          fill: drawConfig.fill,
          fillColor: drawConfig.fillColor
        });
      } else if (type === 'circle') {
        const r = Math.max(15, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        window.FPS_STATE.addObject({
          category: 'drawing',
          name: 'Circle',
          drawType: 'circle',
          x: p1.x,
          y: p1.y,
          width: r * 2,
          height: r * 2,
          strokeColor: color,
          strokeWidth: strokeWidth,
          fill: drawConfig.fill,
          fillColor: drawConfig.fillColor
        });
      } else if (type === 'line' || type === 'arrow') {
        window.FPS_STATE.addObject({
          category: 'drawing',
          name: type === 'arrow' ? 'Arrow' : 'Line',
          drawType: type,
          x: cx,
          y: cy,
          width: Math.max(20, w),
          height: Math.max(20, h),
          p1: { x: p1.x - cx, y: p1.y - cy },
          p2: { x: p2.x - cx, y: p2.y - cy },
          strokeColor: color,
          strokeWidth: strokeWidth
        });
      } else if (type === 'wall') {
        const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        window.FPS_STATE.addObject({
          category: 'prop',
          propType: 'wall',
          name: 'Wall',
          x: cx,
          y: cy,
          width: Math.max(40, length),
          height: 16,
          rotation: Math.round(angle)
        });
      }
    }

    clearDrawPreview();
    currentDrawingPoints = [];
    setTool('select');
  }

  return {
    init: init,
    setTool: setTool,
    setDrawConfig: setDrawConfig,
    setSnapEnabled: setSnapEnabled,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    renderScene: renderScene,
    updateTransformer: updateTransformer,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    resetZoom: resetZoom,
    fitToScreen: fitToScreen,
    getPan: () => ({ x: panX, y: panY }),
    getZoom: () => zoom
  };
})();
