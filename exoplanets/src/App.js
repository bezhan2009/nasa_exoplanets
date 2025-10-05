import React, { useEffect } from "react";

export default function App() {
  useEffect(() => {
    if (!document.getElementById("exoplanet-script")) {
      const script = document.createElement("script");
      script.src = process.env.PUBLIC_URL + "/exoplanet.js";
      script.id = "exoplanet-script";
      script.async = false;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

const htmlContent = `
  <body>
    <div id="canvas-container"></div>
    <div id="control-panel" aria-hidden="true">
      <canvas id="panel-particles"></canvas>
      <div class="panel-inner">
        <div class="panel-header">
          <div>
            <div class="panel-title">🌌 Exoplanet Transit Studio</div>
            <div class="panel-sub">GLSL Star • Bloom • Shadows • AI Analysis</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div class="meta">Local Save: <span id="saved-count">0</span></div>
          </div>
        </div>
        <div class="panel-body">
          <div class="section">
            <div class="head" onclick="toggleSection('systemQuick')">
              <h4>System Management Section</h4><div class="meta">Save / Load</div>
            </div>
            <div id="systemQuick" class="body" >
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                <input id="system-name" class="input" type="text" placeholder="System name (e.g.: Kepler-XYZ)" value="Default System">
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-primary" id="save-system-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 5v14h14V7l-4-4H5z" stroke="white" stroke-width="1.5"/></svg> Save</button>
                  <button class="btn btn-primary" id="open-systems-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="white" stroke-width="1.5"/></svg> Load</button>
                  <button class="btn btn-danger" id="clear-systems-btn">Clear</button>
                </div>
                <div id="saved-systems-list" style="margin-top:6px;"></div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="head" onclick="toggleSection('addPlanet')">
              <h4>➕ Add Planets</h4><div class="meta">Add a planet to the system</div>
            </div>
            <div id="addPlanet" class="body">
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <input id="new-planet-name" class="input" type="text" placeholder="Kepler-X" value="Kepler-X">
                <div style="display:flex; gap:8px;">
                  <input id="new-planet-size" class="input" type="number" min="0.3" max="6" step="0.1" value="1">
                  <input id="new-planet-distance" class="input" type="number" min="2" max="120" step="0.5" value="12">
                </div>
                <div style="display:flex; gap:8px;">
                  <input id="new-planet-speed" class="input" type="number" min="0.001" max="0.05" step="0.001" value="0.012">
                  <input id="new-planet-color" type="color" value="#4fc3f7" style="border-radius:8px;height:44px;border:none;padding:0">
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <label class="meta">Glow</label>
                  <input id="new-planet-glow" type="range" min="0" max="1" step="0.05" value="0.2">
                  <div id="new-glow-value" class="meta" style="margin-left:auto">0.2</div>
                </div>
                <select id="new-material" class="input">
                  <option value="earth">Earth-like</option>
                  <option value="gas">Gas Giant</option>
                  <option value="lava">Lava</option>
                </select>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-primary" id="add-planet-btn">Add Planet</button>
                  <button class="btn btn-warning" id="spawn-random-btn">Spawn Random</button>
                </div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="head" onclick="toggleSection('systemTab')">
              <h4>📡 System</h4><div class="meta">View planets and editing</div>
            </div>
            <div id="systemTab" class="body">
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <div id="system-planets-list" style="display:flex;flex-direction:column;gap:8px;"></div>
                <div style="margin-top:6px;display:flex;gap:8px;">
                  <button class="btn btn-primary" id="export-system-btn">Export JSON</button>
                  <button class="btn btn-primary" id="import-system-btn">Import JSON</button>
                </div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="head" onclick="toggleSection('starTab')">
              <h4>⭐ Star</h4><div class="meta">Star editing</div>
            </div>
            <div id="starTab" class="body">
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <input id="star-size" class="input" type="number" min="1" max="10" step="0.1" value="3.0">
                <div style="display:flex;gap:8px;">
                  <input id="star-color1" type="color" value="#FFF3A0" style="border-radius:8px;height:44px;border:none;padding:0">
                  <input id="star-color2" type="color" value="#FF9A3B" style="border-radius:8px;height:44px;border:none;padding:0">
                  <input id="star-color3" type="color" value="#FF3B1F" style="border-radius:8px;height:44px;border:none;padding:0">
                </div>
                <button class="btn btn-primary" id="update-star-btn">Update Star</button>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="head" onclick="toggleSection('analysis')">
              <h4>🔬 AI Analysis</h4><div class="meta">Analysis with ML prediction</div>
            </div>
            <div id="analysis" class="body">
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <button class="btn btn-primary" id="open-analysis-modal" style="width:100%">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="white" stroke-width="2"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="white" stroke-width="2"/></svg>
                  Open ML Analyzer
                </button>
                <button class="btn btn-warning" id="find-transits-btn">Find Transits</button>
              </div>
            </div>
          </div>
          <div style="height:18px"></div>
        </div>
      </div>
    </div>
    <button id="toggle-panel-btn" aria-label="Toggle panel" style="position:fixed;left:18px;top:18px;z-index:330;border-radius:12px;background:linear-gradient(90deg,#07b7da,#3b7ef6);color:white;padding:10px 14px;display:flex;gap:8px;align-items:center;box-shadow:0 12px 30px rgba(3,7,15,0.6);cursor:pointer;border:none;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="font-weight:800">Panel</div>
      <svg id="chev" style="margin-left:6px" class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#022" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    </button>
    <div id="tooltip"><div style="font-weight:700;color:#7fe0ff" id="tooltip-name"></div><div style="color:#cfefff;font-size:12px" id="tooltip-sub"></div></div>
    <div id="light-curve" role="status" aria-live="polite">
      <canvas id="curve-canvas"></canvas>
      <div style="display:flex;flex-direction:column;gap:6px;padding-left:8px;color:#cfefff;">
        <div style="font-size:13px;">Light Curve</div>
        <div style="font-size:12px">Planet: <b id="lc-planet">—</b></div>
        <div style="font-size:12px">Max dip: <b id="lc-depth">—</b></div>
      </div>
    </div>
    <div id="overlay" class="dim-overlay"></div>
    <div id="systems-modal" style="position:fixed;inset:0;display:none;z-index:400;align-items:center;justify-content:center;">
      <div style="width:90%;max-width:1000px;background:rgba(6,10,20,0.92);border-radius:12px;padding:18px;border:1px solid rgba(79,195,247,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="color:#bfefff;font-weight:800">Saved Systems</h3>
          <div style="display:flex;gap:8px;">
            <button id="close-systems-modal" class="btn btn-danger">Close</button>
          </div>
        </div>
        <div id="systems-modal-list" style="margin-top:12px;display:grid;grid-template-columns:1fr;gap:10px;max-height:60vh;overflow:auto;"></div>
      </div>
    </div>

    <!-- Analysis Modal -->
    <div id="analysis-modal" style="position:fixed;inset:0;display:none;z-index:400;align-items:center;justify-content:center;overflow-y:auto;padding:20px;">
      <div style="width:95%;max-width:1400px;background:linear-gradient(180deg, rgba(6,10,20,0.98), rgba(8,12,24,0.98));border-radius:16px;padding:24px;border:1px solid rgba(79,195,247,0.15);box-shadow:0 20px 60px rgba(0,0,0,0.8);margin:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <h3 style="color:#7fe0ff;font-weight:800;font-size:24px;margin-bottom:4px;">🔬 ML Exoplanet Analyzer</h3>
            <div style="color:#9fdcf6;font-size:13px;">Machine learning for planet classification</div>
          </div>
          <button id="close-analysis-modal" class="btn btn-danger">✕ Close</button>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
          <!-- Star Parameters -->
          <div style="background:rgba(255,255,255,0.02);border-radius:12px;padding:16px;border:1px solid rgba(79,195,247,0.08);">
            <h4 style="color:#ffd98f;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#ffd98f"/></svg>
              Star Parameters
            </h4>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Star Temperature (K)</label>
                <input id="analysis-star-temp" class="input" type="number" value="5778" placeholder="5778">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Star Radius (R☉)</label>
                <input id="analysis-star-radius" class="input" type="number" step="0.1" value="1.0" placeholder="1.0">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Star Gravity (log g)</label>
                <input id="analysis-star-gravity" class="input" type="number" step="0.1" value="4.44" placeholder="4.44">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Right Ascension (degrees)</label>
                <input id="analysis-ra" class="input" type="number" step="0.01" value="0" placeholder="0.00">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Declination (degrees)</label>
                <input id="analysis-dec" class="input" type="number" step="0.01" value="0" placeholder="0.00">
              </div>
            </div>
          </div>

          <!-- Planet Parameters -->
          <div style="background:rgba(255,255,255,0.02);border-radius:12px;padding:16px;border:1px solid rgba(79,195,247,0.08);">
            <h4 style="color:#8febff;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#8febff" stroke-width="2"/></svg>
              Planet Parameters
            </h4>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Orbital Period (days)</label>
                <input id="analysis-orbital-period" class="input" type="number" step="0.01" value="365.25" placeholder="365.25">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Object Radius (R⊕)</label>
                <input id="analysis-planet-radius" class="input" type="number" step="0.01" value="1.0" placeholder="1.0">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Insolation (S⊕)</label>
                <input id="analysis-insolation" class="input" type="number" step="0.01" value="1.0" placeholder="1.0">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Object Temperature (K)</label>
                <input id="analysis-planet-temp" class="input" type="number" value="288" placeholder="288">
              </div>
              <div>
                <label class="meta" style="display:block;margin-bottom:4px;">Telescope (0=K2, 1=Kepler, 2=TESS)</label>
                <select id="analysis-telescope" class="input">
                  <option value="0">K2</option>
                  <option value="1" selected>Kepler</option>
                  <option value="2">TESS</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <button class="btn btn-primary btn-large" id="run-ml-analysis-btn" style="flex:1;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/></svg>
            Run ML Analysis
          </button>
          <button class="btn btn-warning" id="visualize-analyzed-btn" style="flex:1;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/></svg>
            Visualize in 3D
          </button>
        </div>

        <!-- Results Area -->
        <div id="ml-results" style="display:none;">
          <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;border:1px solid rgba(79,195,247,0.06);margin-bottom:20px;">
            <h4 style="color:#7fe0ff;font-weight:700;margin-bottom:16px;font-size:18px;">🤖 ML Prediction</h4>
            <div id="ml-prediction-content"></div>
          </div>

          <!-- Visualization Canvas -->
          <div style="background:rgba(0,0,0,0.4);border-radius:12px;padding:16px;border:1px solid rgba(79,195,247,0.06);">
            <h4 style="color:#7fe0ff;font-weight:700;margin-bottom:12px;">📊 Probability Visualization</h4>
            <canvas id="prob-canvas" style="width:100%;height:300px;border-radius:8px;"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div id="focus-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-weight:800;font-size:16px;color:#7fe0ff;">Focus</div>
        <button id="exit-focus-btn" class="btn btn-danger" style="padding:6px 10px;">✕</button>
      </div>
      <div id="focus-info" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>
  </body>
`;
