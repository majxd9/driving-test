import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const canvas = $("stage");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0d11");
const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 500);
camera.position.set(4.8, 3.0, 5.8);
const renderer = new THREE.WebGLRenderer({canvas, antialias: !matchMedia("(max-width: 700px)").matches, alpha: false, powerPreference: "high-performance"});
const qualityProfiles = {
 low: { label: "اقتصادية", pixelRatio: (dpr) => Math.min(dpr, 1) * 0.72 },
 medium: { label: "متوسطة", pixelRatio: (dpr) => Math.min(dpr, 1.25) },
 high: { label: "عالية", pixelRatio: (dpr) => Math.min(dpr * 1.25, 1.8) },
};
const vehicleModels = {
 mclaren: { label: "McLaren Senna GTR", description: "نموذج سيارة حلبة؛ جودة المجسّم تتغير مع اختيار الجودة.", urlForQuality: (quality) => "./mclaren-senna-gtr-" + quality + ".glb.gz" },
 mustang: { label: "Ford Mustang GT · 2005", description: "نموذج Mustang GT لعام 2005. تُحفظ نسبة العمل لصاحب النموذج في رابط الترخيص.", url: "https://raw.githubusercontent.com/nesdesignco/FormDrive/e2f861630035385adacd1c5fcdeae5258557cce6/public/models/mustang-2005.glb", attribution: true },
 challenger: { label: "Dodge Challenger 1970 R/T", description: "نموذج احتياطي متوفر داخل المستودع.", url: "./challenger-1970.glb.gzdata", fallbackUrl: "./challenger-1970.glb" },
};
let activeVehicleId = "mclaren";
let loadSequence = 0;
let currentQuality = "medium";
const pixelRatioFor = (quality) => qualityProfiles[quality].pixelRatio(Math.max(1, window.devicePixelRatio || 1));
renderer.setPixelRatio(pixelRatioFor(currentQuality));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = true;
controls.minDistance = 1.2;
controls.maxDistance = 18;
controls.target.set(0, 0.2, 0);
const hemi = new THREE.HemisphereLight(0xdceaff, 0x26242a, 2.2);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe6c7, 3.1); key.position.set(4, 7, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0x9ec9ff, 1.8); fill.position.set(-5, 3, -4); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffc77f, 1.7); rim.position.set(0, 4, -7); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x11151c, roughness:0.88, metalness:0.08}));
floor.rotation.x = -Math.PI/2; floor.position.y = -0.03; scene.add(floor);
const grid = new THREE.GridHelper(20, 40, 0x353b46, 0x262b34); grid.position.y = -0.019; scene.add(grid);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let model = null, meshes = [], selected = null, exploded = false, inside = false, renderQueued = false, modelCenter = new THREE.Vector3(), homeCamera = null;
let modelBounds = null, mainPartEntries = [], selectedMeshes = [], selectedLabel = "";
const originalPositions = new Map();
const exteriorPattern = /(body|hood|bonnet|door|fender|wing|roof|bumper|trunk|boot|quarter|grille|grill|windshield|windscreen|window|glass|exterior|shell|front.?clip|rear.?clip)/i;
const categoryFor = (mesh) => {
 const n = String(mesh.name || "").toLowerCase();
 if (/(wheel|tire|tyre|rim|hub|brake.?rotor)/i.test(n)) return "wheels";
 if (/(engine|motor|gear|transmission|exhaust|suspension|axle|driveshaft|radiator|carb|alternator|battery)/i.test(n)) return "engine";
 if (/(seat|dash|dashboard|steer|interior|console|carpet|door.?panel|cabin)/i.test(n)) return "cabin";
 if (/(light|lamp|headlight|taillight|indicator|signal)/i.test(n)) return "lights";
 return "exterior";
};
const categoryLabel = {all:"الكل", exterior:"الهيكل", engine:"المحرك والحركة", cabin:"المقصورة", lights:"الإضاءة", wheels:"العجلات"};
const cleanName = (raw, index) => {
 const n = String(raw || "").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
 const map = [
  [/(hood|bonnet|engine cover|机盖|发动机罩)/i,"غطاء المحرك"],
  [/(bumper|fascia|保险杠)/i,"الصدامات"],
  [/(wheel|tire|tyre|rim|hub|轮胎|车轮|轮毂)/i,"العجلات"],
  [/(head.?light|tail.?light|lamp|light|车灯|大灯|尾灯)/i,"المصابيح"],
  [/(wind.?shield|windshield|window|glass|挡风玻璃|车窗|玻璃)/i,"الزجاج"],
  [/(door|车门)/i,"الأبواب"],
  [/(seat|座椅)/i,"المقاعد"],
  [/(steer|volant|方向盘)/i,"المقود"],
  [/(engine|motor|发动机)/i,"المحرك"],
  [/(dashboard|dash|仪表台|仪表板|中控台)/i,"لوحة القيادة"],
  [/(grille|grill|格栅)/i,"شبك الواجهة"],
  [/(mirror|后视镜)/i,"المرايا"],
  [/(body|chassis|shell|frame|车身|车体)/i,"الهيكل"]
 ];
 for (const [re,label] of map) if (re.test(n)) return label;
 return "مكوّن السيارة";
};
const mainPartDefinitions = [
 {id:"body",label:"الهيكل",category:"exterior",keywords:/(bodywork|car.?body|chassis|shell|frame|carrosserie|车身|车体|车壳)/i,max:4,filter:d=>d.longSize>.28&&d.footprint>.05&&d.vertical>.12&&d.vertical<.82,score:d=>d.footprint*2+d.volume},
 {id:"hood",label:"غطاء المحرك",category:"exterior",keywords:/(hood|bonnet|engine.?cover|motor.?cover|机盖|发动机罩)/i,max:3,filter:d=>Math.abs(d.longPos)>.43&&d.vertical>.27&&d.vertical<.84&&d.sideAbs<.92,score:d=>d.footprint/(.015+d.volume)+Math.abs(d.longPos)*.2},
 {id:"engine",label:"المحرك",category:"engine",keywords:/(engine|motor|power.?unit|发动机|引擎|动力总成)/i,max:6,filter:d=>d.vertical>.14&&d.vertical<.58&&d.sideAbs<.48&&Math.abs(d.longPos)>.12,score:d=>(1-d.sideAbs)+(1-d.vertical)*.8+Math.abs(d.longPos)*.25+d.volume},
 {id:"doors",label:"الأبواب",category:"exterior",keywords:/(door|car.?door|侧门|车门)/i,max:6,filter:d=>Math.abs(d.longPos)<.56&&d.sideAbs>.36&&d.vertical>.18&&d.vertical<.78,score:d=>d.sideAbs+d.footprint*2-Math.abs(d.longPos)*.3},
 {id:"wheels",label:"العجلات",category:"wheels",keywords:/(wheel|tyre|tire|rim|hubcap|轮胎|车轮|轮毂)/i,max:8,filter:d=>d.vertical<.29&&d.sideAbs>.27&&Math.abs(d.longPos)>.2,score:d=>d.sideAbs+Math.abs(d.longPos)+Math.max(d.size.x,d.size.z)},
 {id:"lights",label:"المصابيح",category:"lights",keywords:/(head.?light|tail.?light|lamp|light.?assembly|headlamp|taillight|车灯|大灯|尾灯|灯组)/i,max:8,filter:d=>Math.abs(d.longPos)>.56&&d.vertical>.20&&d.vertical<.8&&d.sideAbs>.08,score:d=>Math.abs(d.longPos)+.25/(.02+d.volume)},
 {id:"seats",label:"المقاعد",category:"cabin",keywords:/(seat|chair|bucket.?seat|座椅|座位|椅子)/i,max:6,filter:d=>d.sideAbs<.5&&d.vertical>.3&&d.vertical<.9&&Math.abs(d.longPos)<.52,score:d=>d.vertical+(1-d.sideAbs)*.5+d.volume},
 {id:"steering",label:"المقود",category:"cabin",keywords:/(steer(ing)? wheel|steering|volant|方向盘|转向盘)/i,max:3,filter:d=>d.sideAbs<.31&&d.vertical>.4&&d.vertical<.93&&Math.abs(d.longPos)<.62,score:d=>d.vertical+(1-d.sideAbs)-d.volume*8},
 {id:"dashboard",label:"لوحة القيادة",category:"cabin",keywords:/(dashboard|dash.?board|instrument.?panel|cockpit|console|仪表台|仪表板|中控台)/i,max:4,filter:d=>d.sideAbs<.43&&d.vertical>.31&&d.vertical<.84&&Math.abs(d.longPos)<.72,score:d=>d.footprint+d.vertical},
 {id:"glass",label:"الزجاج",category:"exterior",keywords:/(wind.?shield|windscreen|window.?glass|glass|glazing|挡风玻璃|车窗|玻璃)/i,max:6,filter:d=>d.vertical>.5&&d.size.y<.22&&d.footprint>.012,score:d=>d.footprint/(.015+d.size.y)},
 {id:"bumpers",label:"الصدامات",category:"exterior",keywords:/(bumper|fascia|保险杠)/i,max:4,filter:d=>Math.abs(d.longPos)>.68&&d.vertical<.46,score:d=>Math.abs(d.longPos)+(1-d.vertical)+d.footprint},
 {id:"mirrors",label:"المرايا",category:"exterior",keywords:/(mirror|rear.?view|side.?view|后视镜)/i,max:4,filter:d=>d.sideAbs>.54&&d.vertical>.3&&d.vertical<.84&&Math.abs(d.longPos)<.76,score:d=>d.sideAbs+d.vertical*.2+d.footprint},
 {id:"grille",label:"شبك الواجهة",category:"exterior",keywords:/(grille|grill|radiator.?grille|格栅|进气格栅)/i,max:4,filter:d=>Math.abs(d.longPos)>.6&&d.vertical>.17&&d.vertical<.6&&d.sideAbs<.45,score:d=>Math.abs(d.longPos)+(1-d.sideAbs)+d.footprint}
];
const partCategoryLabels = {all:"الكل",exterior:"الهيكل",engine:"المحرك",cabin:"المقصورة",lights:"الإضاءة",wheels:"العجلات"};
const nodeNames = (mesh) => {
 const names = [String(mesh.name || "")];
 let parent = mesh.parent;
 while (parent && parent !== model) { if (parent.name) names.push(String(parent.name)); parent = parent.parent; }
 return names.join(" ").toLowerCase().replace(/[_-]+/g," ");
};
function buildMainPartEntries() {
 if (!model || !meshes.length) return [];
 const bounds = modelBounds || new THREE.Box3().setFromObject(model);
 const dims = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
 const longAxis = dims.x >= dims.z ? "x" : "z", sideAxis = longAxis === "x" ? "z" : "x";
 const descriptors = meshes.map(mesh => {
  const b = new THREE.Box3().setFromObject(mesh), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const longDenom = Math.max(dims[longAxis]/2,.001), sideDenom = Math.max(dims[sideAxis]/2,.001), height = Math.max(dims.y,.001);
  return {mesh,name:nodeNames(mesh),size:s,longSize:s[longAxis]/Math.max(dims[longAxis],.001),
   footprint:(s[longAxis]/Math.max(dims[longAxis],.001))*(s[sideAxis]/Math.max(dims[sideAxis],.001)),
   volume:s.x*s.y*s.z/Math.max(dims.x*dims.y*dims.z,.000001),
   longPos:(c[longAxis]-center[longAxis])/longDenom,sideAbs:Math.abs((c[sideAxis]-center[sideAxis])/sideDenom),
   vertical:(c.y-bounds.min.y)/height};
 });
 const chosenById = new Map(), used = new Set();
 const priority = [...mainPartDefinitions.filter(p=>p.id!=="body")];
 for (const def of priority) {
  const found = descriptors.filter(d=>def.keywords.test(d.name)&&!used.has(d.mesh)).sort((a,b)=>b.volume-a.volume);
  if (found.length) {
   const group = found.slice(0,def.max).map(d=>d.mesh); group.forEach(m=>used.add(m)); chosenById.set(def.id,group);
  }
 }
 for (const def of priority) {
  if (chosenById.has(def.id)) continue;
  const candidates = descriptors.filter(d=>!used.has(d.mesh)&&def.filter(d)).sort((a,b)=>def.score(b)-def.score(a));
  if (!candidates.length) {
   chosenById.set(def.id, []);
   continue;
  }
  const fallbackLimit = def.id==="wheels" ? 4 : def.id==="engine" ? 4 : 2;
  const group = candidates.slice(0,Math.min(def.max,fallbackLimit)).map(d=>d.mesh);
  group.forEach(m=>used.add(m));
  chosenById.set(def.id,group);
 }
 const bodyDef = mainPartDefinitions.find(p=>p.id==="body");
 let bodyMeshes = descriptors.filter(d=>bodyDef.keywords.test(d.name)&&!used.has(d.mesh));
 if (!bodyMeshes.length) bodyMeshes = descriptors.filter(d=>!used.has(d.mesh)&&bodyDef.filter(d));
 bodyMeshes.sort((a,b)=>bodyDef.score(b)-bodyDef.score(a));
 chosenById.set("body",bodyMeshes.slice(0,bodyDef.max).map(d=>d.mesh));
 return mainPartDefinitions.map(def=>({...def,meshes:chosenById.get(def.id)||[]}));
}
const labelForMesh = (mesh) => mainPartEntries.find(p=>p.meshes.includes(mesh))?.label || cleanName(mesh?.name,meshes.indexOf(mesh));

const requestRender = () => {
 if (renderQueued) return;
 renderQueued = true;
 requestAnimationFrame(() => { renderQueued = false; controls.update(); renderer.render(scene, camera); });
};
controls.addEventListener("change", requestRender);
const resize = () => {
 const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
 camera.aspect = w/h;
 camera.updateProjectionMatrix();
 renderer.setPixelRatio(pixelRatioFor(currentQuality));
 renderer.setSize(w,h,false);
 requestRender();
};
const qualitySelect = $("qualitySelect");
if (qualitySelect) {
 qualitySelect.value = currentQuality;
 qualitySelect.addEventListener("change", () => {
  const next = qualityProfiles[qualitySelect.value] ? qualitySelect.value : "medium";
  if (next === currentQuality) return;
  currentQuality = next;
  resize();
  loadCarModel(activeVehicleId);
 });
}
const carSelect = $("carSelect");
if (carSelect) {
 carSelect.value = activeVehicleId;
 carSelect.addEventListener("change", () => {
  const next = vehicleModels[carSelect.value] ? carSelect.value : "mclaren";
  activeVehicleId = next;
  loadCarModel(next);
 });
}
const ro = new ResizeObserver(resize); ro.observe(canvas);
window.addEventListener("resize", resize, {passive:true});
const setLoadError = (message) => {
 $("loadTitle").textContent = "تعذّر تحميل نموذج السيارة";
 $("loadMessage").textContent = message;
 $("status").textContent = "فشل تحميل الملف";
 $("progress").style.width = "0%";
 if (window.__carViewerShowError) window.__carViewerShowError(message, "تعذّر تحميل نموذج السيارة");
};
const loader = new GLTFLoader();

// Use the browser's native HTTP gzip decoding instead of buffering and inflating the
// entire model in JavaScript. Cloudflare sends Content-Encoding: gzip; the browser
// decodes it while receiving the bytes, then GLTFLoader parses the GLB.
function loadGltf(url, statusLabel, progressStart = 0, progressSpan = 64) {
 return new Promise((resolve, reject) => {
  loader.load(url, resolve, (event) => {
   if (event && event.total > 0) {
    const pct = Math.max(0, Math.min(100, event.loaded / event.total * 100));
    $("status").textContent = statusLabel + " " + Math.round(pct) + "%";
    $("progress").style.width = (progressStart + progressSpan * pct / 100) + "%";
   } else if (event && event.loaded > 0) {
    $("status").textContent = statusLabel + " (" + (event.loaded / 1048576).toFixed(1) + " MB)";
   } else {
    $("status").textContent = statusLabel;
   }
  }, reject);
 });
}

function disposeScene(root) {
 if (!root) return;
 root.traverse((obj) => {
  if (obj.geometry) obj.geometry.dispose();
  if (!obj.material) return;
  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
  materials.forEach((mat) => {
   for (const value of Object.values(mat)) if (value && value.isTexture) value.dispose();
   mat.dispose();
  });
 });
}
function updatePartControls() {
 document.querySelectorAll("[data-move]").forEach((button) => { button.disabled = selectedMeshes.length === 0; });
 const label = $("selectedPartName");
 if (label) label.textContent = selectedMeshes.length ? selectedLabel : "اختر قطعة أولاً";
}
function clearLoadedModel() {
 if (model) { scene.remove(model); disposeScene(model); }
 model = null; meshes = []; selected = null; selectedMeshes = []; selectedLabel = ""; mainPartEntries = []; modelBounds = null; exploded = false; inside = false;
 originalPositions.clear();
 updatePartControls();
}
function updateVehicleDetails(vehicleId, backupMode = false) {
 const spec = vehicleModels[vehicleId];
 $("vehicleName").textContent = spec.label;
 $("vehicleDescription").textContent = backupMode
  ? "تعذّر تحميل السيارة المختارة؛ عُرضت السيارة الاحتياطية الموجودة داخل المستودع حتى يتوفر ملف النموذج."
  : spec.description;
 const attribution = $("modelAttribution");
 if (attribution) attribution.hidden = !spec.attribution;
}
async function loadCarModel(vehicleId = "mclaren", backupMode = false) {
 const token = ++loadSequence;
 const spec = vehicleModels[vehicleId] || vehicleModels.mclaren;
 activeVehicleId = vehicleId;
 clearLoadedModel();
 $("load").classList.remove("hidden");
 $("loadTitle").textContent = "يتم تجهيز " + spec.label;
 $("loadMessage").textContent = "يجري تحميل المجسّم والخامات حسب جودة العرض المحددة.";
 $("progress").style.width = "0%";
 $("status").textContent = "بدء التحميل…";
 if (carSelect && carSelect.value !== vehicleId) carSelect.value = vehicleId;
 try {
  let gltf, usedFallback = false;
  if (vehicleId === "challenger") {
   let compressedError = null;
   try {
    $("status").textContent = "تحميل السيارة المضغوطة…";
    gltf = await loadGltf("./challenger-1970.glb.gzdata", "تحميل النسخة السريعة", 0, 66);
   } catch (err) {
    compressedError = err; usedFallback = true;
    console.warn("Compressed Challenger model unavailable; trying original GLB:", err);
    $("status").textContent = "تحميل النسخة الاحتياطية…";
    try {
     gltf = await loadGltf("./challenger-1970.glb", "تحميل النسخة الاحتياطية", 0, 68);
    } catch (fallbackError) {
     const first = compressedError instanceof Error ? compressedError.message : "خطأ غير معروف";
     const second = fallbackError instanceof Error ? fallbackError.message : "خطأ غير معروف";
     throw new Error("فشل تحميل النسخة السريعة (" + first + ") والنسخة الاحتياطية (" + second + ").");
    }
   }
  } else {
   const url = vehicleId === "mclaren" ? spec.urlForQuality(currentQuality) : spec.url;
   gltf = await loadGltf(url, "تحميل " + spec.label, 0, 66);
  }
  if (token !== loadSequence) { disposeScene(gltf.scene); return; }
  $("status").textContent = "تجهيز المشهد ثلاثي الأبعاد…";
  $("loadMessage").textContent = "اكتمل التنزيل. يجري تجهيز المجسّم والخامات للعرض.";
  $("progress").style.width = "78%";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (token !== loadSequence) { disposeScene(gltf.scene); return; }
  model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const originalCenter = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scaleFactor = 4.2 / maxDim;
  model.scale.setScalar(scaleFactor);
  model.position.set(-originalCenter.x * scaleFactor, -box.min.y * scaleFactor, -originalCenter.z * scaleFactor);
  model.updateMatrixWorld(true);
  const groundedBox = new THREE.Box3().setFromObject(model);
  modelBounds = groundedBox.clone();
  modelCenter.copy(groundedBox.getCenter(new THREE.Vector3()));
  scene.add(model);
  camera.position.set(modelCenter.x + 4.8, modelCenter.y + 1.3, modelCenter.z + 5.8);
  controls.target.copy(modelCenter);
  controls.minDistance = 1.2;
  controls.update();
  model.traverse((obj) => {
   if (!obj.isMesh) return;
   obj.castShadow = false; obj.receiveShadow = false;
   obj.userData.baseMaterial = obj.material;
   obj.userData.baseVisible = obj.visible;
   originalPositions.set(obj, obj.position.clone());
   meshes.push(obj);
  });
  mainPartEntries = buildMainPartEntries();
  window.__carViewerModelLoaded = true;
  $("retryLoad").hidden = true;
  $("count").textContent = meshes.length + " قطعة";
  $("status").textContent = backupMode ? "تم تحميل النموذج الاحتياطي" : usedFallback ? "تم التحميل بوضع التوافق" : "تم تحميل النموذج";
  $("loadTitle").textContent = "اكتمل تحميل " + spec.label;
  $("progress").style.width = "100%";
  homeCamera = {position:camera.position.clone(), target:controls.target.clone()};
  updateVehicleDetails(vehicleId, backupMode);
  renderParts();
  updatePartControls();
  setTimeout(() => { if (token === loadSequence) $("load").classList.add("hidden"); }, 250);
  requestRender();
 } catch (err) {
  if (token !== loadSequence) return;
  console.error(spec.label + " model load error:", err);
  if (vehicleId !== "challenger" && !backupMode) {
   $("loadMessage").textContent = "لم يتوفر ملف هذه السيارة بعد؛ يجري فتح النموذج الاحتياطي حتى لا يتعطل العارض.";
   return loadCarModel("challenger", true);
  }
  setLoadError(err instanceof Error ? err.message : "تعذّر تنزيل ملف السيارة. افحص الاتصال ثم أعد المحاولة.");
 }
}
loadCarModel("mclaren");

function restoreMaterial(mesh) { if (mesh) mesh.material = mesh.userData.baseMaterial; }
function setSelected(mesh, explicitEntry = null) {
 const entry = explicitEntry || (mesh ? mainPartEntries.find(p=>p.meshes.includes(mesh)) : null);
 const group = entry ? entry.meshes : (mesh ? [mesh] : []);
 const nextSelected = group[0] || null;
 const nextLabel = entry ? entry.label : (mesh ? labelForMesh(mesh) : "");
 if (selected === nextSelected && selectedLabel === nextLabel && selectedMeshes.length === group.length) return;
 selectedMeshes.forEach(restoreMaterial);
 selectedMeshes = group;
 selected = nextSelected;
 selectedLabel = nextLabel;
 const hi = (mat) => { const m = mat.clone(); if (m.emissive) { m.emissive.set("#6b4215"); m.emissiveIntensity = .55; } return m; };
 selectedMeshes.forEach(partMesh => {
  const base = partMesh.userData.baseMaterial || partMesh.material;
  partMesh.material = Array.isArray(base) ? base.map(hi) : hi(base);
 });
 renderParts(); updatePartControls(); requestRender();
}

function renderParts() {
 const query = $("search").value.trim().toLowerCase();
 const active = document.querySelector("#categories .cat.active")?.dataset.cat || "all";
 const list = mainPartEntries.filter(entry =>
  entry.meshes.length > 0 &&
  entry.meshes.some(mesh=>mesh.visible) &&
  (active === "all" || entry.category === active) &&
  (!query || entry.label.toLowerCase().includes(query))
 );
 $("parts").replaceChildren();
 $("count").textContent = list.length + " أجزاء رئيسية";
 if (!list.length) { const e=document.createElement("div"); e.className="empty"; e.textContent="لا توجد أجزاء مطابقة."; $("parts").append(e); return; }
 list.forEach((entry,index) => {
  const b=document.createElement("button"); b.type="button";
  b.className="part"+(entry.meshes.some(m=>selectedMeshes.includes(m))?" active":"");
  const mark=document.createElement("span"); mark.className="part-mark"; mark.textContent=String(index+1).padStart(2,"0");
  const copy=document.createElement("span"); copy.className="part-copy";
  const strong=document.createElement("strong"); strong.textContent=entry.label;
  const small=document.createElement("small"); small.textContent=partCategoryLabels[entry.category]||"السيارة";
  copy.append(strong,small); b.append(mark,copy);
  b.addEventListener("click",()=>setSelected(entry.meshes[0]||null,entry)); $("parts").append(b);
 });
}

$("search").addEventListener("input",renderParts);
$("categories").addEventListener("click",(e)=>{const b=e.target.closest("button[data-cat]");if(!b)return;document.querySelectorAll("#categories .cat").forEach(x=>x.classList.toggle("active",x===b));renderParts();});
canvas.addEventListener("pointerup",(event) => {
 if (!model || event.button !== 0) return;
 const rect=canvas.getBoundingClientRect(); pointer.x=((event.clientX-rect.left)/rect.width)*2-1; pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(meshes.filter(m=>m.visible&&mainPartEntries.some(p=>p.meshes.includes(m))),false)[0];
 if(hit) setSelected(hit.object,mainPartEntries.find(p=>p.meshes.includes(hit.object))||null);
});
function tween(fn, duration=260) {
 const start=performance.now();
 const tick=(now)=>{const p=Math.min(1,(now-start)/duration);fn(p);requestRender();if(p<1)requestAnimationFrame(tick);};
 requestAnimationFrame(tick);
}
$("zoomIn").addEventListener("click",()=>{const delta=camera.position.clone().sub(controls.target).multiplyScalar(.17);camera.position.sub(delta);requestRender();});
$("zoomOut").addEventListener("click",()=>{const delta=camera.position.clone().sub(controls.target).multiplyScalar(.2);camera.position.add(delta);requestRender();});
$("reset").addEventListener("click",()=>{if(!homeCamera)return;camera.position.copy(homeCamera.position);controls.target.copy(homeCamera.target);controls.minDistance=1.2;exploded=false;inside=false;meshes.forEach(m=>{m.position.copy(originalPositions.get(m));m.visible=true;});$("explode").textContent="تفكيك بصري";$("inside").textContent="عرض المقصورة";setSelected(null);requestRender();});
$("explode").addEventListener("click",()=>{
 if(!model)return;
 exploded=!exploded;
 meshes.forEach((m)=>{
  const base=originalPositions.get(m);
  if(!exploded){m.position.copy(base);return;}
  const wp=new THREE.Vector3();m.getWorldPosition(wp);
  const direction=wp.clone().sub(modelCenter).normalize();
  if(direction.lengthSq()<.01)direction.set(0,1,0);
  const p=base.clone().add(direction.multiplyScalar(.42));
  tween((t)=>{m.position.lerpVectors(exploded?base:p,exploded?p:base,t);},360);
 });
 $("explode").textContent=exploded?"إرجاع القطع":"تفكيك بصري";
 requestRender();
});
$("inside").addEventListener("click",()=>{
 inside=!inside;
 const cabinMeshes = new Set(mainPartEntries.filter(p=>p.category==="cabin").flatMap(p=>p.meshes));
 if (cabinMeshes.size) meshes.forEach(m=>{m.visible=!inside||cabinMeshes.has(m);});
 else meshes.forEach(m=>{m.visible=!inside||!exteriorPattern.test(String(m.name||""));});
 if (inside) {
  const interiorTarget = modelCenter.clone().add(new THREE.Vector3(0, 0.12, 0));
  controls.minDistance = 0.25;
  controls.target.copy(interiorTarget);
  camera.position.copy(interiorTarget).add(new THREE.Vector3(0.28, 0.2, 0.72));
 } else if (homeCamera) {
  controls.minDistance = 1.2;
  camera.position.copy(homeCamera.position);
  controls.target.copy(homeCamera.target);
 }
 $("inside").textContent=inside?"إظهار الهيكل":"عرض المقصورة";
 if(selected&&!selected.visible)setSelected(null);
 renderParts();requestRender();
});
document.querySelectorAll("[data-move]").forEach((button) => {
 button.addEventListener("click", () => {
  if (!selected) return;
  const [axis, direction] = button.dataset.move.split(":");
  const delta = Number(direction) * 0.06;
  if (!["x", "y", "z"].includes(axis) || !Number.isFinite(delta)) return;
  selectedMeshes.forEach(partMesh => { partMesh.position[axis] += delta; });
  requestRender();
 });
});
$("backBtn").addEventListener("click",()=>{ window.location.href="/practical-info"; });
$("helpBtn").addEventListener("click",()=>alert("اسحب المشهد لتدوير السيارة، واستخدم التكبير لإظهار التفاصيل. اختر أي قطعة من النموذج أو القائمة، واستخدم «تفكيك بصري» لفصل الأجزاء مؤقتاً. عرض الداخل يعتمد على أسماء أجزاء المجسّم الأصلية."));
resize();
