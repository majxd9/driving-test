import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const canvas = $("stage");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0d11");
const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 500);
camera.position.set(4.8, 3.0, 5.8);
const renderer = new THREE.WebGLRenderer({canvas, antialias: !matchMedia("(max-width: 700px)").matches, alpha: false, powerPreference: "high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
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
 camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); requestRender();
};
const ro = new ResizeObserver(resize); ro.observe(canvas);
window.addEventListener("resize", resize, {passive:true});
const setLoadError = (message) => {
 $("loadTitle").textContent = "تعذر تحميل نموذج السيارة";
 $("loadMessage").textContent = message;
 $("status").textContent = "الملف غير متاح";
 $("progress").style.width = "0%";
};
const loader = new GLTFLoader();
loader.load("./challenger-1970.glb", (gltf) => {
 model = gltf.scene;
 const box = new THREE.Box3().setFromObject(model);
 modelCenter.copy(box.getCenter(new THREE.Vector3()));
 const size = box.getSize(new THREE.Vector3());
 const maxDim = Math.max(size.x, size.y, size.z) || 1;
 model.scale.setScalar(4.2 / maxDim);
 model.position.sub(modelCenter.multiplyScalar(model.scale.x));
 model.updateMatrixWorld(true);
 scene.add(model);
 model.traverse((obj) => {
  if (!obj.isMesh) return;
  obj.castShadow = false; obj.receiveShadow = false;
  obj.userData.baseMaterial = obj.material;
  obj.userData.baseVisible = obj.visible;
  originalPositions.set(obj, obj.position.clone());
  meshes.push(obj);
 });
 $("count").textContent = meshes.length + " قطعة";
 $("status").textContent = "تم تحميل النموذج";
 $("loadTitle").textContent = "اكتمل تحميل السيارة";
 $("progress").style.width = "100%";
 homeCamera = {position:camera.position.clone(), target:controls.target.clone()};
 renderParts();
 setTimeout(() => $("load").classList.add("hidden"), 250);
 requestRender();
}, (xhr) => {
 if (xhr.total > 0) $("progress").style.width = Math.min(100, (xhr.loaded/xhr.total)*100) + "%";
 $("status").textContent = "تحميل " + (xhr.total > 0 ? Math.round(xhr.loaded/xhr.total*100) + "%" : "…");
}, (err) => {
 console.error(err);
 setLoadError("ملف النموذج challenger-1970.glb لم يُعثر عليه أو تعذر قراءته. يجب إضافة ملف Blender المحوّل إلى مجلد public/car-explorer قبل نشر هذه الصفحة.");
});
function restoreMaterial(mesh) { if (mesh) mesh.material = mesh.userData.baseMaterial; }
function setSelected(mesh) {
 if (selected === mesh) return;
 restoreMaterial(selected);
 selected = mesh;
 if (selected) {
  const hi = (mat) => { const m = mat.clone(); if (m.emissive) { m.emissive.set("#6b4215"); m.emissiveIntensity = .55; } return m; };
  selected.material = Array.isArray(selected.userData.baseMaterial) ? selected.userData.baseMaterial.map(hi) : hi(selected.userData.baseMaterial);
 }
 renderParts(); requestRender();
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
$("reset").addEventListener("click",()=>{if(!homeCamera)return;camera.position.copy(homeCamera.position);controls.target.copy(homeCamera.target);exploded=false;inside=false;meshes.forEach(m=>{m.position.copy(originalPositions.get(m));m.visible=true;});$("explode").textContent="تفكيك بصري";$("inside").textContent="كشف الداخل";setSelected(null);requestRender();});
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
 $("inside").textContent=inside?"إظهار الهيكل":"كشف الداخل";
 if(selected&&!selected.visible)setSelected(null);
 renderParts();requestRender();
});
$("backBtn").addEventListener("click",()=>{
 if(window.parent!==window)window.parent.postMessage({type:"CAR_EXPLORER_CLOSE"},window.location.origin);
 else if(history.length>1)history.back();else window.location.href="/practical-info";
});
$("helpBtn").addEventListener("click",()=>alert("اسحب المشهد لتدوير السيارة، واستخدم التكبير لإظهار التفاصيل. اختر أي قطعة من النموذج أو القائمة، واستخدم «تفكيك بصري» لفصل الأجزاء مؤقتاً. عرض الداخل يعتمد على أسماء أجزاء المجسّم الأصلية."));
resize();
