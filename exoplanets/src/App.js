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

// Весь твой HTML (без <html>, <head>, <body>) вставляем в виде строки ↓↓↓
// (только вырежи <script> из него — его мы вынесем отдельно)
const htmlContent = `
  <body>
    <div id="canvas-container"></div>
    <div id="control-panel" aria-hidden="true">
      <canvas id="panel-particles"></canvas>
      <div class="panel-inner">
        <div class="panel-header">
          <div>
            <div class="panel-title">🌌 Exoplanet Transit Studio</div>
            <div class="panel-sub">GLSL Star • Bloom • Shadows • Editable System</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div class="meta">Local Save: <span id="saved-count">0</span></div>
          </div>
        </div>
        <div class="panel-body">
          <div class="section">
            <div class="head" onclick="toggleSection('systemQuick')">
              <h4>Раздел управления системами</h4><div class="meta">Сохранение / Загрузка</div>
            </div>
            <div id="systemQuick" class="body" >
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                <input id="system-name" class="input" type="text" placeholder="Название системы (например: Kepler-XYZ)" value="Default System">
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
              <h4>➕ Добавление планет</h4><div class="meta">Добавь планету в систему</div>
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
              <h4>📡 Система</h4><div class="meta">Просмотр планет и редактирование</div>
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
              <h4>⭐ Звезда</h4><div class="meta">Редактирование звезды</div>
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
              <h4>🔬 Анализ</h4><div class="meta">Проверка обитаемости и транзиты</div>
            </div>
            <div id="analysis" class="body">
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;gap:8px;">
                  <input id="hab-radius" class="input" type="number" min="0.1" step="0.1" placeholder="Radius (R⊕)" value="1.0">
                  <input id="hab-distance" class="input" type="number" min="0.1" step="0.1" placeholder="Distance (AU)" value="1.0">
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-primary" id="analyze-btn">Analyze</button>
                  <button class="btn btn-warning" id="find-transits-btn">Find Transits</button>
                  <button class="btn btn-primary" id="advanced-analysis-btn">Advanced Input</button>
                </div>
                <div id="analysis-output" class="meta" style="margin-top:6px;"></div>
              </div>
            </div>
          </div>
          <div style="height:18px"></div>
        </div>
      </div>
    </div>
    <button id="toggle-panel-btn" aria-label="Toggle panel" style="position:fixed;left:18px;top:18px;z-index:330;border-radius:12px;background:linear-gradient(90deg,#07b7da,#3b7ef6);color:white;padding:10px 14px;display:flex;gap:8px;align-items:center;box-shadow:0 12px 30px rgba(3,7,15,0.6);cursor:pointer;border:none;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="font-weight:800">Панель</div>
      <svg id="chev" style="margin-left:6px" class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#022" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    </button>
    <div id="tooltip"><div style="font-weight:700;color:#7fe0ff" id="tooltip-name"></div><div style="color:#cfefff;font-size:12px" id="tooltip-sub"></div></div>
    <div id="light-curve" role="status" aria-live="polite">
      <canvas id="curve-canvas"></canvas>
      <div style="display:flex;flex-direction:column;gap:6px;padding-left:8px;color:#cfefff;">
        <div style="font-size:13px;">Кривая блеска</div>
        <div style="font-size:12px">Планета: <b id="lc-planet">—</b></div>
        <div style="font-size:12px">Макс. провал: <b id="lc-depth">—</b></div>
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
    <div id="analysis-modal" style="position:fixed;inset:0;display:none;z-index:400;align-items:center;justify-content:center;">
      <div style="width:90%;max-width:600px;background:rgba(6,10,20,0.92);border-radius:12px;padding:18px;border:1px solid rgba(79,195,247,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="color:#bfefff;font-weight:800">Input System Data</h3>
          <button id="close-analysis-modal" class="btn btn-danger">Close</button>
        </div>
        <div style="margin-top:12px;">
          <form id="analysis-form">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <input class="input" id="phys-meaning" type="text" placeholder="Physical meaning">
              <input class="input" id="orb-period" type="number" placeholder="Orbital period (days)">
              <input class="input" id="radius-obj" type="number" placeholder="Radius Object (R⊕)">
              <input class="input" id="insolation" type="number" placeholder="Insolation (W/m²)">
              <input class="input" id="temp-obj" type="number" placeholder="Temperature object (K)">
              <input class="input" id="temp-star" type="number" placeholder="Temperature star (K)">
              <input class="input" id="radius-star" type="number" placeholder="Radius star (R☉)">
              <input class="input" id="grav-star" type="number" placeholder="Gravity star (m/s²)">
              <input class="input" id="ra" type="text" placeholder="Right ascension">
              <input class="input" id="dec" type="text" placeholder="Declination">
              <button type="submit" class="btn btn-primary" id="submit-analysis">Analyze and Visualize</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <!-- Focus Panel -->
    <div id="focus-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-weight:800;font-size:16px;color:#7fe0ff;">Фокус</div>
        <button id="exit-focus-btn" class="btn btn-danger" style="padding:6px 10px;">✕</button>
      </div>
      <div id="focus-info" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>
  </body>
`;
