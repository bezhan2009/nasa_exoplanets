/* FULL CODE WITH API INTEGRATION */
const MAX_PLANETS = 20;
const API_URL = 'http://localhost:8000/predict';

let scene, camera, renderer, composer, controls;
let star, starLight, directionalLight;
let planetsData = [];
let raycaster, mouse = new THREE.Vector2();
let time = 0;
let animationSpeed = 1.0;
let transitActive = false;
let transitingPlanet = null;
let brightnessHistory = [];
const historyMax = 220;
const TRANSIT_ALIGNMENT_THRESHOLD = 0.985;
const materialMap = { earth: 0, gas: 1, lava: 2 };

let focusedObject = null;
let cameraInitialPos = new THREE.Vector3();
let cameraInitialTarget = new THREE.Vector3();
let mlPredictionData = null;

// GLSL Shaders (same as before)
const starVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  void main(){
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position,1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const starFragmentShader = `
  #define MAX_PLANETS 20
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 planetPositions[MAX_PLANETS];
  uniform float planetRadii[MAX_PLANETS];
  uniform int planetCount;
  uniform vec3 starPosition;
  uniform float starRadius;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for(int i=0;i<6;i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vec3 pos = vWorldPosition * 0.7;
    float n1 = fbm(pos + time*0.55);
    float n2 = fbm(pos*1.8 - time*0.35);
    float swirl = sin(atan(vPosition.z, vPosition.x)*3.5 + time*1.5 + n1*3.0)*0.5 + 0.5;
    float pattern = mix(n1, n2, 0.5) * 0.85 + swirl*0.25;
    vec3 base = mix(color1, color2, smoothstep(-0.2,1.0,pattern));
    base = mix(base, color3, pow(pattern, 1.45));
    float pulse = 0.9 + 0.28 * sin(time*1.1 + pattern*3.14);
    base *= pulse * 1.35;
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
    base += mix(color2, color3, fresnel) * fresnel * 1.5;
    float radial = length(vUv - 0.5) * 2.0;
    base *= (1.0 - radial*0.36);
    float flare = pow(max(0.0, snoise(vPosition*2.0 + time*2.0)), 6.0);
    base += vec3(1.0,0.92,0.7) * flare * 2.4;
    float shadowMask = 1.0;
    for(int i=0; i<MAX_PLANETS; i++){
      if(i >= planetCount) break;
      vec3 planetPos = planetPositions[i];
      float planetR = planetRadii[i];
      vec3 toStar = vWorldPosition - starPosition;
      vec3 toPlanet = planetPos - starPosition;
      float dist = length(cross(toStar, toPlanet)) / length(toStar);
      float depth = dot(normalize(toStar), normalize(toPlanet));
      if(depth > 0.92 && dist < planetR * 1.2){
        float maskStrength = smoothstep(planetR * 1.2, planetR * 0.8, dist);
        shadowMask *= (1.0 - maskStrength * 0.85);
      }
    }
    base *= shadowMask;
    base = clamp(base, 0.0, 2.8);
    gl_FragColor = vec4(base, 1.0);
  }
`;

const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  void main(){
    vUv = uv;vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position,1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const planetFragmentShader = `
  uniform float time;
  uniform vec3 baseColor;
  uniform float glowIntensity;
  uniform int materialType;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0 - 2.0*f);
    float a = hash(i);
    float b = hash(i+vec2(1.0,0.0));
    float c = hash(i+vec2(0.0,1.0));
    float d = hash(i+vec2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0; float a = 0.5;
    for(int i=0;i<5;i++){ v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
  void main(){
    float continents = fbm(vUv*8.0 + time*0.02);
    float clouds = fbm(vUv*12.0 + time*0.06);
    float lat = abs(vUv.y - 0.5)*2.0;
    float ice = smoothstep(0.75, 0.92, lat);
    if(materialType==1){
      continents = 0.0;
      clouds = smoothstep(0.28,0.7, fbm(vUv*6.0 + time*0.05));
      ice = 0.0;
    } else if(materialType==2){
      continents = smoothstep(0.45,0.62,continents);
      clouds = 0.0;
      ice = 0.0;
    } else {
      continents = smoothstep(0.4,0.6,continents);
      clouds = smoothstep(0.45,0.65,clouds);
    }
    vec3 ocean = baseColor * 0.6;
    vec3 land = baseColor * 1.25;
    if(materialType==2){ ocean = vec3(0.82,0.24,0.12); land = vec3(1.0,0.5,0.2); }
    vec3 surface = mix(ocean, land, continents);
    surface = mix(surface, vec3(0.96,0.98,1.0), ice);
    vec3 cloudColor = vec3(1.0);
    vec3 color = mix(surface, cloudColor, clouds*0.35);
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    float atmo = pow(1.0 - abs(dot(vNormal, viewDir)), 2.6);
    color += baseColor * atmo * glowIntensity * 1.12;
    vec3 lightDir = normalize(vec3(0.0)-vWorldPosition);
    float day = max(0.0, dot(vNormal, lightDir));
    color *= (0.58*day + 0.42);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0012);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
  camera.position.set(0, 14, 40);
  cameraInitialPos.copy(camera.position);
  cameraInitialTarget.set(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  sharedPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  sharedPreviewRenderer.setSize(110, 64);
  sharedPreviewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.8, 0.6, 0.9);
  bloomPass.threshold = 0.04;
  bloomPass.strength = 1.5;
  bloomPass.radius = 0.9;
  composer.addPass(bloomPass);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 6;
  controls.maxDistance = Infinity;
  controls.enablePan = false;
  raycaster = new THREE.Raycaster();
  starLight = new THREE.PointLight(0xfff8d2, 2.2, 1000, 2);
  starLight.position.set(0,0,0);
  scene.add(starLight);
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.16);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -80;
  directionalLight.shadow.camera.right = 80;
  directionalLight.shadow.camera.top = 80;
  directionalLight.shadow.camera.bottom = -80;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  createStar();
  createBackdrop();
  createInitialPlanets();
  createStarfield();
  bindUI();
  setupChartCanvas();
  initPanelParticles();
  loadSavedSystemsList();
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onClick);
  animate();
}

function createStar() {
  const geom = new THREE.SphereBufferGeometry(3.0, 256, 256);
  const planetPositions = new Array(MAX_PLANETS).fill(0).map(() => new THREE.Vector3(0, 0, 0));
  const planetRadii = new Array(MAX_PLANETS).fill(0);
  const mat = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xFFF3A0) },
      color2: { value: new THREE.Color(0xFF9A3B) },
      color3: { value: new THREE.Color(0xFF3B1F) },
      planetPositions: { value: planetPositions },
      planetRadii: { value: planetRadii },
      planetCount: { value: 0 },
      starPosition: { value: new THREE.Vector3(0, 0, 0) },
      starRadius: { value: 3.0 }
    }
  });
  star = new THREE.Mesh(geom, mat);
  star.castShadow = false;
  star.receiveShadow = true;
  star.userData = { type: 'star', name: 'Central Star', size: 3.0 };
  scene.add(star);
  const corona = new THREE.Mesh(
    new THREE.SphereBufferGeometry(3.6, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0xffc290, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending })
  );
  corona.renderOrder = 1;
  corona.userData = { type: 'corona' };
  scene.add(corona);
}

function createBackdrop() {
  const geo = new THREE.SphereBufferGeometry(1800, 32, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000008, side: THREE.BackSide });
  const back = new THREE.Mesh(geo, mat);
  scene.add(back);
}

function createStarfield() {
  const pts = 5000;
  const positions = new Float32Array(pts * 3);
  for (let i=0;i<pts;i++){
    positions[i*3+0] = (Math.random()-0.5) * 2400;
    positions[i*3+1] = (Math.random()-0.5) * 1800;
    positions[i*3+2] = (Math.random()-0.5) * 2400;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.6, color: 0xffffff, transparent:true, opacity: 0.95 });
  const points = new THREE.Points(g, pMat);
  scene.add(points);
}

function createInitialPlanets() {
  const initial = [
    { name:'Kepler-A', size:0.9, distance:8, speed:0.016, color:0x4fc3f7, glow:0.22, materialType:'earth' },
    { name:'Kepler-B', size:1.6, distance:14, speed:0.0085, color:0xff6b6b, glow:0.34, materialType:'gas' },
  ];
  initial.forEach((p,i)=> createPlanet(p.name,p.size,p.distance,p.speed,p.color,p.glow,p.materialType,i*Math.PI*0.5));
}

function createPlanet(name, size, distance, speed, color, glowIntensity, materialType, initialAngle=0) {
  const geom = new THREE.SphereBufferGeometry(size, 96, 96);
  const mat = new THREE.ShaderMaterial({
    vertexShader: planetVertexShader,
    fragmentShader: planetFragmentShader,
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(color) },
      glowIntensity: { value: glowIntensity },
      materialType: { value: materialMap[materialType] || 0 }
    }
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.position.set(Math.cos(initialAngle)*distance, 0, Math.sin(initialAngle)*distance);
  mesh.userData = { type: 'planet', name, size, distance, speed, color, glowIntensity, materialType };
  scene.add(mesh);
  const points = [];
  for (let i=0;i<=360;i++){
    const a = (i/360) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a)*distance, 0, Math.sin(a)*distance));
  }
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.08, depthWrite: false });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  orbitLine.renderOrder = -1;
  scene.add(orbitLine);
  const id = 'planet_' + Date.now() + '_' + Math.floor(Math.random()*10000);
  planetsData.push({
    id, name, size, distance, speed, color, glowIntensity, materialType,
    angle: initialAngle, mesh, orbitLine
  });
  updateSystemListUI();
  updateStarUniforms();
  return id;
}

function updateStarUniforms() {
  if (!star || !star.material || !star.material.uniforms) return;
  const positions = [];
  const radii = [];
  for (let i = 0; i < MAX_PLANETS; i++) {
    if (i < planetsData.length) {
      positions.push(planetsData[i].mesh.position.clone());
      radii.push(planetsData[i].size);
    } else {
      positions.push(new THREE.Vector3(0, 0, 0));
      radii.push(0);
    }
  }
  star.material.uniforms.planetPositions.value = positions;
  star.material.uniforms.planetRadii.value = radii;
  star.material.uniforms.planetCount.value = planetsData.length;
}

function detectTransit() {
  const camDir = new THREE.Vector3().subVectors(camera.position, star.position).normalize();
  let best = null;
  let bestDot = -1;
  for (const p of planetsData) {
    const pDir = new THREE.Vector3().subVectors(p.mesh.position, star.position).normalize();
    const dot = Math.abs(camDir.dot(pDir));
    const projY = Math.abs(p.mesh.position.y);
    if (dot > bestDot && projY < 1.8) {
      best = p;
      bestDot = dot;
    }
  }
  if (best && bestDot >= TRANSIT_ALIGNMENT_THRESHOLD) return { planet: best, alignment: bestDot };
  return null;
}

function computeBrightness(candidate) {
  if (!candidate) return 1.0;
  const p = candidate.planet;
  const alignment = (candidate.alignment - TRANSIT_ALIGNMENT_THRESHOLD) / (1 - TRANSIT_ALIGNMENT_THRESHOLD);
  const maxDip = Math.min(0.92, Math.pow(p.size / star.userData.size, 2) * 0.95);
  const dip = maxDip * Math.pow(Math.sin(Math.PI * alignment), 1.2);
  return 1 - dip;
}

let chartCanvas, chartCtx;
function setupChartCanvas() {
  chartCanvas = document.getElementById('curve-canvas');
  chartCtx = chartCanvas.getContext('2d');
  function resize() {
    const rect = document.getElementById('light-curve').getBoundingClientRect();
    chartCanvas.width = Math.floor(Math.min(420, rect.width * 0.68) * devicePixelRatio);
    chartCanvas.height = Math.floor(140 * devicePixelRatio);
  }
  window.addEventListener('resize', resize);
  resize();
  brightnessHistory = Array.from({length: 80}, ()=>1.0);
  drawChart();
}

function drawChart() {
  if (!chartCtx) return;
  const w = chartCanvas.width, h = chartCanvas.height;
  chartCtx.clearRect(0,0,w,h);
  const grd = chartCtx.createLinearGradient(0,0,0,h);
  grd.addColorStop(0, 'rgba(10,12,18,0.0)');
  grd.addColorStop(1, 'rgba(10,12,18,0.0)');
  chartCtx.fillStyle = grd;
  chartCtx.fillRect(0,0,w,h);
  const padding = 12 * devicePixelRatio;
  const plotW = w - padding*2;
  const plotH = h - padding*2;
  const len = brightnessHistory.length;
  const maxVal = Math.max(...brightnessHistory);
  const minVal = Math.min(...brightnessHistory);
  const targetMax = Math.max(1.02, maxVal + 0.002);
  const targetMin = Math.min(0.7, minVal - 0.002);
  chartCtx.beginPath();
  for (let i=0;i<len;i++){
    const t = i/(len-1);
    const x = padding + t*plotW;
    const v = (brightnessHistory[i] - targetMin) / (targetMax - targetMin);
    const y = padding + (1 - v) * plotH;
    if (i===0) chartCtx.moveTo(x,y); else chartCtx.lineTo(x,y);
  }
  chartCtx.lineTo(padding+plotW, padding+plotH);
  chartCtx.lineTo(padding, padding+plotH);
  chartCtx.closePath();
  const g = chartCtx.createLinearGradient(0,padding,0,padding+plotH);
  g.addColorStop(0, 'rgba(79,195,247,0.24)');
  g.addColorStop(1, 'rgba(79,195,247,0.02)');
  chartCtx.fillStyle = g;
  chartCtx.fill();
  chartCtx.beginPath();
  for (let i=0;i<len;i++){
    const t = i/(len-1);
    const x = padding + t*plotW;
    const v = (brightnessHistory[i] - targetMin) / (targetMax - targetMin);
    const y = padding + (1 - v) * plotH;
    if (i===0) chartCtx.moveTo(x,y); else chartCtx.lineTo(x,y);
  }
  chartCtx.strokeStyle = 'rgba(140,235,255,0.98)';
  chartCtx.lineWidth = 2*devicePixelRatio;
  chartCtx.stroke();
  const lastIdx = len-1;
  const t = lastIdx/(len-1);
  const x = padding + t*plotW;
  const v = (brightnessHistory[lastIdx] - targetMin) / (targetMax - targetMin);
  const y = padding + (1 - v) * plotH;
  chartCtx.beginPath();
  chartCtx.fillStyle = 'rgba(255,255,255,0.95)';
  chartCtx.arc(x, y, 3*devicePixelRatio, 0, Math.PI*2);
  chartCtx.fill();
  chartCtx.font = `${10*devicePixelRatio}px Inter, Arial`;
  chartCtx.fillStyle = 'rgba(200,255,255,0.85)';
  chartCtx.textAlign = 'left';
  chartCtx.fillText(targetMax.toFixed(3), padding, padding - 4*devicePixelRatio);
  chartCtx.fillText(targetMin.toFixed(3), padding, padding + plotH + 12*devicePixelRatio);
}

/* PANEL PARTICLES */
let panelParticlesCanvas, panelParticlesCtx, panelParticles = [];
let panelOpen = false;
function initPanelParticles() {
  panelParticlesCanvas = document.getElementById('panel-particles');
  if (!panelParticlesCanvas) return;
  panelParticlesCtx = panelParticlesCanvas.getContext('2d');
  function resize(){
    const parent = panelParticlesCanvas.parentElement;
    panelParticlesCanvas.width = Math.max(360, parent.clientWidth) * devicePixelRatio;
    panelParticlesCanvas.height = parent.clientHeight * devicePixelRatio;
    panelParticlesCanvas.style.width = parent.clientWidth + 'px';
    panelParticlesCanvas.style.height = parent.clientHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  const count = 220;
  panelParticles = [];
  for (let i=0;i<count;i++){
    panelParticles.push({
      x: Math.random()*panelParticlesCanvas.width,
      y: Math.random()*panelParticlesCanvas.height,
      vx: (Math.random()-0.5)*0.7,
      vy: (Math.random()-0.5)*0.7,
      tx: Math.random()*panelParticlesCanvas.width,
      ty: Math.random()*panelParticlesCanvas.height,
      s: Math.random()*2.2 + 0.6,
      a: 0.06 + Math.random()*0.6
    });
  }
  requestAnimationFrame(drawPanelParticles);
}

let particleAssembling = false;
function assemblePanelParticles() {
  particleAssembling = true;
  const w = panelParticlesCanvas.width, h = panelParticlesCanvas.height;
  const cols = Math.floor(Math.sqrt(panelParticles.length) * (w/(w+h)) * 1.3) || 12;
  const rows = Math.ceil(panelParticles.length / cols);
  let idx = 0;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      if (idx >= panelParticles.length) break;
      const tx = (c + 0.5) * (w/cols);
      const ty = (r + 0.5) * (h/rows);
      panelParticles[idx].tx = tx + (Math.random()-0.5)*8;
      panelParticles[idx].ty = ty + (Math.random()-0.5)*8;
      idx++;
    }
  }
}

function dispersePanelParticles() {
  particleAssembling = false;
  for (const p of panelParticles) {
    p.tx = Math.random()*panelParticlesCanvas.width;
    p.ty = Math.random()*panelParticlesCanvas.height;
  }
}

let panelMouseX = 0, panelMouseY = 0;
function onPanelMouseMove(e) {
  const rect = panelParticlesCanvas.getBoundingClientRect();
  panelMouseX = (e.clientX - rect.left) / rect.width - 0.5;
  panelMouseY = (e.clientY - rect.top) / rect.height - 0.5;
}

function drawPanelParticles() {
  if (!panelParticlesCtx) return requestAnimationFrame(drawPanelParticles);
  const ctx = panelParticlesCtx;
  const w = panelParticlesCanvas.width, h = panelParticlesCanvas.height;
  ctx.clearRect(0,0,w,h);
  for (const p of panelParticles) {
    p.vx += (p.tx - p.x) * 0.0016 + (Math.random()-0.5)*0.02;
    p.vy += (p.ty - p.y) * 0.0016 + (Math.random()-0.5)*0.02;
    p.vx += panelMouseX * 0.01;
    p.vy += panelMouseY * 0.01;
    p.vx *= 0.92; p.vy *= 0.92;
    p.x += p.vx; p.y += p.vy;
    if (p.x < -20) p.x = w + 20;
    if (p.x > w + 20) p.x = -20;
    if (p.y < -20) p.y = h + 20;
    if (p.y > h + 20) p.y = -20;
    ctx.beginPath();
    ctx.fillStyle = `rgba(79,195,247,${p.a})`;
    ctx.arc(p.x, p.y, p.s*devicePixelRatio, 0, Math.PI*2);
    ctx.fill();
  }
  requestAnimationFrame(drawPanelParticles);
}

/* UI BINDING */
function bindUI() {
  const panel = document.getElementById('control-panel');
  const toggleBtn = document.getElementById('toggle-panel-btn');
  const chev = document.getElementById('chev');
  toggleBtn.addEventListener('click', ()=>{
    const open = !panel.classList.contains('open');
    if (open) openPanel(); else closePanel();
  });
  function openPanel(){
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    panelOpen = true;
    assemblePanelParticles();
    panel.addEventListener('mousemove', onPanelMouseMove);
    chev.style.transform = 'rotate(180deg)';
  }
  function closePanel(){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    panelOpen = false;
    dispersePanelParticles();
    panel.removeEventListener('mousemove', onPanelMouseMove);
    chev.style.transform = 'rotate(0deg)';
  }
  setTimeout(()=> openPanel(), 420);
  document.getElementById('save-system-btn').addEventListener('click', saveCurrentSystem);
  document.getElementById('open-systems-btn').addEventListener('click', openSystemsModal);
  document.getElementById('clear-systems-btn').addEventListener('click', clearSavedSystems);
  const glowRange = document.getElementById('new-planet-glow');
  glowRange.addEventListener('input', ()=> document.getElementById('new-glow-value').textContent = glowRange.value);
  document.getElementById('add-planet-btn').addEventListener('click', (e)=> { e.preventDefault(); addPlanetFromForm(); });
  document.getElementById('spawn-random-btn').addEventListener('click', spawnRandomPlanet);
  document.getElementById('find-transits-btn').addEventListener('click', ()=> {
    const cand = detectTransit();
    if (cand) flashNotice(`Transit candidate: ${cand.planet.name}`);
    else flashNotice('No transit currently aligned');
  });
  document.getElementById('open-analysis-modal').addEventListener('click', openAnalysisModal);
  document.getElementById('close-analysis-modal').addEventListener('click', closeAnalysisModal);
  document.getElementById('run-ml-analysis-btn').addEventListener('click', runMLAnalysis);
  document.getElementById('visualize-analyzed-btn').addEventListener('click', visualizeAnalyzedSystem);
  document.getElementById('close-systems-modal').addEventListener('click', closeSystemsModal);
  document.getElementById('export-system-btn').addEventListener('click', exportCurrentSystemJSON);
  document.getElementById('import-system-btn').addEventListener('click', importSystemPrompt);
  document.getElementById('update-star-btn').addEventListener('click', updateStar);
  document.getElementById('exit-focus-btn').addEventListener('click', exitFocus);
}

function toggleSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const parent = el.parentElement;
  const isOpen = parent.classList.contains('open');
  if (isOpen) { parent.classList.remove('open'); el.classList.remove('open'); }
  else { parent.classList.add('open'); el.classList.add('open'); }
}

function openAnalysisModal() {
  document.getElementById('analysis-modal').style.display = 'flex';
  document.getElementById('overlay').classList.add('show');
}

function closeAnalysisModal() {
  document.getElementById('analysis-modal').style.display = 'none';
  document.getElementById('overlay').classList.remove('show');
}

/* ML ANALYSIS WITH API */
async function runMLAnalysis() {
  const btn = document.getElementById('run-ml-analysis-btn');
  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  
  try {
    const orbitalPeriod = parseFloat(document.getElementById('analysis-orbital-period').value) || 0.5;
    const planetRadius = parseFloat(document.getElementById('analysis-planet-radius').value) || 1.0;
    const insolation = parseFloat(document.getElementById('analysis-insolation').value) || 1.0;
    const planetTemp = parseFloat(document.getElementById('analysis-planet-temp').value) || 288;
    const starTemp = parseFloat(document.getElementById('analysis-star-temp').value) || 5778;
    const starRadius = parseFloat(document.getElementById('analysis-star-radius').value) || 1.0;
    const starGravity = parseFloat(document.getElementById('analysis-star-gravity').value) || 4.44;
    const ra = parseFloat(document.getElementById('analysis-ra').value) || 0;
    const dec = parseFloat(document.getElementById('analysis-dec').value) || 0;
    const telescope = parseInt(document.getElementById('analysis-telescope').value) || 0;
    
    const payload = {
      orbital_period: orbitalPeriod,
      planet_radius: planetRadius,
      insolation_flux: insolation,
      equilibrium_temp: planetTemp,
      stellar_teff: starTemp,
      stellar_radius: starRadius,
      stellar_logg: starGravity,
      ra: ra,
      dec: dec,
      telescope_encoded: telescope
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    mlPredictionData = {
      prediction: data.prediction,
      probabilities: data.probabilities,
      inputData: payload
    };
    
    displayMLResults(data);
    drawProbabilityChart(data.probabilities);
    
    flashNotice('ML analysis completed');
  } catch (error) {
    console.error('ML Analysis Error:', error);
    flashNotice('Error: ' + error.message, 3000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/></svg> Run ML Analysis';
  }
}

function displayMLResults(data) {
  const predictionMap = {
    '0': { label: 'CONFIRMED', color: '#51cf66', icon: '✓' },
    '1': { label: 'CANDIDATE', color: '#ffd93d', icon: '?' },
    '2': { label: 'FALSE_POSITIVE', color: '#ff6b6b', icon: '✗' }
  };
  
  const pred = predictionMap[data.prediction] || predictionMap['1'];
  const probs = data.probabilities;
  
  const content = document.getElementById('ml-prediction-content');
  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;">
      <div style="background:rgba(${pred.color === '#51cf66' ? '81,207,102' : pred.color === '#ffd93d' ? '255,217,61' : '255,107,107'},0.12);border-radius:12px;padding:20px;border:2px solid ${pred.color};text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">${pred.icon}</div>
        <div style="color:${pred.color};font-weight:800;font-size:20px;margin-bottom:8px;">${pred.label}</div>
        <div style="color:#cfefff;font-size:14px;">Model Prediction</div>
      </div>
      
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="background:rgba(81,207,102,0.08);border-radius:10px;padding:14px;border:1px solid rgba(81,207,102,0.3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:#cfefff;font-weight:600;">CONFIRMED</span>
            <span style="color:#51cf66;font-weight:700;font-size:18px;">${(probs.CONFIRMED * 100).toFixed(2)}%</span>
          </div>
          <div style="background:rgba(0,0,0,0.3);height:10px;border-radius:5px;overflow:hidden;">
            <div style="width:${probs.CONFIRMED * 100}%;height:100%;background:linear-gradient(90deg, #51cf66, #40c057);transition:width 800ms ease;"></div>
          </div>
        </div>
        
        <div style="background:rgba(255,217,61,0.08);border-radius:10px;padding:14px;border:1px solid rgba(255,217,61,0.3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:#cfefff;font-weight:600;">CANDIDATE</span>
            <span style="color:#ffd93d;font-weight:700;font-size:18px;">${(probs.CANDIDATE * 100).toFixed(2)}%</span>
          </div>
          <div style="background:rgba(0,0,0,0.3);height:10px;border-radius:5px;overflow:hidden;">
            <div style="width:${probs.CANDIDATE * 100}%;height:100%;background:linear-gradient(90deg, #ffd93d, #fcc419);transition:width 800ms ease;"></div>
          </div>
        </div>
        
        <div style="background:rgba(255,107,107,0.08);border-radius:10px;padding:14px;border:1px solid rgba(255,107,107,0.3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:#cfefff;font-weight:600;">FALSE_POSITIVE</span>
            <span style="color:#ff6b6b;font-weight:700;font-size:18px;">${(probs.FALSE_POSITIVE * 100).toFixed(2)}%</span>
          </div>
          <div style="background:rgba(0,0,0,0.3);height:10px;border-radius:5px;overflow:hidden;">
            <div style="width:${probs.FALSE_POSITIVE * 100}%;height:100%;background:linear-gradient(90deg, #ff6b6b, #ff5252);transition:width 800ms ease;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('ml-results').style.display = 'block';
}

function drawProbabilityChart(probs) {
  const canvas = document.getElementById('prob-canvas');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const w = canvas.width;
  const h = canvas.height;
  const padding = 40 * devicePixelRatio;
  const chartW = w - padding * 2;
  const chartH = h - padding * 2;
  
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, 'rgba(10,15,30,0.4)');
  bgGrad.addColorStop(1, 'rgba(5,8,15,0.4)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
  
  const data = [
    { label: 'CONFIRMED', value: probs.CONFIRMED, color: '#51cf66' },
    { label: 'CANDIDATE', value: probs.CANDIDATE, color: '#ffd93d' },
    { label: 'FALSE_POSITIVE', value: probs.FALSE_POSITIVE, color: '#ff6b6b' }
  ];
  
  const barWidth = chartW / data.length * 0.7;
  const barSpacing = chartW / data.length;
  
  data.forEach((item, i) => {
    const x = padding + i * barSpacing + barSpacing / 2 - barWidth / 2;
    const barHeight = item.value * chartH;
    const y = padding + chartH - barHeight;
    
    const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
    grad.addColorStop(0, item.color);
    grad.addColorStop(1, item.color + '80');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barHeight);
    
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${14 * devicePixelRatio}px Inter, Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(item.value * 100).toFixed(1)}%`, x + barWidth / 2, y - 10 * devicePixelRatio);
    
    ctx.fillStyle = '#cfefff';
    ctx.font = `${11 * devicePixelRatio}px Inter, Arial`;
    const labelY = padding + chartH + 20 * devicePixelRatio;
    ctx.fillText(item.label, x + barWidth / 2, labelY);
  });
}

function visualizeAnalyzedSystem() {
  if (!mlPredictionData) {
    flashNotice('Run ML analysis first');
    return;
  }
  
  const data = mlPredictionData.inputData;
  
  for (const p of planetsData) {
    scene.remove(p.mesh);
    scene.remove(p.orbitLine);
  }
  planetsData = [];
  
  const starSize = data.stellar_radius;
  star.geometry.dispose();
  star.geometry = new THREE.SphereBufferGeometry(starSize, 256, 256);
  star.userData.size = starSize;
  
  let c1, c2, c3;
  if (data.stellar_teff > 7500) {
    c1 = new THREE.Color(0xA2C5FF);
    c2 = new THREE.Color(0xFFFFFF);
    c3 = new THREE.Color(0xC5D9FF);
  } else if (data.stellar_teff > 6000) {
    c1 = new THREE.Color(0xF8F7FF);
    c2 = new THREE.Color(0xFFF4E8);
    c3 = new THREE.Color(0xFFE6C7);
  } else if (data.stellar_teff > 5200) {
    c1 = new THREE.Color(0xFFF3A0);
    c2 = new THREE.Color(0xFF9A3B);
    c3 = new THREE.Color(0xFF3B1F);
  } else if (data.stellar_teff > 3700) {
    c1 = new THREE.Color(0xFFE6C7);
    c2 = new THREE.Color(0xFFB380);
    c3 = new THREE.Color(0xFF8247);
  } else {
    c1 = new THREE.Color(0xFFB380);
    c2 = new THREE.Color(0xFF6B3B);
    c3 = new THREE.Color(0xFF3B1F);
  }
  
  star.material.uniforms.color1.value = c1;
  star.material.uniforms.color2.value = c2;
  star.material.uniforms.color3.value = c3;
  star.material.uniforms.starRadius.value = starSize;
  
  const corona = scene.children.find(child => child.userData && child.userData.type === 'corona');
  if (corona) {
    corona.geometry.dispose();
    corona.geometry = new THREE.SphereBufferGeometry(starSize * 1.2, 64, 64);
  }
  
  const predictionMap = {
    '0': 'CONFIRMED',
    '1': 'CANDIDATE',
    '2': 'FALSE_POSITIVE'
  };
  const predLabel = predictionMap[mlPredictionData.prediction] || 'UNKNOWN';
  
  const planetSize = data.planet_radius;
  const semiMajorAxis = Math.pow(data.orbital_period / 365.25, 2/3);
  const planetDistance = Math.max(starSize + planetSize + 5, semiMajorAxis * 15);
  const planetSpeed = 0.01 / Math.sqrt(planetDistance / 10);
  
  let planetColor, materialType;
  if (data.planet_radius < 1.25) {
    planetColor = 0x4FC3F7;
    materialType = 'earth';
  } else if (data.planet_radius < 2.0) {
    planetColor = 0x66BB6A;
    materialType = 'earth';
  } else if (data.planet_radius < 6.0) {
    planetColor = 0xAB47BC;
    materialType = 'gas';
  } else {
    planetColor = 0xFF7043;
    materialType = 'gas';
  }
  
  if (mlPredictionData.prediction === '2') {
    planetColor = 0xff6b6b;
  } else if (mlPredictionData.prediction === '0') {
    planetColor = 0x51cf66;
  }
  
  const planetName = `ML-${predLabel}`;
  createPlanet(planetName, planetSize, planetDistance, planetSpeed, planetColor, 0.3, materialType, 0);
  
  camera.position.set(0, planetDistance * 0.5, planetDistance * 2 + starSize * 2);
  controls.target.set(0, 0, 0);
  controls.update();
  
  closeAnalysisModal();
  flashNotice(`System visualized: ${predLabel}`);
}

/* SYSTEM PERSISTENCE (shortened for space) */
function saveCurrentSystem() {
  const name = (document.getElementById('system-name').value || 'Unnamed').trim();
  if (!name) { alert('Enter system name'); return; }
  const sys = {
    name,
    planets: planetsData.map(p => ({
      name: p.name, size: p.size, distance: p.distance, speed: p.speed, color: p.color, glowIntensity: p.glowIntensity, materialType: p.materialType, angle: p.angle
    })),
    timestamp: Date.now()
  };
  const arr = JSON.parse(localStorage.getItem('exoplanetSystems') || '[]');
  const idx = arr.findIndex(s => s.name === name);
  if (idx >= 0) arr[idx] = sys; else arr.push(sys);
  localStorage.setItem('exoplanetSystems', JSON.stringify(arr));
  loadSavedSystemsList();
  flashNotice(`System "${name}" saved`);
}

function loadSavedSystemsList() {
  const arr = JSON.parse(localStorage.getItem('exoplanetSystems') || '[]');
  document.getElementById('saved-count').textContent = arr.length;
  const container = document.getElementById('saved-systems-list');
  container.innerHTML = '';
  if (!arr.length) {
    container.innerHTML = '<div class="meta">No saved systems</div>';
    return;
  }
  arr.forEach((s, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:6px';
    const left = document.createElement('div');
    left.style.cssText = 'flex:1';
    left.innerHTML = `<div style="font-weight:700;color:#dff7ff">${s.name}</div><div style="font-size:11px;color:#cfefff">${s.planets.length} planets</div>`;
    row.appendChild(left);
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-primary';
    loadBtn.textContent = 'Load';
    loadBtn.style.padding = '6px 10px';
    loadBtn.addEventListener('click', ()=> { loadSystem(idx); flashNotice(`Loaded ${s.name}`); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = '×';
    delBtn.style.padding = '6px 12px';
    delBtn.addEventListener('click', ()=> deleteSaved(idx));
    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function openSystemsModal(){
  document.getElementById('systems-modal').style.display = 'flex';
  document.getElementById('overlay').classList.add('show');
  populateSystemsModal();
}

function closeSystemsModal(){
  document.getElementById('systems-modal').style.display = 'none';
  document.getElementById('overlay').classList.remove('show');
}

function populateSystemsModal(){
  const arr = JSON.parse(localStorage.getItem('exoplanetSystems') || '[]');
  const list = document.getElementById('systems-modal-list');
  list.innerHTML = '';
  if (!arr.length) { list.innerHTML = '<div class="meta">No saved systems</div>'; return; }
  arr.forEach((s, idx) => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px';
    const meta =document.createElement('div');
    meta.innerHTML = `<div style="font-weight:800;color:#dff7ff">${s.name}</div><div style="font-size:12px;color:#cfefff">${s.planets.length} planets • ${new Date(s.timestamp).toLocaleString()}</div>`;
    item.appendChild(meta);
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-primary';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', ()=> { loadSystem(idx); closeSystemsModal(); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> { deleteSaved(idx); populateSystemsModal(); });
    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

function deleteSaved(idx) {
  const arr = JSON.parse(localStorage.getItem('exoplanetSystems') || '[]');
  if (!arr[idx]) return;
  if (!confirm(`Delete saved system "${arr[idx].name}"?`)) return;
  arr.splice(idx,1);
  localStorage.setItem('exoplanetSystems', JSON.stringify(arr));
  loadSavedSystemsList();
  populateSystemsModal();
  flashNotice('Deleted saved system');
}

function loadSystem(idx) {
  const arr = JSON.parse(localStorage.getItem('exoplanetSystems') || '[]');
  if (!arr[idx]) { flashNotice('System not found'); return; }
  const sys = arr[idx];
  for (const p of planetsData) {
    scene.remove(p.mesh);
    scene.remove(p.orbitLine);
  }
  planetsData = [];
  sys.planets.forEach(pl => {
    createPlanet(pl.name, pl.size, pl.distance, pl.speed, pl.color, pl.glowIntensity, pl.materialType, pl.angle || 0);
  });
  updateSystemListUI();
}

function exportCurrentSystemJSON() {
  const name = (document.getElementById('system-name').value || 'system').trim() || 'system';
  const sys = {
    name,
    planets: planetsData.map(p => ({ name:p.name, size:p.size, distance:p.distance, speed:p.speed, color:p.color, glowIntensity:p.glowIntensity, materialType:p.materialType, angle:p.angle })),
    timestamp: Date.now()
  };
  const blob = new Blob([JSON.stringify(sys, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/\s+/g,'_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  flashNotice('Exported system JSON');
}

function importSystemPrompt() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sys = JSON.parse(reader.result);
        if (!sys.planets) { alert('Invalid system JSON'); return; }
        for (const p of planetsData) {
          scene.remove(p.mesh);
          scene.remove(p.orbitLine);
        }
        planetsData = [];
        sys.planets.forEach(pl => createPlanet(pl.name, pl.size, pl.distance, pl.speed, pl.color, pl.glowIntensity, pl.materialType, pl.angle || 0));
        document.getElementById('system-name').value = sys.name || 'Imported System';
        flashNotice('Imported system');
        updateSystemListUI();
      } catch (err) {
        alert('Failed to import JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* 3D PREVIEW RENDERERS */
let sharedPreviewRenderer;
const previewRenderers = new Map();

function createPlanetPreview(planetData) {
  const container = document.createElement('div');
  container.style.cssText = 'width:110px;height:64px;border-radius:8px;overflow:hidden;background:#000';
  const previewCanvas = document.createElement('canvas');
  const pixelRatio = sharedPreviewRenderer.getPixelRatio();
  previewCanvas.width = 110 * pixelRatio;
  previewCanvas.height = 64 * pixelRatio;
  previewCanvas.style.width = '110px';
  previewCanvas.style.height = '64px';
  const previewCtx = previewCanvas.getContext('2d');
  container.appendChild(previewCanvas);
  const miniScene = new THREE.Scene();
  const miniCamera = new THREE.PerspectiveCamera(45, 110/64, 0.1, 100);
  miniCamera.position.set(0, 0, planetData.size * 3);
  const geom = new THREE.SphereBufferGeometry(planetData.size, 32, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: planetVertexShader,
    fragmentShader: planetFragmentShader,
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(planetData.color) },
      glowIntensity: { value: planetData.glowIntensity },
      materialType: { value: materialMap[planetData.materialType] || 0 }
    }
  });
  const miniPlanet = new THREE.Mesh(geom, mat);
  miniScene.add(miniPlanet);
  const light = new THREE.PointLight(0xffffff, 1.5, 100);
  light.position.set(5, 3, 5);
  miniScene.add(light);
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  miniScene.add(ambientLight);
  const animatePreview = () => {
    miniPlanet.rotation.y += 0.005;
    if (mat.uniforms) mat.uniforms.time.value += 0.016;
    sharedPreviewRenderer.render(miniScene, miniCamera);
    previewCtx.drawImage(sharedPreviewRenderer.domElement, 0, 0, previewCanvas.width, previewCanvas.height);
  };
  const id = 'preview_' + Date.now() + '_' + Math.random();
  previewRenderers.set(id, { animate: animatePreview, scene: miniScene });
  return { container, id };
}

function animateAllPreviews() {
  if (!panelOpen) return;
  previewRenderers.forEach(prev => {
    if (prev.animate) prev.animate();
  });
}

function destroyPreview(id) {
  const prev = previewRenderers.get(id);
  if (prev) {
    if (prev.scene) {
      prev.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    previewRenderers.delete(id);
  }
}

function updateSystemListUI() {
  const list = document.getElementById('system-planets-list');
  const oldRows = Array.from(list.children);
  oldRows.forEach(row => {
    const pid = row.dataset.previewId;
    if (pid) destroyPreview(pid);
  });
  list.innerHTML = '';
  planetsData.forEach((p, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px';
    const left = document.createElement('div');
    left.style.cssText = 'display:flex;gap:8px;align-items:center';
    const { container, id } = createPlanetPreview(p);
    row.dataset.previewId = id;
    left.appendChild(container);
    const meta = document.createElement('div');
    meta.style.flex = '1';
    meta.innerHTML = `<div style="font-weight:800;color:#dff7ff">${p.name}</div><div style="font-size:11px;color:#cfefff">Size: ${p.size.toFixed(2)} • Dist: ${p.distance.toFixed(1)}</div>`;
    left.appendChild(meta);
    row.appendChild(left);
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-direction:column;gap:4px';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-primary';
    editBtn.textContent = 'Edit';
    editBtn.style.padding = '4px 8px';
    editBtn.style.fontSize = '11px';
    editBtn.onclick = ()=> openPlanetEditor(idx);
    const focusBtn = document.createElement('button');
    focusBtn.className = 'btn';
    focusBtn.style.cssText = 'background:linear-gradient(90deg,#8b5cf6,#06b6d4);padding:4px 8px;fontSize:11px';
    focusBtn.textContent = 'Focus';
    focusBtn.onclick = ()=> focusPlanet(idx);
    actions.appendChild(editBtn);
    actions.appendChild(focusBtn);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

function focusPlanet(idx) {
  const p = planetsData[idx];
  if (!p) return;
  focusedObject = { type: 'planet', data: p, mesh: p.mesh };
  const panel = document.getElementById('focus-panel');
  panel.classList.add('show');
  const info = document.getElementById('focus-info');
  info.innerHTML = `
    <div style="font-size:13px;color:#cfefff;">
      <div style="margin-bottom:8px;"><b style="color:#7fe0ff">${p.name}</b></div>
      <div>Size: <b>${p.size.toFixed(2)}</b> R⊕</div>
      <div>Orbit: <b>${p.distance.toFixed(2)}</b> AU</div>
      <div>Speed: <b>${p.speed.toFixed(4)}</b></div>
      <div>Type: <b>${p.materialType}</b></div>
    </div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
      <input id="focus-edit-name" class="input" value="${p.name}" style="margin:0">
      <input id="focus-edit-size" class="input" type="number" step="0.1" value="${p.size}" style="margin:0">
      <input id="focus-edit-distance" class="input" type="number" step="0.5" value="${p.distance}" style="margin:0">
      <button class="btn btn-primary" id="focus-save-btn" style="width:100%">Save Changes</button>
      <button class="btn btn-danger" id="focus-delete-btn" style="width:100%">Delete Planet</button>
    </div>
  `;
  document.getElementById('focus-save-btn').addEventListener('click', ()=> {
    p.name = document.getElementById('focus-edit-name').value;
    p.size = parseFloat(document.getElementById('focus-edit-size').value);
    p.distance = parseFloat(document.getElementById('focus-edit-distance').value);
    p.mesh.geometry.dispose();
    p.mesh.geometry = new THREE.SphereBufferGeometry(p.size, 96, 96);
    scene.remove(p.orbitLine);
    const points = [];
    for (let i=0;i<=360;i++){
      const a = (i/360)*Math.PI*2;
      points.push(new THREE.Vector3(Math.cos(a)*p.distance, 0, Math.sin(a)*p.distance));
    }
    p.orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: p.color, transparent:true, opacity:0.12, depthWrite:false })
    );
    p.orbitLine.renderOrder = -1;
    scene.add(p.orbitLine);
    updateSystemListUI();
    updateStarUniforms();
    flashNotice('Planet updated');
    info.querySelector('b').textContent = p.name;
  });
  document.getElementById('focus-delete-btn').addEventListener('click', ()=> {
    if (!confirm(`Delete planet ${p.name}?`)) return;
    scene.remove(p.mesh);
    scene.remove(p.orbitLine);
    const pidx = planetsData.findIndex(pl => pl.id === p.id);
    if (pidx >= 0) planetsData.splice(pidx, 1);
    exitFocus();
    updateSystemListUI();
    updateStarUniforms();
    flashNotice('Planet deleted');
  });
}

function focusStar() {
  focusedObject = { type: 'star', data: star.userData, mesh: star };
  const panel = document.getElementById('focus-panel');
  panel.classList.add('show');
  const info = document.getElementById('focus-info');
  info.innerHTML = `
    <div style="font-size:13px;color:#cfefff;">
      <div style="margin-bottom:8px;"><b style="color:#7fe0ff">Central Star</b></div>
      <div>Size: <b>${star.userData.size.toFixed(2)}</b></div>
    </div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
      <input id="focus-star-size" class="input" type="number" step="0.1" value="${star.userData.size}" style="margin:0">
      <div style="display:flex;gap:8px;">
        <input id="focus-star-c1" type="color" value="#${star.material.uniforms.color1.value.getHexString()}" style="border-radius:8px;height:44px;border:none;padding:0">
        <input id="focus-star-c2" type="color" value="#${star.material.uniforms.color2.value.getHexString()}" style="border-radius:8px;height:44px;border:none;padding:0">
        <input id="focus-star-c3" type="color" value="#${star.material.uniforms.color3.value.getHexString()}" style="border-radius:8px;height:44px;border:none;padding:0">
      </div>
      <button class="btn btn-primary" id="focus-star-save" style="width:100%">Save Changes</button>
    </div>
  `;
  document.getElementById('focus-star-save').addEventListener('click', () => {
    const newSize = parseFloat(document.getElementById('focus-star-size').value);
    const c1 = new THREE.Color(document.getElementById('focus-star-c1').value);
    const c2 = new THREE.Color(document.getElementById('focus-star-c2').value);
    const c3 = new THREE.Color(document.getElementById('focus-star-c3').value);
    star.geometry.dispose();
    star.geometry = new THREE.SphereBufferGeometry(newSize, 256, 256);
    star.userData.size = newSize;
    star.material.uniforms.color1.value = c1;
    star.material.uniforms.color2.value = c2;
    star.material.uniforms.color3.value = c3;
    star.material.uniforms.starRadius.value = newSize;
    const corona = scene.children.find(child => child.userData && child.userData.type === 'corona');
    if (corona) {
      corona.geometry.dispose();
      corona.geometry = new THREE.SphereBufferGeometry(newSize * 1.2, 64, 64);
    }
    updateStarUniforms();
    flashNotice('Star updated');
    exitFocus();
  });
}

function exitFocus() {
  focusedObject = null;
  document.getElementById('focus-panel').classList.remove('show');
  const start = performance.now();
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  function animate(now) {
    const t = Math.min(1, (now - start) / 1200);
    const ease = 0.5 - Math.cos(Math.PI * t) / 2;
    camera.position.lerpVectors(startPos, cameraInitialPos, ease);
    controls.target.lerpVectors(startTarget, cameraInitialTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function openPlanetEditor(idx) {
  const p = planetsData[idx];
  const editor = document.createElement('div');
  editor.style.cssText = 'background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));padding:12px;border-radius:10px;margin-top:8px';
  editor.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <input id="editor-name-${idx}" class="input" value="${p.name}" style="margin:0">
      <div style="display:flex;gap:8px;">
        <input id="editor-size-${idx}" class="input" type="number" step="0.1" value="${p.size}" style="margin:0" placeholder="Size">
        <input id="editor-dist-${idx}" class="input" type="number" step="0.5" value="${p.distance}" style="margin:0" placeholder="Distance">
      </div>
      <div style="display:flex;gap:8px;">
        <input id="editor-speed-${idx}" class="input" type="number" step="0.001" value="${p.speed}" style="margin:0" placeholder="Speed">
        <input id="editor-color-${idx}" type="color" value="#${p.color.toString(16).padStart(6,'0')}" style="border-radius:8px;height:44px;border:none;padding:0">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-primary" id="editor-save-${idx}">Save</button>
        <button class="btn btn-danger" id="editor-delete-${idx}">Delete</button>
        <button class="btn" id="editor-cancel-${idx}" style="background:#555">Cancel</button>
      </div>
    </div>
  `;
  const list = document.getElementById('system-planets-list');
  const existing = document.getElementById('planet-editor-'+idx);
  if (existing) existing.remove();
  const wrapper = document.createElement('div');
  wrapper.id = 'planet-editor-'+idx;
  wrapper.appendChild(editor);
  list.insertBefore(wrapper, list.children[idx+1] || null);
  document.getElementById(`editor-save-${idx}`).addEventListener('click', ()=>{
    const newName = document.getElementById(`editor-name-${idx}`).value;
    const newSize = parseFloat(document.getElementById(`editor-size-${idx}`).value);
    const newDist = parseFloat(document.getElementById(`editor-dist-${idx}`).value);
    const newSpeed = parseFloat(document.getElementById(`editor-speed-${idx}`).value);
    const newColor = document.getElementById(`editor-color-${idx}`).value;
    const pd = planetsData[idx];
    pd.name = newName;
    pd.size = newSize;
    pd.distance = newDist;
    pd.speed = newSpeed;
    pd.color = parseInt(newColor.replace('#',''),16);
    pd.mesh.geometry.dispose();
    pd.mesh.geometry = new THREE.SphereBufferGeometry(pd.size, 96, 96);
    if (pd.mesh.material && pd.mesh.material.uniforms) {
      pd.mesh.material.uniforms.baseColor.value = new THREE.Color(pd.color);
    }
    scene.remove(pd.orbitLine);
    const pts = [];
    for (let i=0;i<=360;i++){
      const a = (i/360)*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*pd.distance,0,Math.sin(a)*pd.distance));
    }
    pd.orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: pd.color, transparent:true, opacity:0.12, depthWrite:false })
    );
    pd.orbitLine.renderOrder = -1;
    scene.add(pd.orbitLine);
    updateSystemListUI();
    updateStarUniforms();
    flashNotice('Planet updated');
    wrapper.remove();
  });
  document.getElementById(`editor-delete-${idx}`).addEventListener('click', ()=>{
    if (!confirm('Delete this planet?')) return;
    const pd = planetsData[idx];
    scene.remove(pd.mesh);
    scene.remove(pd.orbitLine);
    planetsData.splice(idx,1);
    updateSystemListUI();
    updateStarUniforms();
    flashNotice('Planet deleted');
    wrapper.remove();
  });
  document.getElementById(`editor-cancel-${idx}`).addEventListener('click', ()=>{
    wrapper.remove();
  });
}

function updateStar() {
  const size = parseFloat(document.getElementById('star-size').value);
  const c1 = new THREE.Color(document.getElementById('star-color1').value);
  const c2 = new THREE.Color(document.getElementById('star-color2').value);
  const c3 = new THREE.Color(document.getElementById('star-color3').value);
  star.geometry.dispose();
  star.geometry = new THREE.SphereBufferGeometry(size, 256, 256);
  star.userData.size = size;
  star.material.uniforms.color1.value = c1;
  star.material.uniforms.color2.value = c2;
  star.material.uniforms.color3.value = c3;
  star.material.uniforms.starRadius.value = size;
  const corona = scene.children.find(child => child.userData && child.userData.type === 'corona');
  if (corona) {
    corona.geometry.dispose();
    corona.geometry = new THREE.SphereBufferGeometry(size * 1.2, 64, 64);
  }
  updateStarUniforms();
  flashNotice('Star updated');
}

function addPlanetFromForm() {
  const name = document.getElementById('new-planet-name').value || 'Planet';
  const size = parseFloat(document.getElementById('new-planet-size').value) || 1;
  const dist = parseFloat(document.getElementById('new-planet-distance').value) || 12;
  const speed = parseFloat(document.getElementById('new-planet-speed').value) || 0.01;
  const colorHex = document.getElementById('new-planet-color').value || '#4fc3f7';
  const color = parseInt(colorHex.replace('#',''),16);
  const glow = parseFloat(document.getElementById('new-planet-glow').value) || 0.2;
  const materialType = document.getElementById('new-material').value || 'earth';
  createPlanet(name, size, dist, speed, color, glow, materialType, Math.random()*Math.PI*2);
  flashNotice(`Planet added: ${name}`);
  updateSystemListUI();
}

function spawnRandomPlanet() {
  const name = 'Rnd-' + Math.floor(Math.random()*999);
  const size = (Math.random()*1.8) + 0.5;
  const dist = 6 + Math.random()*60;
  const speed = 0.004 + Math.random()*0.026;
  const color = Math.floor(Math.random()*0xffffff);
  const glow = Math.random()*0.6;
  const types = ['earth','gas','lava'];
  const mat = types[Math.floor(Math.random()*types.length)];
  createPlanet(name, size, dist, speed, color, glow, mat, Math.random()*Math.PI*2);
  updateSystemListUI();
}

function onMouseMove(e) {
  mouse.x = (e.clientX / innerWidth)*2 - 1;
  mouse.y = -(e.clientY / innerHeight)*2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const objects = [star, ...planetsData.map(p=>p.mesh)];
  const hits = raycaster.intersectObjects(objects, false);
  const tt = document.getElementById('tooltip');
  if (hits.length) {
    const obj = hits[0].object;
    const ud = obj.userData || {};
    tt.style.display = 'block';
    tt.style.left = (e.clientX + 14) + 'px';
    tt.style.top = (e.clientY + 14) + 'px';
    document.getElementById('tooltip-name').textContent = ud.name || 'Object';
    if (ud.type === 'star') {
      document.getElementById('tooltip-sub').textContent = `Radius: ${(ud.size||3).toFixed(2)}`;
    } else {
      document.getElementById('tooltip-sub').textContent = `Size: ${(ud.size||1).toFixed(2)} • Dist: ${(ud.distance||0).toFixed(2)}`;
    }
    planetsData.forEach(p => {
      if (p.mesh === obj) p.orbitLine.material.opacity = 0.55;
      else p.orbitLine.material.opacity = 0.12;
    });
  } else {
    tt.style.display = 'none';
    planetsData.forEach(p => p.orbitLine.material.opacity = 0.12);
  }
}

function onClick(e) {
  mouse.x = (e.clientX / innerWidth)*2 - 1;
  mouse.y = -(e.clientY / innerHeight)*2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const objects = [star, ...planetsData.map(p=>p.mesh)];
  const hits = raycaster.intersectObjects(objects, false);
  if (hits.length) {
    const mesh = hits[0].object;
    if (mesh === star) {
      focusStar();
    } else {
      const pdx = planetsData.findIndex(p => p.mesh === mesh);
      if (pdx >= 0) {
        focusPlanet(pdx);
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.016 * animationSpeed;
  if (star && star.material && star.material.uniforms) {
    star.material.uniforms.time.value = time;
  }
  for (const p of planetsData) {
    if (p.mesh && p.mesh.material && p.mesh.material.uniforms) {
      p.mesh.material.uniforms.time.value = time;
    }
  }
  if (star) star.rotation.y += 0.0009 * animationSpeed;
  for (const p of planetsData) {
    p.angle += p.speed * animationSpeed;
    p.mesh.position.x = Math.cos(p.angle) * p.distance;
    p.mesh.position.z = Math.sin(p.angle) * p.distance;
    p.mesh.position.y = 0;
  }
  updateStarUniforms();
  if (focusedObject) {
    let targetPos = focusedObject.mesh.position.clone();
    targetPos.y += 3;
    let sideDist = focusedObject.type === 'star' ? star.userData.size * 4 : (focusedObject.data.distance * 0.3 + focusedObject.data.size * 4);
    targetPos.add(new THREE.Vector3(
      Math.cos(time * 0.1) * sideDist,
      0,
      Math.sin(time * 0.1) * sideDist
    ));
    camera.position.lerp(targetPos, 0.05);
    controls.target.lerp(focusedObject.mesh.position, 0.05);
  }
  if (directionalLight) {
    directionalLight.position.copy(camera.position);
    directionalLight.target.position.copy(star.position);
    directionalLight.target.updateMatrixWorld();
  }
  const cand = detectTransit();
  const brightness = computeBrightness(cand);
  if (brightnessHistory.length >= historyMax) brightnessHistory.shift();
  const prev = brightnessHistory.length ? brightnessHistory[brightnessHistory.length-1] : 1.0;
  const lerped = prev + (brightness - prev) * 0.18;
  brightnessHistory.push(lerped);
  const lc = document.getElementById('light-curve');
  if (cand) {
    if (!transitActive) {
      transitActive = true;
      transitingPlanet = cand.planet;
      document.getElementById('lc-planet').textContent = transitingPlanet.name;
      document.getElementById('lc-depth').textContent = (Math.pow(transitingPlanet.size / star.userData.size, 2) * 100).toFixed(2) + '%';
      animationSpeed = 0.24;
      lc.classList.add('show');
    } else {
      document.getElementById('lc-planet').textContent = cand.planet.name;
      document.getElementById('lc-depth').textContent = (Math.pow(cand.planet.size / star.userData.size, 2) * 100).toFixed(2) + '%';
    }
  } else {
    if (transitActive) {
      transitActive = false;
      transitingPlanet = null;
      animationSpeed = 1.0;
      lc.classList.remove('show');
    }
  }
  drawChart();
  animateAllPreviews();
  controls.update();
  composer.render();
}

function flashNotice(text, ttl=1800) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = 'position:fixed;right:28px;bottom:18px;background:rgba(6,10,20,0.95);padding:10px;border-radius:8px;border:1px solid rgba(79,195,247,0.06);color:#cfefff;z-index:360;box-shadow:0 14px 40px rgba(0,0,0,0.6);transition:opacity 400ms';
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity='0', ttl-400);
  setTimeout(()=> el.remove(), ttl);
}

function onWindowResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (chartCanvas) {
    const rect = document.getElementById('light-curve').getBoundingClientRect();
    chartCanvas.width = Math.floor(Math.min(420, rect.width * 0.68) * devicePixelRatio);
    chartCanvas.height = Math.floor(140 * devicePixelRatio);
  }
  const pc = document.getElementById('panel-particles');
  if (pc) {
    const parent = pc.parentElement;
    pc.style.width = parent.clientWidth + 'px';
    pc.style.height = parent.clientHeight + 'px';
    pc.width = parent.clientWidth * devicePixelRatio;
    pc.height = parent.clientHeight * devicePixelRatio;
  }
}

function clearSavedSystems(){
  if (!confirm('Clear all saved systems?')) return;
  localStorage.removeItem('exoplanetSystems');
  loadSavedSystemsList();
  populateSystemsModal();
  flashNotice('Cleared saved systems');
}

init();
