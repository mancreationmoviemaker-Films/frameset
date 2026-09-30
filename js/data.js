/**
 * FramePlan Studio — Data & Asset Definitions
 * Top-down SVG vector rendering templates, asset libraries, and default demo scene.
 */

window.FPS_DATA = (function() {
  'use strict';

  // SVG Render Helper for Top-Down Assets
  const SVG_SHAPES = {
    // ACTOR SILHOUETTES (Top-down view with head, shoulders, nose/gaze direction)
    actor: function(props) {
      const color = props.color || '#3b82f6';
      const pose = props.pose || 'standing';
      const label = props.name || 'Actor';
      
      let poseSvg = '';
      if (pose === 'sitting') {
        poseSvg = `
          <!-- Thighs / Knees extended forward -->
          <rect x="-18" y="6" width="10" height="24" rx="4" fill="${color}" opacity="0.85" />
          <rect x="8" y="6" width="10" height="24" rx="4" fill="${color}" opacity="0.85" />
        `;
      } else if (pose === 'walking') {
        poseSvg = `
          <!-- Walking arm and leg motion -->
          <ellipse cx="-16" cy="10" rx="4" ry="12" fill="${color}" opacity="0.7" transform="rotate(-15 -16 10)" />
          <ellipse cx="16" cy="-8" rx="4" ry="12" fill="${color}" opacity="0.7" transform="rotate(15 16 -8)" />
        `;
      } else if (pose === 'running') {
        poseSvg = `
          <!-- Running dynamic motion -->
          <ellipse cx="-20" cy="14" rx="4" ry="14" fill="${color}" opacity="0.8" transform="rotate(-30 -20 14)" />
          <ellipse cx="20" cy="-12" rx="4" ry="14" fill="${color}" opacity="0.8" transform="rotate(30 20 -12)" />
        `;
      } else if (pose === 'lying') {
        poseSvg = `
          <!-- Lying silhouette (extended torso/legs) -->
          <rect x="-14" y="-30" width="28" height="60" rx="6" fill="${color}" opacity="0.7" />
        `;
      }

      return `
        <g class="fps-actor-graphic">
          ${poseSvg}
          <!-- Shoulders / Torso -->
          <ellipse cx="0" cy="0" rx="24" ry="13" fill="${color}" stroke="#1e293b" stroke-width="2" />
          <!-- Head -->
          <circle cx="0" cy="0" r="11" fill="#f8fafc" stroke="#1e293b" stroke-width="2" />
          <!-- Nose / Gaze Direction triangle (points UP = 0 deg) -->
          <path d="M -4 -8 L 0 -18 L 4 -8 Z" fill="${color}" stroke="#1e293b" stroke-width="1.5" />
          <!-- Name Badge -->
          <g transform="translate(0, 24)">
            <rect x="-40" y="0" width="80" height="15" rx="3" fill="rgba(15,23,42,0.85)" stroke="#334155" stroke-width="1" />
            <text x="0" y="11" fill="#ffffff" font-size="9" font-weight="600" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // CAMERA GRAPHIC (Cinema camera body, lens, mattebox, handles, and FOV cone)
    camera: function(props) {
      const color = props.color || '#f59e0b';
      const label = props.name || 'CAM 1';
      const focal = props.focal || 35;
      const fovRange = (props.fovRange || 8) * 40; // in world px
      // Calculate realistic horizontal FOV angle from 35mm sensor (36x24mm)
      // angle = 2 * atan(36 / (2 * focal)) in degrees
      const fovAngleDeg = Math.round(2 * Math.atan(36 / (2 * focal)) * (180 / Math.PI));
      const halfAngleRad = (fovAngleDeg / 2) * (Math.PI / 180);
      const coneLeftX = -Math.sin(halfAngleRad) * fovRange;
      const coneRightX = Math.sin(halfAngleRad) * fovRange;
      const coneY = -Math.cos(halfAngleRad) * fovRange;

      return `
        <g class="fps-camera-graphic">
          <!-- FOV Projection Cone (Projecting forward / upward) -->
          <g class="camera-fov-cone" pointer-events="none">
            <path d="M 0 0 L ${coneLeftX} ${coneY} A ${fovRange} ${fovRange} 0 0 1 ${coneRightX} ${coneY} Z" 
                  fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="4 2" />
            <!-- Center Aim Sightline -->
            <line x1="0" y1="0" x2="0" y2="${coneY}" stroke="${color}" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="2 2" />
            <!-- Lens Info Tag on FOV -->
            <text x="0" y="${coneY - 6}" fill="${color}" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">
              ${focal}mm (${fovAngleDeg}°)
            </text>
          </g>

          <!-- Tripod Spreader Legs -->
          <g stroke="#64748b" stroke-width="3" stroke-linecap="round">
            <line x1="0" y1="6" x2="-22" y2="28" />
            <line x1="0" y1="6" x2="22" y2="28" />
            <line x1="0" y1="6" x2="0" y2="34" />
          </g>

          <!-- Cinema Camera Body -->
          <rect x="-16" y="-12" width="32" height="30" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
          <!-- Side Viewfinder / LCD Monitor -->
          <rect x="-24" y="-4" width="7" height="14" rx="1.5" fill="#3b82f6" stroke="#1e293b" stroke-width="1" />
          <!-- Battery Pack -->
          <rect x="-12" y="18" width="24" height="10" rx="2" fill="#334155" />
          <!-- Lens Barrel & Mattebox -->
          <rect x="-10" y="-22" width="20" height="10" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1.5" />
          <path d="M -15 -28 L 15 -28 L 11 -22 L -11 -22 Z" fill="#0f172a" stroke="#475569" stroke-width="1.5" />

          <!-- Camera Number & Lens Text Badge -->
          <g transform="translate(0, 48)">
            <rect x="-35" y="0" width="70" height="16" rx="3" fill="rgba(15,23,42,0.9)" stroke="${color}" stroke-width="1.5" />
            <text x="0" y="11" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // LIGHTING FIXTURE (LED panel, softbox, fresnel, spot, bulb with projected beam)
    lighting: function(props) {
      const color = props.color || '#ffb703';
      const label = props.name || 'Light';
      const intensity = (props.intensity !== undefined ? props.intensity : 85) / 100;
      const beamAngle = props.beamAngle || 65;
      const beamDist = (props.beamDistance || 6) * 35;
      const subType = props.subType || 'led';

      const halfAngleRad = (beamAngle / 2) * (Math.PI / 180);
      const beamLeftX = -Math.sin(halfAngleRad) * beamDist;
      const beamRightX = Math.sin(halfAngleRad) * beamDist;
      const beamY = -Math.cos(halfAngleRad) * beamDist;

      let fixtureSvg = '';
      if (subType === 'softbox') {
        fixtureSvg = `
          <!-- Softbox Rectangular Diffusion Face -->
          <path d="M -24 -16 L 24 -16 L 16 8 L -16 8 Z" fill="#334155" stroke="#1e293b" stroke-width="2" />
          <rect x="-24" y="-18" width="48" height="4" rx="1" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        `;
      } else if (subType === 'octabox') {
        fixtureSvg = `
          <!-- Octagonal Softbox -->
          <polygon points="-12,-16 12,-16 20,-8 20,8 12,16 -12,16 -20,8 -20,-8" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
        `;
      } else if (subType === 'fresnel') {
        fixtureSvg = `
          <!-- Fresnel Spotlight with Barn Doors -->
          <rect x="-14" y="-10" width="28" height="24" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
          <!-- Barn door flaps -->
          <line x1="-14" y1="-10" x2="-26" y2="-22" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
          <line x1="14" y1="-10" x2="26" y2="-22" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
          <!-- Lens ring -->
          <ellipse cx="0" cy="-10" rx="12" ry="4" fill="${color}" opacity="0.9" />
        `;
      } else if (subType === 'china-ball') {
        fixtureSvg = `
          <!-- Lantern / China Ball (Omnidirectional) -->
          <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <circle cx="0" cy="0" r="14" fill="${color}" opacity="0.4" />
        `;
      } else if (subType === 'tube') {
        fixtureSvg = `
          <!-- Tube Light (Astera / Quasar) -->
          <rect x="-35" y="-5" width="70" height="10" rx="5" fill="#ffffff" stroke="${color}" stroke-width="2" />
        `;
      } else {
        // Default LED Panel
        fixtureSvg = `
          <!-- LED Panel Grid -->
          <rect x="-22" y="-10" width="44" height="20" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
          <rect x="-20" y="-8" width="40" height="16" rx="1" fill="#fef08a" stroke="#ca8a04" stroke-width="1" />
          <!-- LED Grid Dots -->
          <line x1="-14" y1="-4" x2="14" y2="-4" stroke="#ca8a04" stroke-width="1" stroke-dasharray="2 3" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#ca8a04" stroke-width="1" stroke-dasharray="2 3" />
          <line x1="-14" y1="4" x2="14" y2="4" stroke="#ca8a04" stroke-width="1" stroke-dasharray="2 3" />
        `;
      }

      return `
        <g class="fps-light-graphic">
          <!-- Light Spread Beam -->
          <g class="light-beam" pointer-events="none">
            <path d="M 0 -8 L ${beamLeftX} ${beamY} A ${beamDist} ${beamDist} 0 0 1 ${beamRightX} ${beamY} Z" 
                  fill="${color}" fill-opacity="${0.15 * intensity}" stroke="${color}" stroke-opacity="${0.45 * intensity}" stroke-width="1.5" stroke-dasharray="3 3" />
          </g>

          <!-- Light Stand Mount -->
          <circle cx="0" cy="0" r="22" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3 3" />
          <line x1="0" y1="0" x2="-16" y2="18" stroke="#64748b" stroke-width="2" />
          <line x1="0" y1="0" x2="16" y2="18" stroke="#64748b" stroke-width="2" />
          <line x1="0" y1="0" x2="0" y2="24" stroke="#64748b" stroke-width="2" />

          <!-- Fixture Head -->
          ${fixtureSvg}

          <!-- Label -->
          <g transform="translate(0, 36)">
            <rect x="-35" y="0" width="70" height="14" rx="3" fill="rgba(15,23,42,0.85)" stroke="#334155" stroke-width="1" />
            <text x="0" y="10" fill="#ffffff" font-size="9" font-weight="600" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // PROPS & FURNITURE (Top-down views)
    prop: function(props) {
      const type = props.propType || 'table';
      const label = props.name || 'Prop';
      const w = props.width || 80;
      const h = props.height || 60;
      const color = props.color || '#64748b';

      let inner = '';
      switch (type) {
        case 'chair':
        case 'dining_chair':
          inner = `
            <!-- Chair cushion & backrest -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="6" fill="${color}" stroke="#1e293b" stroke-width="2" />
            <rect x="${-w/2 + 4}" y="${-h/2 + 4}" width="${w - 8}" height="${h/3}" rx="4" fill="#334155" />
          `;
          break;
        case 'armchair':
          inner = `
            <!-- Armchair deep seat & armrests -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="#1e293b" stroke-width="2" />
            <rect x="${-w/2}" y="${-h/2}" width="12" height="${h}" rx="4" fill="#334155" />
            <rect x="${w/2 - 12}" y="${-h/2}" width="12" height="${h}" rx="4" fill="#334155" />
            <rect x="${-w/2 + 8}" y="${-h/2}" width="${w - 16}" height="14" rx="4" fill="#334155" />
          `;
          break;
        case 'sofa':
          inner = `
            <!-- Sofa multiple cushions -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="#1e293b" stroke-width="2" />
            <rect x="${-w/2}" y="${-h/2}" width="14" height="${h}" rx="4" fill="#334155" />
            <rect x="${w/2 - 14}" y="${-h/2}" width="14" height="${h}" rx="4" fill="#334155" />
            <rect x="${-w/2 + 10}" y="${-h/2}" width="${w - 20}" height="14" rx="4" fill="#334155" />
            <!-- Cushion dividers -->
            <line x1="${-w/6}" y1="${-h/2 + 16}" x2="${-w/6}" y2="${h/2 - 4}" stroke="#1e293b" stroke-width="1.5" />
            <line x1="${w/6}" y1="${-h/2 + 16}" x2="${w/6}" y2="${h/2 - 4}" stroke="#1e293b" stroke-width="1.5" />
          `;
          break;
        case 'table':
        case 'coffee_table':
        case 'dining_table':
          inner = `
            <!-- Table top with bevel -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="6" fill="${color}" stroke="#1e293b" stroke-width="2" />
            <rect x="${-w/2 + 4}" y="${-h/2 + 4}" width="${w - 8}" height="${h - 8}" rx="4" fill="none" stroke="#475569" stroke-width="1" />
          `;
          break;
        case 'desk':
        case 'office_desk':
          inner = `
            <!-- Desk with laptop and monitor -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="4" fill="${color}" stroke="#1e293b" stroke-width="2" />
            <!-- Laptop / Screen -->
            <rect x="-14" y="-8" width="28" height="18" rx="2" fill="#0f172a" stroke="#94a3b8" stroke-width="1" />
            <rect x="-10" y="2" width="20" height="7" rx="1" fill="#38bdf8" />
          `;
          break;
        case 'bed':
        case 'single_bed':
          inner = `
            <!-- Bed frame with pillows & duvet -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="#1e293b" stroke-width="2" />
            <!-- Pillows -->
            <rect x="${-w/2 + 8}" y="${-h/2 + 6}" width="${w/2 - 12}" height="18" rx="3" fill="#cbd5e1" />
            <rect x="4" y="${-h/2 + 6}" width="${w/2 - 12}" height="18" rx="3" fill="#cbd5e1" />
            <!-- Duvet fold -->
            <rect x="${-w/2}" y="${-h/2 + 30}" width="${w}" height="${h - 30}" rx="4" fill="${color}" opacity="0.85" />
            <line x1="${-w/2}" y1="${-h/2 + 30}" x2="${w/2}" y2="${-h/2 + 30}" stroke="#1e293b" stroke-width="1.5" />
          `;
          break;
        case 'tree':
        case 'large_tree':
        case 'bush':
          inner = `
            <!-- Foliage Canopy -->
            <circle cx="0" cy="0" r="${w/2}" fill="#15803d" stroke="#166534" stroke-width="2" opacity="0.85" />
            <circle cx="-8" cy="-6" r="${w/3.5}" fill="#22c55e" opacity="0.6" />
            <circle cx="8" cy="8" r="${w/3.5}" fill="#16a34a" opacity="0.7" />
            <circle cx="0" cy="0" r="4" fill="#78350f" />
          `;
          break;
        case 'door':
          inner = `
            <!-- Door Wall opening & Swing Arc -->
            <rect x="${-w/2}" y="-4" width="8" height="8" fill="#1e293b" />
            <rect x="${w/2 - 8}" y="-4" width="8" height="8" fill="#1e293b" />
            <!-- Swing Arc -->
            <path d="M ${-w/2 + 8} 0 A ${w - 16} ${w - 16} 0 0 1 ${w/2 - 8} ${w - 16}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
            <!-- Door leaf -->
            <line x1="${-w/2 + 8}" y1="0" x2="${w/2 - 8}" y2="${w - 16}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
          `;
          break;
        case 'window':
          inner = `
            <!-- Window frame and glass lines -->
            <rect x="${-w/2}" y="-5" width="${w}" height="10" rx="1" fill="#f8fafc" stroke="#1e293b" stroke-width="2" />
            <line x1="${-w/2}" y1="-2" x2="${w/2}" y2="-2" stroke="#38bdf8" stroke-width="1.5" />
            <line x1="${-w/2}" y1="2" x2="${w/2}" y2="2" stroke="#38bdf8" stroke-width="1.5" />
          `;
          break;
        case 'wall':
          inner = `
            <!-- Architectural Wall -->
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
            <!-- Interior diagonal hatch lines -->
            <line x1="${-w/2}" y1="${h/2}" x2="${w/2}" y2="${-h/2}" stroke="#334155" stroke-width="1" />
          `;
          break;
        default:
          inner = `
            <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="4" fill="${color}" stroke="#1e293b" stroke-width="2" />
          `;
      }

      return `
        <g class="fps-prop-graphic">
          ${inner}
          <!-- Label -->
          <g transform="translate(0, ${h/2 + 10})">
            <rect x="-35" y="0" width="70" height="13" rx="2" fill="rgba(15,23,42,0.85)" />
            <text x="0" y="9" fill="#ffffff" font-size="8" font-weight="600" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // VEHICLES (Top-down cars, vans, trucks, bikes, boats)
    vehicle: function(props) {
      const type = props.vehicleType || 'car';
      const label = props.name || 'Vehicle';
      const color = props.color || '#3b82f6';
      const w = props.width || 80;
      const h = props.height || 160;

      let vehicleSvg = '';
      if (type === 'motorcycle' || type === 'bicycle') {
        vehicleSvg = `
          <!-- Bike Handlebars and Frame -->
          <line x1="0" y1="${-h/2 + 15}" x2="0" y2="${h/2 - 15}" stroke="#0f172a" stroke-width="4" />
          <ellipse cx="0" cy="${-h/2 + 15}" rx="4" ry="12" fill="#0f172a" />
          <ellipse cx="0" cy="${h/2 - 15}" rx="4" ry="12" fill="#0f172a" />
          <line x1="-16" y1="${-h/2 + 25}" x2="16" y2="${-h/2 + 25}" stroke="#475569" stroke-width="3" stroke-linecap="round" />
        `;
      } else if (type === 'boat' || type === 'canoe') {
        vehicleSvg = `
          <!-- Boat pointed bow and transom -->
          <path d="M 0 ${-h/2} C ${w/2} ${-h/4} ${w/2} ${h/4} ${w/2 - 4} ${h/2} L ${-w/2 + 4} ${h/2} C ${-w/2} ${h/4} ${-w/2} ${-h/4} 0 ${-h/2} Z" 
                fill="${color}" stroke="#0f172a" stroke-width="2" />
          <ellipse cx="0" cy="0" rx="${w/3}" ry="${h/3}" fill="#ffffff" opacity="0.8" />
        `;
      } else if (type === 'helicopter') {
        vehicleSvg = `
          <!-- Helicopter Fuselage & Rotor Blades -->
          <ellipse cx="0" cy="-10" rx="${w/2.5}" ry="${h/3}" fill="${color}" stroke="#0f172a" stroke-width="2" />
          <rect x="-4" y="10" width="8" height="${h/2}" fill="#334155" />
          <!-- Rotor Blades -->
          <line x1="${-w}" y1="-10" x2="${w}" y2="-10" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
          <line x1="0" y1="${-w - 10}" x2="0" y2="${w - 10}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
          <circle cx="0" cy="-10" r="6" fill="#f59e0b" />
        `;
      } else {
        // Standard Car / Van / Truck
        vehicleSvg = `
          <!-- Side mirrors -->
          <rect x="${-w/2 - 6}" y="${-h/4}" width="6" height="8" rx="2" fill="#334155" />
          <rect x="${w/2}" y="${-h/4}" width="6" height="8" rx="2" fill="#334155" />
          <!-- Vehicle Body -->
          <rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="14" fill="${color}" stroke="#0f172a" stroke-width="2" />
          <!-- Front Windshield -->
          <path d="M ${-w/2 + 6} ${-h/4} L ${w/2 - 6} ${-h/4} L ${w/2 - 10} ${-h/6} L ${-w/2 + 10} ${-h/6} Z" fill="#0f172a" />
          <!-- Rear Window -->
          <path d="M ${-w/2 + 8} ${h/4} L ${w/2 - 8} ${h/4} L ${w/2 - 6} ${h/3} L ${-w/2 + 6} ${h/3} Z" fill="#0f172a" />
          <!-- Roof -->
          <rect x="${-w/2 + 8}" y="${-h/6}" width="${w - 16}" height="${h/2.4}" rx="4" fill="#ffffff" opacity="0.2" />
          <!-- Headlights -->
          <ellipse cx="${-w/3}" cy="${-h/2 + 4}" rx="6" ry="3" fill="#fef08a" />
          <ellipse cx="${w/3}" cy="${-h/2 + 4}" rx="6" ry="3" fill="#fef08a" />
          <!-- Taillights -->
          <ellipse cx="${-w/3}" cy="${h/2 - 3}" rx="6" ry="2" fill="#ef4444" />
          <ellipse cx="${w/3}" cy="${h/2 - 3}" rx="6" ry="2" fill="#ef4444" />
        `;
      }

      return `
        <g class="fps-vehicle-graphic">
          ${vehicleSvg}
          <!-- Label -->
          <g transform="translate(0, ${h/2 + 14})">
            <rect x="-35" y="0" width="70" height="14" rx="3" fill="rgba(15,23,42,0.85)" stroke="#334155" stroke-width="1" />
            <text x="0" y="10" fill="#ffffff" font-size="9" font-weight="600" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // BLOCKING PATH (Curved or stepped movement arrow for actor/camera)
    blockingPath: function(props) {
      const color = props.color || (props.category === 'camera' ? '#f59e0b' : '#3b82f6');
      const label = props.label || 'Walks to table';
      const points = props.points || [{x: 0, y: 0}, {x: 100, y: 0}];
      if (points.length < 2) return '';

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }

      const p0 = points[0];
      const pLast = points[points.length - 1];
      const midIdx = Math.floor(points.length / 2);
      const midPoint = points[midIdx];

      return `
        <g class="fps-blocking-graphic">
          <!-- Start Anchor Dot -->
          <circle cx="${p0.x}" cy="${p0.y}" r="6" fill="${color}" stroke="#ffffff" stroke-width="2" />
          <!-- Movement Path -->
          <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="6 4" 
                marker-end="url(#arrow-${props.category === 'camera' ? 'camera' : 'actor'})" />
          <!-- Label on path midpoint -->
          <g transform="translate(${midPoint.x}, ${midPoint.y - 12})">
            <rect x="-50" y="0" width="100" height="15" rx="3" fill="rgba(15,23,42,0.9)" stroke="${color}" stroke-width="1" />
            <text x="0" y="11" fill="#ffffff" font-size="9" font-weight="600" text-anchor="middle" font-family="sans-serif">${escapeXml(label)}</text>
          </g>
        </g>
      `;
    },

    // TEXT ANNOTATION
    text: function(props) {
      const content = props.content || 'DOOR';
      const size = props.fontSize || 14;
      const color = props.color || '#ffffff';
      const bg = props.showBadge !== false;
      const bold = props.bold ? 'bold' : 'normal';
      const italic = props.italic ? 'italic' : 'normal';

      return `
        <g class="fps-text-graphic">
          ${bg ? `<rect x="-50" y="-12" width="100" height="24" rx="4" fill="rgba(15,23,42,0.85)" stroke="#334155" stroke-width="1" />` : ''}
          <text x="0" y="4" fill="${color}" font-size="${size}" font-weight="${bold}" font-style="${italic}" text-anchor="middle" font-family="sans-serif">
            ${escapeXml(content)}
          </text>
        </g>
      `;
    },

    // MEASUREMENT RULER (2-point dimension line)
    measurement: function(props) {
      const p1 = props.p1 || {x: 0, y: 0};
      const p2 = props.p2 || {x: 100, y: 0};
      const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      // Scale: 40px = 1 meter
      const meters = (distPx / 40).toFixed(2);
      const feet = (meters * 3.28084).toFixed(1);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      return `
        <g class="fps-measure-graphic">
          <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#ef4444" stroke-width="2" marker-start="url(#arrow-general)" marker-end="url(#arrow-general)" />
          <circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#ef4444" />
          <circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#ef4444" />
          <g transform="translate(${midX}, ${midY - 10})">
            <rect x="-35" y="-10" width="70" height="20" rx="3" fill="rgba(15,23,42,0.9)" stroke="#ef4444" stroke-width="1" />
            <text x="0" y="4" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">
              ${meters}m / ${feet}ft
            </text>
          </g>
        </g>
      `;
    }
  };

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // CATALOG OF ALL ASSETS FOR THE ASSET MODAL & SEARCH
  const CATALOG = {
    actors: [
      { id: 'person_a', name: 'Person A', category: 'actor', pose: 'standing', color: '#3b82f6', width: 48, height: 48 },
      { id: 'person_b', name: 'Person B', category: 'actor', pose: 'standing', color: '#ef4444', width: 48, height: 48 },
      { id: 'person_c', name: 'Person C', category: 'actor', pose: 'standing', color: '#10b981', width: 48, height: 48 },
      { id: 'person_d', name: 'Person D', category: 'actor', pose: 'standing', color: '#8b5cf6', width: 48, height: 48 },
      { id: 'person_flat', name: 'Person Flat', category: 'actor', pose: 'standing', color: '#64748b', width: 48, height: 48 },
      { id: 'person_flat_2', name: 'Person Flat 2', category: 'actor', pose: 'standing', color: '#475569', width: 48, height: 48 },
      { id: 'person_flat_3', name: 'Person Flat 3', category: 'actor', pose: 'standing', color: '#334155', width: 48, height: 48 },
      { id: 'standing', name: 'Standing', category: 'actor', pose: 'standing', color: '#3b82f6', width: 48, height: 48 },
      { id: 'sitting', name: 'Sitting', category: 'actor', pose: 'sitting', color: '#f59e0b', width: 48, height: 60 },
      { id: 'sitting_b', name: 'Sitting B', category: 'actor', pose: 'sitting', color: '#ec4899', width: 48, height: 60 },
      { id: 'sitting_c', name: 'Sitting C', category: 'actor', pose: 'sitting', color: '#06b6d4', width: 48, height: 60 },
      { id: 'lying', name: 'Lying', category: 'actor', pose: 'lying', color: '#84cc16', width: 48, height: 80 },
      { id: 'walking', name: 'Walking', category: 'actor', pose: 'walking', color: '#10b981', width: 48, height: 52 },
      { id: 'running', name: 'Running', category: 'actor', pose: 'running', color: '#ef4444', width: 48, height: 56 },
      { id: 'custom_actor', name: 'Custom Actor', category: 'actor', pose: 'standing', color: '#d946ef', width: 48, height: 48 }
    ],

    cameras: [
      { id: 'cinema_camera', name: 'Cinema Camera', category: 'camera', focal: 35, shotType: 'Medium Shot', fovRange: 8, color: '#f59e0b', width: 50, height: 60 },
      { id: 'camera', name: 'Camera', category: 'camera', focal: 50, shotType: 'Medium Close-Up', fovRange: 7, color: '#f59e0b', width: 50, height: 60 },
      { id: 'camera_2', name: 'Camera 2', category: 'camera', focal: 85, shotType: 'Close-Up', fovRange: 9, color: '#38bdf8', width: 50, height: 60 },
      { id: 'camera_3', name: 'Camera 3', category: 'camera', focal: 24, shotType: 'Wide Shot', fovRange: 10, color: '#ec4899', width: 50, height: 60 },
      { id: 'tripod', name: 'Tripod', category: 'camera', focal: 50, shotType: 'Static', fovRange: 6, color: '#94a3b8', width: 46, height: 50 },
      { id: 'handheld_camera', name: 'Handheld Camera', category: 'camera', focal: 28, shotType: 'Over The Shoulder', fovRange: 6, color: '#10b981', width: 46, height: 50 },
      { id: 'drone_camera', name: 'Drone Camera', category: 'camera', focal: 18, shotType: 'Extreme Wide Shot', fovRange: 14, color: '#a855f7', width: 54, height: 54 }
    ],

    lighting: [
      // SOFT LIGHT
      { id: 'led_panel', name: 'LED Panel', category: 'lighting', subType: 'led', group: 'Soft Light', intensity: 85, beamAngle: 70, color: '#fef08a', width: 50, height: 40 },
      { id: 'lantern', name: 'Lantern / China Ball', category: 'lighting', subType: 'china-ball', group: 'Soft Light', intensity: 80, beamAngle: 120, color: '#fef3c7', width: 44, height: 44 },
      { id: 'octabox', name: 'Octabox', category: 'lighting', subType: 'octabox', group: 'Soft Light', intensity: 90, beamAngle: 85, color: '#fef9c3', width: 52, height: 52 },
      { id: 'rectangular_softbox', name: 'Rectangular Softbox', category: 'lighting', subType: 'softbox', group: 'Soft Light', intensity: 85, beamAngle: 75, color: '#fef08a', width: 54, height: 38 },
      { id: 'umbrella', name: 'Umbrella', category: 'lighting', subType: 'softbox', group: 'Soft Light', intensity: 75, beamAngle: 90, color: '#fef08a', width: 48, height: 40 },
      // HARD LIGHT
      { id: 'barn_doors', name: 'Barn Doors', category: 'lighting', subType: 'fresnel', group: 'Hard Light', intensity: 95, beamAngle: 45, color: '#fed7aa', width: 48, height: 44 },
      { id: 'fresnel', name: 'Fresnel', category: 'lighting', subType: 'fresnel', group: 'Hard Light', intensity: 100, beamAngle: 40, color: '#fed7aa', width: 46, height: 46 },
      { id: 'projection_lens', name: 'Projection Lens', category: 'lighting', subType: 'fresnel', group: 'Hard Light', intensity: 100, beamAngle: 25, color: '#fde047', width: 44, height: 44 },
      { id: 'reflector', name: 'Reflector', category: 'lighting', subType: 'led', group: 'Hard Light', intensity: 60, beamAngle: 60, color: '#f8fafc', width: 42, height: 20 },
      // ACCENT LIGHT
      { id: 'pocket_light', name: 'Pocket Light', category: 'lighting', subType: 'led', group: 'Accent Light', intensity: 70, beamAngle: 60, color: '#38bdf8', width: 36, height: 24 },
      { id: 'tube_light', name: 'Tube Light', category: 'lighting', subType: 'tube', group: 'Accent Light', intensity: 80, beamAngle: 90, color: '#a855f7', width: 80, height: 18 },
      // GRIDS & PRACTICAL
      { id: 'grid_light', name: 'Grid', category: 'lighting', subType: 'led', group: 'Grids', intensity: 90, beamAngle: 40, color: '#fef08a', width: 46, height: 32 },
      { id: 'bulb', name: 'Bulb', category: 'lighting', subType: 'china-ball', group: 'Practical Light', intensity: 60, beamAngle: 140, color: '#fed7aa', width: 30, height: 30 },
      { id: 'table_lamp', name: 'Table Lamp', category: 'lighting', subType: 'china-ball', group: 'Practical Light', intensity: 65, beamAngle: 110, color: '#fde68a', width: 34, height: 34 },
      { id: 'floor_lamp', name: 'Floor Lamp', category: 'lighting', subType: 'china-ball', group: 'Practical Light', intensity: 75, beamAngle: 110, color: '#fde68a', width: 38, height: 38 }
    ],

    props: [
      // FURNITURE
      { id: 'chair', name: 'Chair', category: 'prop', propType: 'chair', subGroup: 'Furniture', width: 44, height: 44, color: '#475569' },
      { id: 'armchair', name: 'Armchair', category: 'prop', propType: 'armchair', subGroup: 'Furniture', width: 64, height: 60, color: '#334155' },
      { id: 'coffee_table', name: 'Coffee Table', category: 'prop', propType: 'coffee_table', subGroup: 'Furniture', width: 75, height: 45, color: '#78350f' },
      { id: 'table', name: 'Table', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 90, height: 60, color: '#92400e' },
      { id: 'dining_table', name: 'Dining Table', category: 'prop', propType: 'dining_table', subGroup: 'Furniture', width: 140, height: 75, color: '#78350f' },
      { id: 'dining_table_square', name: 'Dining Table Square', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 80, height: 80, color: '#78350f' },
      { id: 'dining_chair', name: 'Dining Chair', category: 'prop', propType: 'dining_chair', subGroup: 'Furniture', width: 42, height: 42, color: '#64748b' },
      { id: 'sofa', name: 'Sofa', category: 'prop', propType: 'sofa', subGroup: 'Furniture', width: 150, height: 65, color: '#334155' },
      { id: 'desk', name: 'Desk', category: 'prop', propType: 'desk', subGroup: 'Furniture', width: 110, height: 55, color: '#64748b' },
      { id: 'bookshelf', name: 'Bookshelf', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 100, height: 35, color: '#78350f' },
      { id: 'single_bed', name: 'Single Bed', category: 'prop', propType: 'single_bed', subGroup: 'Furniture', width: 85, height: 140, color: '#3b82f6' },
      { id: 'nightstand', name: 'Nightstand', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 40, height: 40, color: '#78350f' },
      { id: 'tv', name: 'TV', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 90, height: 18, color: '#0f172a' },
      { id: 'wardrobe', name: 'Wardrobe', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 100, height: 48, color: '#78350f' },
      { id: 'dresser', name: 'Dresser', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 85, height: 42, color: '#78350f' },
      { id: 'empty_cabinet', name: 'Empty Cabinet', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 80, height: 40, color: '#475569' },
      { id: 'sink_cabinet', name: 'Sink Cabinet', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 75, height: 50, color: '#64748b' },
      { id: 'stove_cabinet', name: 'Stove Cabinet', category: 'prop', propType: 'table', subGroup: 'Furniture', width: 75, height: 55, color: '#475569' },
      // OUTSIDE
      { id: 'tree', name: 'Tree', category: 'prop', propType: 'tree', subGroup: 'Outside', width: 80, height: 80, color: '#16a34a' },
      { id: 'large_tree', name: 'Large Tree', category: 'prop', propType: 'large_tree', subGroup: 'Outside', width: 120, height: 120, color: '#15803d' },
      { id: 'bush', name: 'Bush', category: 'prop', propType: 'bush', subGroup: 'Outside', width: 50, height: 50, color: '#22c55e' },
      { id: 'bench', name: 'Bench', category: 'prop', propType: 'table', subGroup: 'Outside', width: 90, height: 35, color: '#78350f' },
      { id: 'street_light', name: 'Street Light', category: 'prop', propType: 'chair', subGroup: 'Outside', width: 30, height: 30, color: '#334155' },
      { id: 'rock', name: 'Rock', category: 'prop', propType: 'chair', subGroup: 'Outside', width: 50, height: 40, color: '#64748b' },
      { id: 'road', name: 'Road', category: 'prop', propType: 'table', subGroup: 'Outside', width: 240, height: 90, color: '#1e293b' },
      { id: 'wall', name: 'Wall', category: 'prop', propType: 'wall', subGroup: 'Outside', width: 160, height: 16, color: '#1e293b' },
      { id: 'door', name: 'Door', category: 'prop', propType: 'door', subGroup: 'Outside', width: 70, height: 70, color: '#94a3b8' },
      { id: 'window', name: 'Window', category: 'prop', propType: 'window', subGroup: 'Outside', width: 80, height: 16, color: '#38bdf8' },
      { id: 'fence', name: 'Fence', category: 'prop', propType: 'table', subGroup: 'Outside', width: 120, height: 14, color: '#92400e' },
      // OFFICE
      { id: 'computer', name: 'Computer', category: 'prop', propType: 'desk', subGroup: 'Office', width: 90, height: 50, color: '#334155' },
      { id: 'office_chair', name: 'Office Chair', category: 'prop', propType: 'chair', subGroup: 'Office', width: 46, height: 46, color: '#1e293b' },
      { id: 'monitor', name: 'Monitor', category: 'prop', propType: 'table', subGroup: 'Office', width: 50, height: 14, color: '#0f172a' },
      { id: 'printer', name: 'Printer', category: 'prop', propType: 'table', subGroup: 'Office', width: 44, height: 40, color: '#94a3b8' },
      // RESTAURANT & HOME
      { id: 'counter', name: 'Counter', category: 'prop', propType: 'table', subGroup: 'Restaurant', width: 140, height: 48, color: '#475569' },
      { id: 'laptop', name: 'Laptop', category: 'prop', propType: 'table', subGroup: 'Home', width: 32, height: 24, color: '#94a3b8' },
      { id: 'mirror', name: 'Mirror', category: 'prop', propType: 'table', subGroup: 'Home', width: 60, height: 12, color: '#e2e8f0' },
      { id: 'cupboard', name: 'Cupboard', category: 'prop', propType: 'table', subGroup: 'Home', width: 80, height: 42, color: '#78350f' }
    ],

    vehicles: [
      { id: 'car', name: 'Car', category: 'vehicle', vehicleType: 'car', width: 75, height: 155, color: '#3b82f6' },
      { id: 'car_2', name: 'Car 2', category: 'vehicle', vehicleType: 'car', width: 75, height: 155, color: '#ef4444' },
      { id: 'car_rig', name: 'Car Rig', category: 'vehicle', vehicleType: 'car', width: 85, height: 170, color: '#475569' },
      { id: 'van', name: 'Van', category: 'vehicle', vehicleType: 'car', width: 85, height: 190, color: '#f8fafc' },
      { id: 'truck', name: 'Truck', category: 'vehicle', vehicleType: 'car', width: 95, height: 230, color: '#f59e0b' },
      { id: 'bus', name: 'Bus', category: 'vehicle', vehicleType: 'car', width: 95, height: 270, color: '#eab308' },
      { id: 'motorcycle', name: 'Motorcycle', category: 'vehicle', vehicleType: 'motorcycle', width: 36, height: 90, color: '#1e293b' },
      { id: 'bicycle', name: 'Bicycle', category: 'vehicle', vehicleType: 'bicycle', width: 30, height: 75, color: '#10b981' },
      { id: 'boat', name: 'Boat', category: 'vehicle', vehicleType: 'boat', width: 80, height: 180, color: '#0ea5e9' },
      { id: 'canoe', name: 'Canoe', category: 'vehicle', vehicleType: 'canoe', width: 44, height: 160, color: '#b45309' },
      { id: 'helicopter', name: 'Helicopter', category: 'vehicle', vehicleType: 'helicopter', width: 140, height: 180, color: '#475569' }
    ]
  };

  // Empty fresh project (Default for new users)
  const EMPTY_PROJECT = {
    title: 'Untitled Film Project',
    currentSceneId: 'scene_1',
    scenes: [
      {
        id: 'scene_1',
        number: '1',
        name: 'Scene 1',
        env: 'INT.',
        location: 'STAGE / LOCATION',
        time: 'DAY',
        notes: '',
        shots: [],
        timeline: {
          duration: 60, // in seconds
          currentTime: 0,
          tracks: []
        },
        objects: []
      }
    ]
  };

  // Sample default demo scene: "Terrace Scene"
  const DEMO_PROJECT = {
    title: 'Neon Nights Feature',
    currentSceneId: 'scene_1',
    scenes: [
      {
        id: 'scene_1',
        number: '12',
        name: 'Terrace Scene',
        env: 'INT.',
        location: 'TERRACE APARTMENT',
        time: 'NIGHT',
        notes: 'Director Note: Hero and Friend sit across the glass coffee table discussing the heist escape plan.\n\nLighting: Key LED panel creates soft wrap from camera-left; rim light behind the curtains provides edge separation.\n\nCamera 1 holds 35mm Master two-shot, while Camera 2 captures 85mm tight close-up coverage on Hero.',
        shots: [
          { id: 'shot_1', number: '01', camera: 'Camera 1', type: 'Medium Two-Shot', focal: '35mm', movement: 'Static', desc: 'Establishing two-shot across coffee table' },
          { id: 'shot_2', number: '02', camera: 'Camera 2', type: 'Close-Up', focal: '85mm', movement: 'Static', desc: 'Tight single on Hero as he looks at blueprint' },
          { id: 'shot_3', number: '03', camera: 'Camera 1', type: 'Medium Close-Up', focal: '50mm', movement: 'Slow Dolly In', desc: 'Slow push in on Friend warning Hero' }
        ],
        timeline: {
          duration: 60,
          currentTime: 0,
          tracks: [
            {
              id: 'track_act_1',
              objectId: 'actor_hero',
              category: 'actor',
              name: 'Hero',
              color: '#3b82f6',
              cues: [
                { id: 'cue_1', startTime: 0, duration: 8, label: 'Hero: Enters frame & sits' },
                { id: 'cue_2', startTime: 12, duration: 10, label: 'Hero: Examines blueprint' }
              ]
            },
            {
              id: 'track_act_2',
              objectId: 'actor_friend',
              category: 'actor',
              name: 'Friend',
              color: '#ec4899',
              cues: [
                { id: 'cue_3', startTime: 4, duration: 14, label: 'Friend: Speaks dialogue' }
              ]
            },
            {
              id: 'track_cam_1',
              objectId: 'cam_1',
              category: 'camera',
              name: 'Camera 1',
              color: '#f59e0b',
              cues: [
                { id: 'cue_4', startTime: 0, duration: 12, label: '35mm Master Two-Shot' }
              ]
            },
            {
              id: 'track_cam_2',
              objectId: 'cam_2',
              category: 'camera',
              name: 'Camera 2',
              color: '#38bdf8',
              cues: [
                { id: 'cue_5', startTime: 12, duration: 8, label: '85mm Close-Up on Hero' }
              ]
            }
          ]
        },
        objects: [
          // Architectural Walls
          { id: 'wall_top', category: 'prop', propType: 'wall', name: 'North Wall', x: 500, y: 160, width: 400, height: 16, rotation: 0, scale: 1, opacity: 1, locked: true },
          { id: 'wall_left', category: 'prop', propType: 'wall', name: 'West Wall', x: 292, y: 350, width: 16, height: 380, rotation: 0, scale: 1, opacity: 1, locked: true },
          { id: 'wall_right', category: 'prop', propType: 'wall', name: 'East Wall', x: 708, y: 350, width: 16, height: 380, rotation: 0, scale: 1, opacity: 1, locked: true },
          { id: 'door_entry', category: 'prop', propType: 'door', name: 'Balcony Door', x: 620, y: 160, width: 70, height: 70, rotation: 0, scale: 1, opacity: 1, locked: true },

          // Furniture
          { id: 'coffee_table_1', category: 'prop', propType: 'coffee_table', name: 'Coffee Table', x: 500, y: 340, width: 90, height: 50, rotation: 0, scale: 1, opacity: 1, color: '#78350f' },
          { id: 'chair_1', category: 'prop', propType: 'armchair', name: 'Armchair (Hero)', x: 420, y: 340, width: 60, height: 60, rotation: 90, scale: 1, opacity: 1, color: '#334155' },
          { id: 'chair_2', category: 'prop', propType: 'armchair', name: 'Armchair (Friend)', x: 580, y: 340, width: 60, height: 60, rotation: -90, scale: 1, opacity: 1, color: '#334155' },

          // Actors
          { id: 'actor_hero', category: 'actor', name: 'Hero', x: 420, y: 340, width: 48, height: 48, rotation: 90, scale: 1, opacity: 1, color: '#3b82f6', pose: 'sitting', role: 'Protagonist' },
          { id: 'actor_friend', category: 'actor', name: 'Friend', x: 580, y: 340, width: 48, height: 48, rotation: -90, scale: 1, opacity: 1, color: '#ec4899', pose: 'sitting', role: 'Informant' },

          // Lighting Fixtures
          { id: 'light_key', category: 'lighting', subType: 'led', name: 'Key Light (LED)', x: 370, y: 440, width: 50, height: 40, rotation: -40, scale: 1, opacity: 1, intensity: 85, beamAngle: 65, color: '#fef08a' },
          { id: 'light_fill', category: 'lighting', subType: 'softbox', name: 'Fill Light (Softbox)', x: 630, y: 450, width: 50, height: 38, rotation: 40, scale: 1, opacity: 1, intensity: 50, beamAngle: 80, color: '#bae6fd' },
          { id: 'light_rim', category: 'lighting', subType: 'tube', name: 'Rim Tube Light', x: 500, y: 200, width: 80, height: 18, rotation: 180, scale: 1, opacity: 1, intensity: 75, beamAngle: 90, color: '#a855f7' },

          // Cameras
          { id: 'cam_1', category: 'camera', name: 'Camera 1', x: 500, y: 560, width: 50, height: 60, rotation: 0, scale: 1, opacity: 1, focal: 35, shotType: 'Medium Shot', fovRange: 8, color: '#f59e0b' },
          { id: 'cam_2', category: 'camera', name: 'Camera 2', x: 640, y: 520, width: 50, height: 60, rotation: -30, scale: 1, opacity: 1, focal: 85, shotType: 'Close-Up', fovRange: 9, color: '#38bdf8' },

          // Blocking Path (Hero exit cue)
          { id: 'block_hero', category: 'blocking', name: 'Hero Exit Path', label: 'Stands up & exits to balcony', color: '#3b82f6', points: [{x: 420, y: 320}, {x: 460, y: 220}, {x: 620, y: 190}], opacity: 1 }
        ]
      }
    ]
  };

  return {
    SVG_SHAPES: SVG_SHAPES,
    CATALOG: CATALOG,
    EMPTY_PROJECT: EMPTY_PROJECT,
    DEMO_PROJECT: DEMO_PROJECT
  };
})();
