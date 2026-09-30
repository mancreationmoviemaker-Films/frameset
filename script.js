/**
 * FramePlan Studio — Application Bootstrap & Global Keyboard Controller
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State (loads localStorage or demo scene)
    window.FPS_STATE.init();

    // 2. Initialize Canvas Viewport (pan/zoom, renderers)
    window.FPS_CANVAS.init();

    // 3. Initialize Timeline & Shot Blocking
    if (window.FPS_TIMELINE) {
      window.FPS_TIMELINE.init();
    }

    // 4. Initialize UI & Event Handlers
    window.FPS_UI.init();

    // 4. Initial Scene Render
    window.FPS_CANVAS.renderScene();

    // 5. Global Keyboard Shortcuts
    setupGlobalKeyboardShortcuts();

    console.log('FramePlan Studio initialized successfully.');
  });

  function setupGlobalKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Handle Escape (always closes modals or deselects)
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay:not(.hidden)');
        if (modal) {
          modal.classList.add('hidden');
          return;
        }
        window.FPS_STATE.deselectAll();
        return;
      }

      // If user is typing inside an input field, do not trigger single-letter hotkeys
      if (isInput) {
        if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
          e.preventDefault();
          window.FPS_STATE.saveToLocalStorage();
          const statusText = document.getElementById('save-status-text');
          if (statusText) statusText.textContent = 'Saved ✓';
        }
        return;
      }

      // --- COMMAND / SHORTCUT COMBINATIONS ---
      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            window.FPS_STATE.redo();
          } else {
            window.FPS_STATE.undo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          window.FPS_STATE.redo();
        } else if (key === 'd') {
          e.preventDefault();
          window.FPS_STATE.duplicateSelected();
        } else if (key === 'c') {
          e.preventDefault();
          window.FPS_STATE.copySelected();
        } else if (key === 'v') {
          e.preventDefault();
          window.FPS_STATE.pasteClipboard();
        } else if (key === 'x') {
          e.preventDefault();
          window.FPS_STATE.cutSelected();
        } else if (key === 'a') {
          e.preventDefault();
          window.FPS_STATE.selectAll();
        } else if (key === 's') {
          e.preventDefault();
          window.FPS_STATE.saveToLocalStorage();
          const statusText = document.getElementById('save-status-text');
          if (statusText) statusText.textContent = 'Saved ✓';
        } else if (key === 'g') {
          e.preventDefault();
          const sel = window.FPS_STATE.getSelectedObjects();
          if (sel.some(o => o.groupId)) {
            window.FPS_STATE.ungroupSelected();
          } else {
            window.FPS_STATE.groupSelected();
          }
        }
        return;
      }

      // --- SINGLE KEY TOOL SELECTORS ---
      const key = e.key.toLowerCase();
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        window.FPS_STATE.deleteSelected();
      } else if (key === 'v') {
        activateTool('select');
      } else if (key === 'h') {
        activateTool('pan');
      } else if (key === 'a') {
        window.FPS_UI.openAssetModal('actors');
      } else if (key === 'c') {
        window.FPS_UI.openAssetModal('cameras');
      } else if (key === 'l') {
        window.FPS_UI.openAssetModal('lighting');
      } else if (key === 'p') {
        window.FPS_UI.openAssetModal('props');
      } else if (key === 'b') {
        activateTool('blocking');
      } else if (key === 'd') {
        activateTool('draw');
      } else if (key === 's') {
        activateTool('shapes');
      } else if (key === 't') {
        activateTool('text');
      } else if (key === 'e') {
        activateTool('eraser');
      } else if (key === 'm') {
        activateTool('measure');
      } else if (e.key === '?') {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) helpModal.classList.toggle('hidden');
      }
    });
  }

  function activateTool(toolName) {
    const btn = document.querySelector(`.tool-btn[data-tool="${toolName}"]`);
    if (btn) {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.FPS_CANVAS.setTool(toolName);
      const modeEl = document.getElementById('active-tool-name');
      if (modeEl) {
        const labels = {
          select: 'Select & Move (V)',
          pan: 'Hand / Pan (H or Space)',
          blocking: 'Movement Blocking (B)',
          draw: 'Freehand Draw (D)',
          shapes: 'Shapes & Walls (S)',
          text: 'Text Annotation (T)',
          eraser: 'Eraser (E)',
          measure: 'Measurement Ruler (M)'
        };
        modeEl.textContent = labels[toolName] || toolName;
      }
    }
  }
})();
