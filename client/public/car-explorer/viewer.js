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
 mustang: { label: "Ford Mustang GT · 2005", description: "نموذج Mustang GT لعام 2005. تُحفظ نسبة العمل لصاحب النموذج في رابط الترخيص.", url: "https://raw.githubusercontent.com/nesdesignco/FormDrive/main/public/models/mustang-2005.glb", attribution: true },
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
 let n = String(raw || "").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
 n = n.replace(/\.\d{3}$/,"");
 if (!n || /^(mesh|object|cube|sphere|plane)(\s*\d*)?$/i.test(n)) return "قطعة من السيارة " + (index + 1);
 const map = [
  [/(hood|bonnet)/i,"غطاء المحرك"],[/(front.?bumper)/i,"الصدام الأمامي"],[/(rear.?bumper)/i,"الصدام الخلفي"],
  [/(wheel|tire|tyre)/i,"العجلة / الإطار"],[/(head.?light|headlamp)/i,"المصباح الأمامي"],[/(tail.?light|rear.?lamp)/i,"المصباح الخلفي"],
  [/(wind.?screen|windshield)/i,"الزجاج الأمامي"],[/(door)/i,"باب السيارة"],[/(seat)/i,"المقعد"],[/(steer)/i,"عجلة القيادة"],
  [/(engine|motor)/i,"مجموعة المحرك"],[/(exhaust)/i,"أنبوب العادم"],[/(dashboard|dash)/i,"لوحة القيادة"],[/(grille|grill)/i,"شبك الواجهة"]
 ];
 for (const [re, label] of map) if (re.test(n)) return label;
 return n.length > 46 ? n.slice(0,43) + "…" : n;
};
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
 document.querySelectorAll("[data-move]").forEach((button) => { button.disabled = !selected; });
 const label = $("selectedPartName");
 if (label) label.textContent = selected ? cleanName(selected.name, meshes.indexOf(selected)) : "اختر قطعة أولاً";
}
function clearLoadedModel() {
 if (model) { scene.remove(model); disposeScene(model); }
 model = null; meshes = []; selected = null; exploded = false; inside = false;
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
function setSelected(mesh) {
 if (selected === mesh) return;
 restoreMaterial(selected);
 selected = mesh;
 if (selected) {
  const hi = (mat) => { const m = mat.clone(); if (m.emissive) { m.emissive.set("#6b4215"); m.emissiveIntensity = .55; } return m; };
  selected.material = Array.isArray(selected.userData.baseMaterial) ? selected.userData.baseMaterial.map(hi) : hi(selected.userData.baseMaterial);
 }
 renderParts(); updatePartControls(); requestRender();
}
function renderParts() {
 const query = $("search").value.trim().toLowerCase();
 const active = document.querySelector(".cat.active")?.dataset.cat || "all";
 const list = meshes.filter((m) => {
  const n = cleanName(m.name, meshes.indexOf(m));
  return (active === "all" || categoryFor(m) === active) && (!query || n.toLowerCase().includes(query) || String(m.name).toLowerCase().includes(query));
 });
 $("parts").replaceChildren();
 $("count").textContent = list.length + " / " + meshes.length;
 if (!list.length) { const e = document.createElement("div"); e.className="empty"; e.textContent="لا توجد قطع مطابقة للبحث أو التصنيف."; $("parts").append(e); return; }
 list.slice(0, 300).forEach((mesh) => {
  const i = meshes.indexOf(mesh), b = document.createElement("button");
  b.type="button"; b.className="part" + (mesh === selected ? " active" : "");
  const mark = document.createElement("span"); mark.className="part-mark"; mark.textContent=String(i+1).padStart(2,"0");
  const copy = document.createElement("span"); copy.className="part-copy";
  const strong = document.createElement("strong"); strong.textContent=cleanName(mesh.name,i);
  const small = document.createElement("small"); small.textContent=categoryLabel[categoryFor(mesh)] || "مكوّن";
  copy.append(strong,small); b.append(mark,copy); b.addEventListener("click",()=>setSelected(mesh)); $("parts").append(b);
 });
}
$("search").addEventListener("input",renderParts);
$("categories").addEventListener("click",(e)=>{const b=e.target.closest("button[data-cat]");if(!b)return;document.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));renderParts();});
canvas.addEventListener("pointerup",(event) => {
 if (!model || event.button !== 0) return;
 const rect=canvas.getBoundingClientRect(); pointer.x=((event.clientX-rect.left)/rect.width)*2-1; pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0];
 if(hit) setSelected(hit.object);
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
 meshes.forEach(m=>{m.visible=!inside||!exteriorPattern.test(String(m.name||""));});
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
  selected.position[axis] += delta;
  requestRender();
 });
});
$("backBtn").addEventListener("click",()=>{ window.location.href="/practical-info"; });
$("helpBtn").addEventListener("click",()=>alert("اسحب المشهد لتدوير السيارة، واستخدم التكبير لإظهار التفاصيل. اختر أي قطعة من النموذج أو القائمة، واستخدم «تفكيك بصري» لفصل الأجزاء مؤقتاً. عرض الداخل يعتمد على أسماء أجزاء المجسّم الأصلية."));
resize();
