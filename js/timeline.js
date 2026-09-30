/**
 * FramePlan Studio — Scene Timeline & Shot Blocking Engine
 * Manages timeline playback (24fps), tracks, cues, scrubbing, resizing, and actor blocking cues.
 */

window.FPS_TIMELINE = (function() {
  'use strict';

  let isPlaying = false;
  let playStartTime = 0;
  let playStartCurrentTime = 0;
  let animFrameId = null;
  let zoomLevel = 1.0; // 1.0 = 24 pixels per second
  const BASE_PPS = 24; // Base Pixels Per Second

  let isDraggingPlayhead = false;
  let dragCueState = null; // { trackId, cueId, startX, initialStartTime, initialDuration, mode: 'move'|'resize' }

  function getPPS() {
    return Math.max(10, BASE_PPS * zoomLevel);
  }

  function init() {
    bindControls();
    bindRulerAndScrubber();
    bindLanes();

    // Listen to state changes
    if (window.FPS_STATE && window.FPS_STATE.subscribe) {
      window.FPS_STATE.subscribe('timeline_updated', () => render());
      window.FPS_STATE.subscribe('scene_change', () => render());
      window.FPS_STATE.subscribe('project_update', () => render());
      window.FPS_STATE.subscribe('init', () => render());
      window.FPS_STATE.subscribe('object_created', (data) => {
        // If an actor is created and timeline is open, we can refresh track headers if needed
        render();
      });
      window.FPS_STATE.subscribe('selection_change', (data) => {
        updateAddSelectedButton(data.selectedIds);
      });
    }

    render();
  }

  function bindControls() {
    // Timeline toggle button (Header / Top bar)
    const btnTopToggle = document.getElementById('btn-toggle-timeline');
    if (btnTopToggle) {
      btnTopToggle.addEventListener('click', () => {
        toggleTimeline();
      });
    }

    // Timeline close / minimize button inside dock
    const btnClose = document.getElementById('btn-tl-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        closeTimeline();
      });
    }

    // Timeline expand / collapse body toggle
    const btnExpand = document.getElementById('btn-timeline-toggle');
    const dock = document.getElementById('timeline-dock');
    if (btnExpand && dock) {
      btnExpand.addEventListener('click', () => {
        dock.classList.toggle('collapsed');
        btnExpand.classList.toggle('collapsed');
      });
    }

    // Play / Pause transport button
    const btnPlay = document.getElementById('btn-tl-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        togglePlay();
      });
    }

    // Stop / Rewind
    const btnStop = document.getElementById('btn-tl-stop');
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        pause();
        window.FPS_STATE.setTimelineTime(0);
        render();
      });
    }

    // Prev / Next cue jumps
    const btnPrev = document.getElementById('btn-tl-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        jumpToAdjacentCue(-1);
      });
    }

    const btnNext = document.getElementById('btn-tl-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        jumpToAdjacentCue(1);
      });
    }

    // Duration input
    const durationInput = document.getElementById('tl-duration-input');
    if (durationInput) {
      durationInput.addEventListener('change', (e) => {
        const val = Math.max(5, Math.min(600, parseInt(e.target.value, 10) || 60));
        window.FPS_STATE.setTimelineDuration(val);
        render();
      });
    }

    // Zoom buttons
    const btnZoomIn = document.getElementById('btn-tl-zoom-in');
    const btnZoomOut = document.getElementById('btn-tl-zoom-out');
    const zoomLabel = document.getElementById('tl-zoom-label');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        zoomLevel = Math.min(3.0, zoomLevel + 0.25);
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
        render();
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.25);
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
        render();
      });
    }

    // Add Track dropdown menu
    const btnAddTrackMenu = document.getElementById('btn-tl-add-track-menu');
    const addTrackDropdown = document.getElementById('tl-add-track-dropdown');

    if (btnAddTrackMenu && addTrackDropdown) {
      btnAddTrackMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        addTrackDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!btnAddTrackMenu.contains(e.target) && !addTrackDropdown.contains(e.target)) {
          addTrackDropdown.classList.add('hidden');
        }
      });
    }

    // Add Selected Object to Timeline
    const btnAddSelected = document.getElementById('btn-tl-add-selected');
    if (btnAddSelected) {
      btnAddSelected.addEventListener('click', () => {
        if (addTrackDropdown) addTrackDropdown.classList.add('hidden');
        addSelectedToTimeline();
      });
    }

    // New Actor Track
    const btnAddActorTrack = document.getElementById('btn-tl-add-actor-track');
    if (btnAddActorTrack) {
      btnAddActorTrack.addEventListener('click', () => {
        if (addTrackDropdown) addTrackDropdown.classList.add('hidden');
        const name = prompt('Enter Actor Name or Role:', 'Actor ' + (window.FPS_STATE.getTimeline().tracks.length + 1));
        if (name) {
          window.FPS_STATE.addTimelineTrack({
            name: name,
            category: 'actor',
            color: '#3b82f6',
            cues: [
              {
                id: 'cue_' + Date.now(),
                startTime: window.FPS_STATE.getTimeline().currentTime || 0,
                duration: 6,
                label: name + ': Movement / Action'
              }
            ]
          });
          render();
        }
      });
    }

    // New Camera Track
    const btnAddCameraTrack = document.getElementById('btn-tl-add-camera-track');
    if (btnAddCameraTrack) {
      btnAddCameraTrack.addEventListener('click', () => {
        if (addTrackDropdown) addTrackDropdown.classList.add('hidden');
        const name = prompt('Enter Camera Name:', 'Camera ' + (window.FPS_STATE.getTimeline().tracks.length + 1));
        if (name) {
          window.FPS_STATE.addTimelineTrack({
            name: name,
            category: 'camera',
            color: '#f59e0b',
            cues: [
              {
                id: 'cue_' + Date.now(),
                startTime: window.FPS_STATE.getTimeline().currentTime || 0,
                duration: 8,
                label: name + ': Take / Pan Shot'
              }
            ]
          });
          render();
        }
      });
    }

    // New Lighting Track
    const btnAddLightingTrack = document.getElementById('btn-tl-add-lighting-track');
    if (btnAddLightingTrack) {
      btnAddLightingTrack.addEventListener('click', () => {
        if (addTrackDropdown) addTrackDropdown.classList.add('hidden');
        const name = prompt('Enter Lighting Cue / Fixture Name:', 'Key Light Dim');
        if (name) {
          window.FPS_STATE.addTimelineTrack({
            name: name,
            category: 'light',
            color: '#eab308',
            cues: [
              {
                id: 'cue_' + Date.now(),
                startTime: window.FPS_STATE.getTimeline().currentTime || 0,
                duration: 5,
                label: name + ': Intensity 80%'
              }
            ]
          });
          render();
        }
      });
    }

    // New Shot / Action Beat Track
    const btnAddActionTrack = document.getElementById('btn-tl-add-action-track');
    if (btnAddActionTrack) {
      btnAddActionTrack.addEventListener('click', () => {
        if (addTrackDropdown) addTrackDropdown.classList.add('hidden');
        const name = prompt('Enter Beat or Scene Section Name:', 'Beat: Discovery');
        if (name) {
          window.FPS_STATE.addTimelineTrack({
            name: name,
            category: 'shot',
            color: '#10b981',
            cues: [
              {
                id: 'cue_' + Date.now(),
                startTime: window.FPS_STATE.getTimeline().currentTime || 0,
                duration: 10,
                label: name
              }
            ]
          });
          render();
        }
      });
    }

    // Quick Add Cue button
    const btnAddCue = document.getElementById('btn-tl-add-cue');
    if (btnAddCue) {
      btnAddCue.addEventListener('click', () => {
        quickAddCueAtPlayhead();
      });
    }
  }

  function bindRulerAndScrubber() {
    const ruler = document.getElementById('timeline-ruler');
    const playhead = document.getElementById('timeline-playhead');
    const lanesScroll = document.getElementById('timeline-lanes-scroll');

    if (ruler) {
      ruler.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDraggingPlayhead = true;
        updatePlayheadFromMouseEvent(e);

        const onMouseMove = (ev) => {
          if (!isDraggingPlayhead) return;
          updatePlayheadFromMouseEvent(ev);
        };

        const onMouseUp = () => {
          isDraggingPlayhead = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    if (playhead) {
      const handle = playhead.querySelector('.playhead-handle');
      if (handle) {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          isDraggingPlayhead = true;

          const onMouseMove = (ev) => {
            if (!isDraggingPlayhead) return;
            updatePlayheadFromMouseEvent(ev);
          };

          const onMouseUp = () => {
            isDraggingPlayhead = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });
      }
    }
  }

  function updatePlayheadFromMouseEvent(e) {
    const lanesScroll = document.getElementById('timeline-lanes-scroll');
    if (!lanesScroll) return;
    const rect = lanesScroll.getBoundingClientRect();
    const scrollLeft = lanesScroll.scrollLeft;
    const clientX = e.clientX;
    const pps = getPPS();

    const xInContent = clientX - rect.left + scrollLeft;
    const tl = window.FPS_STATE.getTimeline();
    const maxDuration = tl ? tl.duration : 60;
    const newTime = Math.max(0, Math.min(maxDuration, xInContent / pps));

    window.FPS_STATE.setTimelineTime(Math.round(newTime * 100) / 100);
    updatePlayheadUI(newTime);
  }

  function bindLanes() {
    const tracksContainer = document.getElementById('timeline-tracks-container');
    if (!tracksContainer) return;

    // Double click to add cue on a track lane
    tracksContainer.addEventListener('dblclick', (e) => {
      const trackRow = e.target.closest('.tl-track-lane');
      if (!trackRow) return;
      if (e.target.closest('.tl-cue-block')) return; // double-clicking cue handles edit

      const trackId = trackRow.dataset.trackId;
      const rect = trackRow.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pps = getPPS();
      const clickTime = Math.max(0, Math.round((clickX / pps) * 10) / 10);

      const label = prompt('Enter Cue Label / Action:', 'Action Cue');
      if (label) {
        window.FPS_STATE.addTimelineCue(trackId, {
          startTime: clickTime,
          duration: 6,
          label: label
        });
        render();
      }
    });

    // Global drag & resize handler for cues
    window.addEventListener('mousemove', (e) => {
      if (!dragCueState) return;
      e.preventDefault();
      const pps = getPPS();
      const dx = e.clientX - dragCueState.startX;
      const dt = dx / pps;
      const tl = window.FPS_STATE.getTimeline();
      const maxDur = tl ? tl.duration : 60;

      if (dragCueState.mode === 'move') {
        const newStartTime = Math.max(0, Math.min(maxDur - dragCueState.initialDuration, dragCueState.initialStartTime + dt));
        dragCueState.currentStartTime = Math.round(newStartTime * 10) / 10;
        // Visual feedback
        if (dragCueState.element) {
          dragCueState.element.style.left = `${dragCueState.currentStartTime * pps}px`;
        }
      } else if (dragCueState.mode === 'resize') {
        const newDuration = Math.max(0.5, Math.min(maxDur - dragCueState.initialStartTime, dragCueState.initialDuration + dt));
        dragCueState.currentDuration = Math.round(newDuration * 10) / 10;
        if (dragCueState.element) {
          dragCueState.element.style.width = `${dragCueState.currentDuration * pps}px`;
          const durBadge = dragCueState.element.querySelector('.cue-duration');
          if (durBadge) durBadge.textContent = `${dragCueState.currentDuration.toFixed(1)}s`;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (!dragCueState) return;
      const { trackId, cueId, mode, currentStartTime, currentDuration, initialStartTime, initialDuration } = dragCueState;
      if (mode === 'move' && currentStartTime !== undefined && currentStartTime !== initialStartTime) {
        window.FPS_STATE.updateTimelineCue(trackId, cueId, { startTime: currentStartTime });
      } else if (mode === 'resize' && currentDuration !== undefined && currentDuration !== initialDuration) {
        window.FPS_STATE.updateTimelineCue(trackId, cueId, { duration: currentDuration });
      }
      dragCueState = null;
      render();
    });
  }

  function render() {
    const tl = window.FPS_STATE ? window.FPS_STATE.getTimeline() : null;
    if (!tl) return;

    // 1. Duration input
    const durationInput = document.getElementById('tl-duration-input');
    if (durationInput && parseInt(durationInput.value, 10) !== tl.duration) {
      durationInput.value = tl.duration;
    }

    // 2. Track count badge
    const badge = document.getElementById('timeline-track-count-badge');
    if (badge) {
      const cnt = tl.tracks ? tl.tracks.length : 0;
      badge.textContent = `${cnt} ${cnt === 1 ? 'track' : 'tracks'}`;
    }

    const pps = getPPS();
    const totalWidth = Math.max(800, tl.duration * pps);

    // 3. Render Ruler
    renderRuler(tl.duration, pps, totalWidth);

    // 4. Render Track Headers & Track Lanes
    renderTracksAndCues(tl, pps, totalWidth);

    // 5. Update Playhead
    updatePlayheadUI(tl.currentTime || 0);

    // 6. Update Top Bar Timeline toggle button state
    const btnTopToggle = document.getElementById('btn-toggle-timeline');
    const dock = document.getElementById('timeline-dock');
    if (btnTopToggle && dock) {
      if (dock.classList.contains('active')) {
        btnTopToggle.classList.add('active');
      } else {
        btnTopToggle.classList.remove('active');
      }
    }
  }

  function renderRuler(duration, pps, totalWidth) {
    const ruler = document.getElementById('timeline-ruler');
    if (!ruler) return;
    ruler.style.width = `${totalWidth}px`;
    ruler.innerHTML = '';

    // Interval for major marks depends on PPS
    let step = 5; // every 5 seconds
    if (pps < 15) step = 10;
    else if (pps > 40) step = 2;
    else if (pps > 80) step = 1;

    for (let sec = 0; sec <= duration; sec += step) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick major';
      tick.style.left = `${sec * pps}px`;

      const label = document.createElement('span');
      label.className = 'ruler-label';
      label.textContent = formatTimecode(sec, false);
      tick.appendChild(label);
      ruler.appendChild(tick);
    }
  }

  function renderTracksAndCues(tl, pps, totalWidth) {
    const headersList = document.getElementById('tl-track-headers-list');
    const tracksContainer = document.getElementById('timeline-tracks-container');
    if (!headersList || !tracksContainer) return;

    headersList.innerHTML = '';
    tracksContainer.innerHTML = '';
    tracksContainer.style.width = `${totalWidth}px`;

    const tracks = tl.tracks || [];

    if (tracks.length === 0) {
      headersList.innerHTML = `
        <div class="tl-empty-headers-prompt">
          <span>No tracks</span>
        </div>
      `;
      tracksContainer.innerHTML = `
        <div class="tl-empty-lanes-prompt">
          <p>No actor or camera tracks in timeline yet.</p>
          <div class="tl-empty-actions">
            <button id="btn-tl-empty-add-actor" class="btn btn-secondary btn-xs">+ Add Actor to Timeline</button>
            <button id="btn-tl-empty-add-cam" class="btn btn-secondary btn-xs">+ Add Camera</button>
          </div>
        </div>
      `;

      const btnEmptyAddActor = document.getElementById('btn-tl-empty-add-actor');
      if (btnEmptyAddActor) {
        btnEmptyAddActor.addEventListener('click', () => {
          // If any actor exists on canvas, add it! Else add a new Actor track
          const actors = window.FPS_STATE.getObjects().filter(o => o.category === 'actor');
          if (actors.length > 0) {
            window.FPS_STATE.addSelectedToTimeline(actors[0]);
          } else {
            window.FPS_STATE.addTimelineTrack({
              name: 'Actor 1',
              category: 'actor',
              color: '#3b82f6',
              cues: [{ id: 'cue_' + Date.now(), startTime: 0, duration: 8, label: 'Actor 1: Starts blocking' }]
            });
          }
          render();
        });
      }

      const btnEmptyAddCam = document.getElementById('btn-tl-empty-add-cam');
      if (btnEmptyAddCam) {
        btnEmptyAddCam.addEventListener('click', () => {
          const cams = window.FPS_STATE.getObjects().filter(o => o.category === 'camera');
          if (cams.length > 0) {
            window.FPS_STATE.addSelectedToTimeline(cams[0]);
          } else {
            window.FPS_STATE.addTimelineTrack({
              name: 'Camera 1',
              category: 'camera',
              color: '#f59e0b',
              cues: [{ id: 'cue_' + Date.now(), startTime: 0, duration: 10, label: 'Camera 1: Wide Coverage' }]
            });
          }
          render();
        });
      }
      return;
    }

    tracks.forEach((track, index) => {
      // 1. Left Header
      const headerItem = document.createElement('div');
      headerItem.className = 'tl-track-header-item';
      headerItem.dataset.trackId = track.id;

      const iconSvg = getCategoryIconSvg(track.category);
      headerItem.innerHTML = `
        <div class="tl-track-meta">
          <div class="tl-track-color-indicator" style="background-color: ${track.color || '#3b82f6'};"></div>
          <span class="tl-track-icon">${iconSvg}</span>
          <span class="tl-track-name" title="${track.name}">${track.name}</span>
        </div>
        <div class="tl-track-actions">
          <button class="btn-track-add-cue" title="Add Cue block to this track" data-track-id="${track.id}">
            + Cue
          </button>
          <button class="btn-track-delete" title="Delete Track" data-track-id="${track.id}">
            ×
          </button>
        </div>
      `;

      // Header click listeners
      const btnAddCue = headerItem.querySelector('.btn-track-add-cue');
      if (btnAddCue) {
        btnAddCue.addEventListener('click', (e) => {
          e.stopPropagation();
          const label = prompt('Enter Cue Label for ' + track.name + ':', track.name + ' Cue');
          if (label) {
            window.FPS_STATE.addTimelineCue(track.id, {
              startTime: tl.currentTime || 0,
              duration: 6,
              label: label
            });
            render();
          }
        });
      }

      const btnDelTrack = headerItem.querySelector('.btn-track-delete');
      if (btnDelTrack) {
        btnDelTrack.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Remove track "${track.name}" from timeline?`)) {
            window.FPS_STATE.deleteTimelineTrack(track.id);
            render();
          }
        });
      }

      // Clicking header selects the related object on canvas if linked!
      headerItem.addEventListener('click', () => {
        if (track.objectId) {
          window.FPS_STATE.setSelected([track.objectId]);
        }
      });

      headersList.appendChild(headerItem);

      // 2. Right Track Lane
      const lane = document.createElement('div');
      lane.className = 'tl-track-lane';
      lane.dataset.trackId = track.id;
      lane.style.width = `${totalWidth}px`;

      // Render Cues inside Lane
      const cues = track.cues || [];
      cues.forEach(cue => {
        const cueEl = document.createElement('div');
        cueEl.className = 'tl-cue-block';
        cueEl.dataset.cueId = cue.id;
        cueEl.dataset.trackId = track.id;

        const left = (cue.startTime || 0) * pps;
        const width = Math.max(20, (cue.duration || 6) * pps);

        cueEl.style.left = `${left}px`;
        cueEl.style.width = `${width}px`;
        cueEl.style.borderLeftColor = track.color || '#3b82f6';

        cueEl.innerHTML = `
          <div class="cue-body">
            <span class="cue-label" title="${cue.label}">${cue.label}</span>
            <span class="cue-duration">${(cue.duration || 6).toFixed(1)}s</span>
          </div>
          <button class="btn-cue-delete" title="Delete Cue">×</button>
          <div class="cue-resize-handle" title="Drag to adjust duration"></div>
        `;

        // Cue block event listeners
        cueEl.addEventListener('mousedown', (e) => {
          if (e.target.closest('.btn-cue-delete')) return;
          if (e.target.closest('.cue-resize-handle')) {
            // Resize mode
            e.stopPropagation();
            dragCueState = {
              mode: 'resize',
              trackId: track.id,
              cueId: cue.id,
              startX: e.clientX,
              initialStartTime: cue.startTime || 0,
              initialDuration: cue.duration || 6,
              element: cueEl
            };
            return;
          }

          // Move mode
          e.stopPropagation();
          dragCueState = {
            mode: 'move',
            trackId: track.id,
            cueId: cue.id,
            startX: e.clientX,
            initialStartTime: cue.startTime || 0,
            initialDuration: cue.duration || 6,
            element: cueEl
          };
        });

        // Double click to edit cue
        cueEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const newLabel = prompt('Edit Cue Label:', cue.label);
          if (newLabel !== null && newLabel.trim() !== '') {
            const durStr = prompt('Cue Duration (seconds):', cue.duration.toString());
            const newDur = parseFloat(durStr);
            window.FPS_STATE.updateTimelineCue(track.id, cue.id, {
              label: newLabel.trim(),
              duration: isNaN(newDur) || newDur <= 0 ? cue.duration : newDur
            });
            render();
          }
        });

        // Delete cue button
        const btnDelCue = cueEl.querySelector('.btn-cue-delete');
        if (btnDelCue) {
          btnDelCue.addEventListener('click', (e) => {
            e.stopPropagation();
            window.FPS_STATE.deleteTimelineCue(track.id, cue.id);
            render();
          });
        }

        lane.appendChild(cueEl);
      });

      tracksContainer.appendChild(lane);
    });
  }

  function updatePlayheadUI(timeInSeconds) {
    const playhead = document.getElementById('timeline-playhead');
    const pps = getPPS();
    if (playhead) {
      playhead.style.left = `${timeInSeconds * pps}px`;
    }

    const timecodeText = document.getElementById('tl-timecode-text');
    if (timecodeText) {
      timecodeText.textContent = formatTimecode(timeInSeconds, true);
    }
  }

  function formatTimecode(sec, withFrames) {
    const totalSec = Math.max(0, sec);
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;

    if (withFrames) {
      const remainder = totalSec - Math.floor(totalSec);
      const frames = Math.floor(remainder * 24);
      const ff = frames < 10 ? '0' + frames : frames;
      return `${mm}:${ss}:${ff}`;
    }
    return `${mm}:${ss}`;
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;

    const btnPlay = document.getElementById('btn-tl-play');
    if (btnPlay) {
      const iconPlay = btnPlay.querySelector('.icon-tl-play');
      const iconPause = btnPlay.querySelector('.icon-tl-pause');
      if (iconPlay) iconPlay.classList.add('hidden');
      if (iconPause) iconPause.classList.remove('hidden');
      btnPlay.classList.add('active');
    }

    const tl = window.FPS_STATE.getTimeline();
    playStartCurrentTime = tl ? tl.currentTime : 0;
    playStartTime = performance.now();

    function loop(now) {
      if (!isPlaying) return;
      const elapsed = (now - playStartTime) / 1000;
      let newTime = playStartCurrentTime + elapsed;
      const duration = tl ? tl.duration : 60;

      if (newTime >= duration) {
        newTime = 0; // Loop or stop
        playStartCurrentTime = 0;
        playStartTime = now;
      }

      window.FPS_STATE.setTimelineTime(newTime);
      updatePlayheadUI(newTime);

      // Auto scroll if playhead goes past visible window
      const lanesScroll = document.getElementById('timeline-lanes-scroll');
      if (lanesScroll) {
        const pps = getPPS();
        const playheadX = newTime * pps;
        const visibleLeft = lanesScroll.scrollLeft;
        const visibleRight = visibleLeft + lanesScroll.clientWidth;
        if (playheadX > visibleRight - 40 || playheadX < visibleLeft) {
          lanesScroll.scrollLeft = playheadX - 60;
        }
      }

      animFrameId = requestAnimationFrame(loop);
    }

    animFrameId = requestAnimationFrame(loop);
  }

  function pause() {
    if (!isPlaying) return;
    isPlaying = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    const btnPlay = document.getElementById('btn-tl-play');
    if (btnPlay) {
      const iconPlay = btnPlay.querySelector('.icon-tl-play');
      const iconPause = btnPlay.querySelector('.icon-tl-pause');
      if (iconPlay) iconPlay.classList.remove('hidden');
      if (iconPause) iconPause.classList.add('hidden');
      btnPlay.classList.remove('active');
    }
  }

  function jumpToAdjacentCue(direction) {
    const tl = window.FPS_STATE.getTimeline();
    if (!tl || !tl.tracks) return;

    const cur = tl.currentTime || 0;
    const allCues = [];
    tl.tracks.forEach(tr => {
      (tr.cues || []).forEach(c => allCues.push(c.startTime));
    });
    allCues.sort((a, b) => a - b);

    if (allCues.length === 0) return;

    if (direction > 0) {
      const next = allCues.find(t => t > cur + 0.1);
      if (next !== undefined) {
        window.FPS_STATE.setTimelineTime(next);
        render();
      }
    } else {
      const prev = [...allCues].reverse().find(t => t < cur - 0.1);
      if (prev !== undefined) {
        window.FPS_STATE.setTimelineTime(prev);
        render();
      } else {
        window.FPS_STATE.setTimelineTime(0);
        render();
      }
    }
  }

  function quickAddCueAtPlayhead() {
    const tl = window.FPS_STATE.getTimeline();
    if (!tl) return;
    if (!tl.tracks || tl.tracks.length === 0) {
      // Add first actor track if none exists
      addSelectedToTimeline();
      return;
    }

    // Add cue to first track or track corresponding to selected object
    const selectedObjs = window.FPS_STATE.getSelectedObjects();
    let targetTrack = null;
    if (selectedObjs.length > 0) {
      targetTrack = tl.tracks.find(t => t.objectId === selectedObjs[0].id);
    }
    if (!targetTrack) targetTrack = tl.tracks[0];

    const label = prompt('Cue Label for ' + targetTrack.name + ':', targetTrack.name + ' Cue');
    if (label) {
      window.FPS_STATE.addTimelineCue(targetTrack.id, {
        startTime: tl.currentTime || 0,
        duration: 6,
        label: label
      });
      render();
    }
  }

  function addSelectedToTimeline(targetObjs) {
    openTimeline();
    const tracks = window.FPS_STATE.addSelectedToTimeline(targetObjs);
    render();
    return tracks;
  }

  function openTimeline() {
    const dock = document.getElementById('timeline-dock');
    const btnTopToggle = document.getElementById('btn-toggle-timeline');
    if (dock) {
      dock.classList.add('active');
      dock.classList.remove('collapsed');
    }
    if (btnTopToggle) {
      btnTopToggle.classList.add('active');
    }
    render();
  }

  function closeTimeline() {
    pause();
    const dock = document.getElementById('timeline-dock');
    const btnTopToggle = document.getElementById('btn-toggle-timeline');
    if (dock) {
      dock.classList.remove('active');
    }
    if (btnTopToggle) {
      btnTopToggle.classList.remove('active');
    }
  }

  function toggleTimeline() {
    const dock = document.getElementById('timeline-dock');
    if (dock && dock.classList.contains('active')) {
      closeTimeline();
    } else {
      openTimeline();
    }
  }

  function updateAddSelectedButton(selectedIds) {
    const btn = document.getElementById('btn-add-to-timeline');
    if (!btn) return;
    if (selectedIds && selectedIds.length > 0) {
      const obj = window.FPS_STATE.getObjectById(selectedIds[0]);
      if (obj) {
        btn.querySelector('span').textContent = `Add "${obj.name}" to Timeline`;
      } else {
        btn.querySelector('span').textContent = 'Add to Timeline Track';
      }
    } else {
      btn.querySelector('span').textContent = 'Add to Timeline Track';
    }
  }

  function getCategoryIconSvg(category) {
    switch (category) {
      case 'actor':
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>';
      case 'camera':
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>';
      case 'light':
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
      case 'vehicle':
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>';
      case 'shot':
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>';
      default:
        return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    }
  }

  return {
    init: init,
    render: render,
    play: play,
    pause: pause,
    togglePlay: togglePlay,
    openTimeline: openTimeline,
    closeTimeline: closeTimeline,
    toggleTimeline: toggleTimeline,
    addSelectedToTimeline: addSelectedToTimeline,
    quickAddCueAtPlayhead: quickAddCueAtPlayhead
  };
})();
