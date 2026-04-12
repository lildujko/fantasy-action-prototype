
let scene, camera, renderer, clock;
let player;
let keys = {};
let npcs = [];
let enemies = [];
let ores = [];
let doors = [];
let collisionBoxes = [];
let uiPanelOpen = false;
let selectedClass = null;

const mouseLook = { yaw: 0, pitch: 0.34, distance: 10.0 };
const hotbar = { active: 1, slots: { 1: "Rusty Sword", 2: "Empty", 3: "Empty", 4: "Empty", 5: "Empty" } };

const state = {
  money: 0, health: 100, maxHealth: 100,
  questAccepted: false, questComplete: false,
  hasPickaxe: false,
  iron: 0, wood: 0, cloth: 0, crystal: 0,
  weapon: "Rusty Sword", weaponDamage: 8,
  ownsKatana: false
};

function startGame(type){
  selectedClass = type;
  document.getElementById("start-screen").style.display = "none";
  init();
  animate();
}

function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a8cc);
  scene.fog = new THREE.Fog(0x87a8cc, 70, 220);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0,10,16);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  setupLights();
  createGround();
  createTown();
  createForestRing();
  player = createPlayer(selectedClass);
  spawnEnemiesByDistance();

  bindEvents();
  updateHUD();
  updateHotbar();
  showMessage("You arrived in town.");
}

function bindEvents(){
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
}

function setupLights(){
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(30,40,20);
  scene.add(sun);
}

function createGround(){
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420,420), new THREE.MeshStandardMaterial({ color: 0x6d8754 }));
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(26,56), new THREE.MeshStandardMaterial({ color: 0xa5aab2 }));
  plaza.rotation.x = -Math.PI/2;
  plaza.position.y = 0.03;
  scene.add(plaza);

  addRoad(0,0,12,76,0xb8bdc5);
  addRoad(0,0,76,12,0xb8bdc5);
}

function addRoad(x,z,w,d,color){
  const road = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshStandardMaterial({ color }));
  road.rotation.x = -Math.PI/2;
  road.position.set(x,0.04,z);
  scene.add(road);
}

function createTown(){
  createTownHall(0,42);
  createClockTower(0,0);

  createBuilding(-30,-18,14,10,0x8b5e3c,"Weapons","weapon");
  createBuilding(0,-18,14,10,0x7b5537,"Supplies","supplies");
  createBuilding(30,-18,14,10,0x6f4a2f,"Inn","inn");

  createBuilding(-34,18,14,10,0x70563d,"Workshop","workshop");
  createBuilding(0,24,16,12,0x59616f,"Forge","forge");
  createBuilding(34,18,14,10,0x7c6a58,"Storage","storage");

  createGate(0,-37);

  createNPC("Quest Giver",-10,-2,0x3b82f6,"quest");
  createNPC("Weapons Dealer",-30,-17,0xf59e0b,"merchant");
  createNPC("Blacksmith",0,24,0x94a3b8,"forge");

  for(let i=-32;i<=32;i+=8){ createLamp(i,-28); createLamp(i,28); }
  createLamp(-28,0); createLamp(28,0);
}

function createClockTower(x,z){
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2,4.0,3.0,20), new THREE.MeshStandardMaterial({ color: 0x64748b }));
  base.position.set(x,1.5,z);
  scene.add(base);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.55,9.5,18), new THREE.MeshStandardMaterial({ color: 0x9298a1 }));
  tower.position.set(x,7,z);
  scene.add(tower);

  const face = new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,0.26,28), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  face.position.set(x,10.2,z+1.45);
  face.rotation.x = Math.PI/2;
  scene.add(face);

  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.14,1.0,0.06), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  hour.position.set(x,10.21,z+1.47);
  hour.rotation.x = Math.PI/2;
  hour.rotation.z = 0.55;
  scene.add(hour);

  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.08,1.35,0.05), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  minute.position.set(x,10.22,z+1.49);
  minute.rotation.x = Math.PI/2;
  minute.rotation.z = -0.35;
  scene.add(minute);
}

function createTownHall(x,z){
  const body = new THREE.Mesh(new THREE.BoxGeometry(24,11,14), new THREE.MeshStandardMaterial({ color: 0x8a6a47 }));
  body.position.set(x,5.5,z);
  scene.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(11.0,5.4,4), new THREE.MeshStandardMaterial({ color: 0x4b2e1a }));
  roof.position.set(x,13.0,z);
  roof.rotation.y = Math.PI*0.25;
  scene.add(roof);

  addDoubleSidedSign("Town Hall", x, 8.0, z-7.2, 6.0, 1.9);

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6,3.8,0.24), new THREE.MeshStandardMaterial({ color: 0x4b2e1a }));
  door.position.set(x,1.9,z-7.12);
  scene.add(door);

  doors.push({ role:"townhall", label:"Town Hall", position:new THREE.Vector3(x,0,z-8.7) });
  collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-12,0,z-7), new THREE.Vector3(x+12,11,z+7)));
}

function createBuilding(x,z,w,d,color,label,role){
  const body = new THREE.Mesh(new THREE.BoxGeometry(w,6.8,d), new THREE.MeshStandardMaterial({ color }));
  body.position.set(x,3.4,z);
  scene.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(w*0.72,3.5,4), new THREE.MeshStandardMaterial({ color: 0x3b2f2f }));
  roof.position.set(x,8.0,z);
  roof.rotation.y = Math.PI*0.25;
  scene.add(roof);

  addDoubleSidedSign(label, x, 5.6, z-d/2-0.55, 5.8, 1.9);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.9,3.1,0.24), new THREE.MeshStandardMaterial({ color: 0x4b2e1a }));
  door.position.set(x,1.55,z-d/2-0.12);
  scene.add(door);

  doors.push({ role, label, position:new THREE.Vector3(x,0,z-d/2-1.9) });
  collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2), new THREE.Vector3(x+w/2,7,z+d/2)));
}

function addDoubleSidedSign(text, x, y, z, w, h){
  const sign = createStaticSign(text, 320, w, h);
  sign.position.set(x,y,z);
  sign.material.side = THREE.DoubleSide;
  scene.add(sign);
}

function createStaticSign(text, width=320, worldW=5.4, worldH=1.8){
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f2d39b";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#6b4423";
  ctx.lineWidth = 8;
  ctx.strokeRect(4,4,canvas.width-8,canvas.height-8);
  ctx.fillStyle = "#2f2418";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(worldW,worldH), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

function createGate(x,z){
  const left = new THREE.Mesh(new THREE.BoxGeometry(2,8,2), new THREE.MeshStandardMaterial({ color: 0x64748b }));
  left.position.set(x-4,4,z); scene.add(left);
  const right = left.clone(); right.position.x = x+4; scene.add(right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10,2,2), new THREE.MeshStandardMaterial({ color: 0x475569 }));
  top.position.set(x,8,z); scene.add(top);

  collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-5,0,z-1), new THREE.Vector3(x-3,8,z+1)));
  collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x+3,0,z-1), new THREE.Vector3(x+5,8,z+1)));
}

function createLamp(x,z){
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,4,8), new THREE.MeshStandardMaterial({ color: 0x3f3f46 }));
  post.position.set(x,2,z); scene.add(post);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45,12,12), new THREE.MeshStandardMaterial({ color: 0xf8e16c, emissive: 0xf8e16c, emissiveIntensity: 0.7 }));
  glow.position.set(x,4.2,z); scene.add(glow);
}

function createNPC(name,x,z,color,role){
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9,1.2,0.55), new THREE.MeshStandardMaterial({ color }));
  torso.position.y = 1.2; g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35,14,14), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
  head.position.y = 2.15; g.add(head);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.95,0.24), new THREE.MeshStandardMaterial({ color }));
  leftArm.position.set(-0.65,1.25,0); g.add(leftArm);
  const rightArm = leftArm.clone(); rightArm.position.x = 0.65; g.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28,1,0.28), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
  leftLeg.position.set(-0.22,0.45,0); g.add(leftLeg);
  const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.22; g.add(rightLeg);

  if(role==="merchant"){
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.35,12), new THREE.MeshStandardMaterial({ color: 0x7c2d12 }));
    hat.position.y = 2.55; g.add(hat);
  }
  if(role==="forge"){
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.8,0.15), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
    hammer.position.set(0.78,1.2,0); g.add(hammer);
  }

  g.position.set(x,0,z); scene.add(g);
  npcs.push({ name, role, mesh: g });
}

function createPlayer(playerClass){
  const colors = { demon: 0x7f1d1d, mage: 0x4338ca, beast: 0x7c2d12 };
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1,1.35,0.65), new THREE.MeshStandardMaterial({ color: colors[playerClass] || 0x2563eb }));
  torso.position.y = 1.25; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38,16,16), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
  head.position.y = 2.25; g.add(head);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24,1.05,0.24), new THREE.MeshStandardMaterial({ color: colors[playerClass] || 0x2563eb }));
  leftArm.position.set(-0.72,1.25,0); g.add(leftArm);
  const rightArm = leftArm.clone(); rightArm.position.x = 0.72; g.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3,1.1,0.3), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  leftLeg.position.set(-0.24,0.5,0); g.add(leftLeg);
  const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.24; g.add(rightLeg);

  if(playerClass==="mage"){
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55,1.25,12), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    hat.position.y = 2.95; g.add(hat);
  }
  if(playerClass==="demon"){
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.55,10), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    horn1.position.set(0.2,2.75,0.05); horn1.rotation.z = -0.5; g.add(horn1);
    const horn2 = horn1.clone(); horn2.position.x = -0.2; horn2.rotation.z = 0.5; g.add(horn2);
  }
  if(playerClass==="beast"){
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.45,10), new THREE.MeshStandardMaterial({ color: 0x3f2a18 }));
    ear1.position.set(0.23,2.75,0); g.add(ear1);
    const ear2 = ear1.clone(); ear2.position.x = -0.23; g.add(ear2);
  }

  const sword = createSword(); sword.position.set(0.92,1.18,0); g.add(sword);
  const pickaxe = createPickaxe(); pickaxe.position.set(0.92,1.2,0); pickaxe.visible = false; g.add(pickaxe);

  g.position.set(0,0,0); scene.add(g);
  return { mesh: g, swordMesh: sword, pickaxeMesh: pickaxe, moveSpeed: 5.0, sprintSpeed: 7.8, attackTimer: 0, attackCooldown: 0, attacking: false, justHit: new Set(), velocity: new THREE.Vector3() };
}

function createSword(){
  const group = new THREE.Group();

  const bladeGeo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -0.07,-0.05,0.0, 0.07,-0.05,0.0, -0.03,0.05,2.2,
    0.07,-0.05,0.0, 0.03,0.05,2.2, -0.03,0.05,2.2
  ]);
  bladeGeo.setAttribute("position", new THREE.BufferAttribute(verts,3));
  bladeGeo.computeVertexNormals();

  group.add(new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xdbe3ec, metalness: 0.88, roughness: 0.16 })));

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,1.9), new THREE.MeshStandardMaterial({ color: 0x8fa0b3, metalness: 0.9, roughness: 0.2 }));
  ridge.position.set(0,0.01,0.95); group.add(ridge);

  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.8,12), new THREE.MeshStandardMaterial({ color: 0xbfc8d3 }));
  guard.rotation.z = Math.PI/2; guard.position.z = -0.05; group.add(guard);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.68,10), new THREE.MeshStandardMaterial({ color: 0x3f2a18 }));
  handle.rotation.x = Math.PI/2; handle.position.z = -0.42; group.add(handle);

  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.09,10,10), new THREE.MeshStandardMaterial({ color: 0x9aa7b5 }));
  pommel.position.z = -0.77; group.add(pommel);

  group.rotation.x = Math.PI/2; group.rotation.z = 0.18;
  return group;
}

function createPickaxe(){
  const group = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.55,10), new THREE.MeshStandardMaterial({ color: 0x7c5a34 }));
  handle.rotation.z = 0.4; group.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.12,0.14), new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
  head.position.set(0.26,0.56,0); head.rotation.z = 0.4; group.add(head);
  return group;
}

function createForestRing(){
  const count = 90;
  for(let i=0;i<count;i++){
    const angle = (Math.PI * 2 * i) / count;
    const radius = 62 + Math.random() * 38;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if(Math.abs(x) < 45 && Math.abs(z) < 45) continue;
    createTree(x,z);
    if(Math.random() < 0.16) spawnOre(x + Math.random()*6 - 3, z + Math.random()*6 - 3);
  }
}

function createTree(x,z){
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,3.2,8), new THREE.MeshStandardMaterial({ color: 0x6b4423 }));
  trunk.position.set(x,1.6,z); scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.7,12,12), new THREE.MeshStandardMaterial({ color: 0x2f6b32 }));
  leaves.position.set(x,4.3,z); scene.add(leaves);
}

function spawnOre(x,z){
  const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8,0), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
  ore.position.set(x,0.9,z); scene.add(ore);
  ores.push({ mesh: ore, mined: false });
}

function spawnEnemiesByDistance(){
  for(let i=0;i<18;i++){
    const ring = i < 6 ? 1 : i < 12 ? 2 : 3;
    const radius = ring === 1 ? 70 + Math.random()*20 : ring === 2 ? 95 + Math.random()*25 : 125 + Math.random()*35;
    const angle = Math.random() * Math.PI * 2;
    spawnEnemy(Math.cos(angle) * radius, Math.sin(angle) * radius, ring);
  }
}

function spawnEnemy(x,z,tier){
  const colors = { 1: 0x4d6b39, 2: 0x6b4d39, 3: 0x4b3a6b };
  const group = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9,1.2,0.55), new THREE.MeshStandardMaterial({ color: colors[tier] }));
  torso.position.y = 1.2; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33,14,14), new THREE.MeshStandardMaterial({ color: 0x7fa36c }));
  head.position.y = 2.1; group.add(head);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2,1.0,0.2), new THREE.MeshStandardMaterial({ color: colors[tier] }));
  leftArm.position.set(-0.63,1.2,0.15); leftArm.rotation.x = 0.45; group.add(leftArm);
  const rightArm = leftArm.clone(); rightArm.position.x = 0.63; group.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26,1.0,0.26), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  leftLeg.position.set(-0.2,0.48,0); group.add(leftLeg);
  const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.2; group.add(rightLeg);

  group.position.set(x,0,z);
  scene.add(group);

  enemies.push({
    mesh: group,
    tier,
    health: tier === 1 ? 24 : tier === 2 ? 40 : 62,
    speed: tier === 1 ? 2.2 : tier === 2 ? 2.8 : 3.4,
    damage: tier === 1 ? 6 : tier === 2 ? 10 : 14,
    damageCooldown: 0
  });
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e){
  const key = e.key.toLowerCase();
  keys[key] = true;

  if(["1","2","3","4","5"].includes(key)){
    hotbar.active = Number(key);
    updateHotbar();
    applySelectedSlot();
  }
  if(key === "e") tryInteract();
}

function onKeyUp(e){ keys[e.key.toLowerCase()] = false; }

function onMouseMove(e){
  if(uiPanelOpen) return;
  mouseLook.yaw -= e.movementX * 0.0022;
  mouseLook.pitch += e.movementY * 0.0016;
  mouseLook.pitch = clamp(mouseLook.pitch, 0.12, 1.08);
}

function onMouseDown(e){
  if(uiPanelOpen) return;
  if(e.button === 0 && player.attackCooldown <= 0) beginAttack();
}

function beginAttack(){
  if(hotbar.active === 2 && state.hasPickaxe){
    showMessage("Pickaxe equipped.");
    return;
  }
  player.attacking = true;
  player.attackTimer = 0.28;
  player.attackCooldown = 0.42;
  player.justHit.clear();
}

function updatePlayer(dt){
  if(uiPanelOpen) return;

  const input = new THREE.Vector3();
  if(keys["w"]) input.z -= 1;
  if(keys["s"]) input.z += 1;
  if(keys["a"]) input.x -= 1;
  if(keys["d"]) input.x += 1;

  let desiredVelocity = new THREE.Vector3();
  if(input.lengthSq() > 0){
    input.normalize();
    const forward = new THREE.Vector3(Math.sin(mouseLook.yaw), 0, Math.cos(mouseLook.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    desiredVelocity.addScaledVector(forward, -input.z);
    desiredVelocity.addScaledVector(right, input.x);
    desiredVelocity.normalize();
    desiredVelocity.multiplyScalar(keys["shift"] ? player.sprintSpeed : player.moveSpeed);
    player.mesh.rotation.y = Math.atan2(desiredVelocity.x, desiredVelocity.z);
  }

  player.velocity.lerp(desiredVelocity, 0.22);

  const next = player.mesh.position.clone().addScaledVector(player.velocity, dt);
  if(!intersectsBuilding(next)){
    player.mesh.position.copy(next);
  } else {
    const xOnly = player.mesh.position.clone(); xOnly.x += player.velocity.x * dt;
    if(!intersectsBuilding(xOnly)) player.mesh.position.x = xOnly.x;
    const zOnly = player.mesh.position.clone(); zOnly.z += player.velocity.z * dt;
    if(!intersectsBuilding(zOnly)) player.mesh.position.z = zOnly.z;
  }

  if(player.attackCooldown > 0) player.attackCooldown -= dt;
  if(player.attacking){
    player.attackTimer -= dt;
    player.swordMesh.rotation.z = -1.5 + (0.28 - Math.max(player.attackTimer,0)) * 8.5;
    if(player.attackTimer > 0.08 && player.attackTimer < 0.22) hitEnemies();
    if(player.attackTimer <= 0){
      player.attacking = false;
      player.swordMesh.rotation.z = 0.18;
    }
  }

  player.mesh.position.x = clamp(player.mesh.position.x, -180, 180);
  player.mesh.position.z = clamp(player.mesh.position.z, -180, 180);

  updateCamera();
}

function updateCamera(){
  const target = new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 2.1, player.mesh.position.z);
  const offset = new THREE.Vector3(
    Math.sin(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance,
    Math.sin(mouseLook.pitch) * mouseLook.distance + 1.3,
    Math.cos(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance
  );
  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 0.14);
  camera.lookAt(target);
}

function intersectsBuilding(pos){
  const playerBox = new THREE.Box3(
    new THREE.Vector3(pos.x - 0.55, 0, pos.z - 0.55),
    new THREE.Vector3(pos.x + 0.55, 2.8, pos.z + 0.55)
  );
  return collisionBoxes.some(box => box.intersectsBox(playerBox));
}

function updateEnemies(dt){
  for(let i = enemies.length - 1; i >= 0; i--){
    const enemy = enemies[i];
    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, enemy.mesh.position);
    const dist = toPlayer.length();

    if(dist < 22 && !uiPanelOpen){
      toPlayer.y = 0;
      toPlayer.normalize();
      enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * dt);
      enemy.mesh.lookAt(player.mesh.position.x, enemy.mesh.position.y, player.mesh.position.z);
    }

    if(enemy.damageCooldown > 0) enemy.damageCooldown -= dt;
    if(dist < 1.55 && enemy.damageCooldown <= 0){
      state.health -= enemy.damage;
      enemy.damageCooldown = 1.0;
      showMessage("An enemy hit you.");
      if(state.health <= 0){
        state.health = state.maxHealth;
        player.mesh.position.set(0,0,0);
        showMessage("You were sent back to town.");
      }
      updateHUD();
    }

    if(enemy.health <= 0){
      scene.remove(enemy.mesh);
      enemies.splice(i,1);

      rewardForTier(enemy.tier);
      updateHUD();

      const radius = enemy.tier === 1 ? 70 + Math.random()*20 : enemy.tier === 2 ? 95 + Math.random()*25 : 125 + Math.random()*35;
      const angle = Math.random() * Math.PI * 2;
      spawnEnemy(Math.cos(angle) * radius, Math.sin(angle) * radius, enemy.tier);
    }
  }
}

function hitEnemies(){
  const weaponPos = new THREE.Vector3();
  player.swordMesh.getWorldPosition(weaponPos);

  for(const enemy of enemies){
    if(player.justHit.has(enemy)) continue;
    if(weaponPos.distanceTo(enemy.mesh.position) < 1.9){
      enemy.health -= state.weaponDamage;
      player.justHit.add(enemy);
    }
  }
}

function rewardForTier(tier){
  if(tier === 1){
    state.money += 1;
    if(Math.random() < 0.18) state.iron += 1;
    if(Math.random() < 0.10) state.wood += 1;
    showMessage("Weak enemy defeated.");
  } else if(tier === 2){
    state.money += 3;
    if(Math.random() < 0.35) state.iron += 1;
    if(Math.random() < 0.25) state.wood += 1;
    if(Math.random() < 0.15) state.cloth += 1;
    showMessage("Mid enemy defeated.");
  } else {
    state.money += 6;
    if(Math.random() < 0.45) state.iron += 2;
    if(Math.random() < 0.25) state.cloth += 1;
    if(Math.random() < 0.18) state.crystal += 1;
    showMessage("Strong enemy defeated.");
  }
  updateQuestProgress();
}

function tryInteract(){
  const p = player.mesh.position;

  for(const door of doors){
    if(p.distanceTo(door.position) < 3.2){
      openDoorMenu(door);
      return;
    }
  }

  for(const npc of npcs){
    if(p.distanceTo(npc.mesh.position) < 3.3){
      if(npc.role === "quest"){
        if(!state.questAccepted){
          state.questAccepted = true;
          state.hasPickaxe = true;
          hotbar.slots[2] = "Pickaxe";
          document.getElementById("quest-text").textContent = "Mine 5 iron ore outside the town.";
          showMessage("Quest accepted. You received a pickaxe.");
          updateHotbar();
        } else if(!state.questComplete){
          showMessage("Bring me 5 iron ore.");
        } else {
          showMessage("The road south will lead to the next town after a boss is added.");
        }
        updateHUD();
        return;
      }
      if(npc.role === "merchant"){ openShop(); return; }
      if(npc.role === "forge"){ useForge(); return; }
    }
  }

  for(const ore of ores){
    if(ore.mined) continue;
    if(p.distanceTo(ore.mesh.position) < 2.6){
      if(!state.hasPickaxe){ showMessage("You need a pickaxe first."); return; }
      if(hotbar.active !== 2){ showMessage("Equip the pickaxe in slot 2."); return; }
      ore.mined = true;
      scene.remove(ore.mesh);
      state.iron += 1;
      showMessage("You mined 1 iron ore.");
      updateQuestProgress();
      updateHUD();
      return;
    }
  }

  showMessage("Nothing to interact with.");
}

function openDoorMenu(door){
  if(door.role === "weapon"){
    openPanel("Weapons Shop","You enter the weapons shop.",[
      { label:"Talk to Weapons Dealer", action:()=>{ closePanel(); openShop(); } },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  if(door.role === "forge"){
    openPanel("Forge","Forge weapons and gear here.",[
      { label:"Forge Iron Sword (5 Iron)", action:()=>forgeIronSword() },
      { label:"Forge Steel Sword (8 Iron, 2 Crystal)", action:()=>forgeSteelSword() },
      { label:"Craft Armor Plate (4 Iron, 1 Cloth)", action:()=>craftArmorPlate() },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  if(door.role === "workshop"){
    openPanel("Workshop","Craft support items here.",[
      { label:"Craft Health Kit (2 Cloth, 1 Wood)", action:()=>craftHealthKit() },
      { label:"Craft Bow Kit (3 Wood, 1 Cloth)", action:()=>craftBowKit() },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  if(door.role === "supplies"){
    openPanel("Supplies","Choose what you want.",[
      { label:"Buy Health Kit - 15", action:()=>buyHealthKit() },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  if(door.role === "inn"){
    openPanel("Inn","Choose what you want.",[
      { label:"Rest", action:()=>restAtInn() },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  if(door.role === "townhall"){
    openPanel("Town Hall","Town hall menu.",[
      { label:"Read Notice Board", action:()=>showTownNotice() },
      { label:"Leave", action:()=>closePanel() }
    ]);
    return;
  }
  openPanel(door.label,"This building will be expanded later.",[
    { label:"Leave", action:()=>closePanel() }
  ]);
}

function openShop(){
  openPanel("Weapons","Choose a weapon to buy.",[
    { label:"Hunter Spear - 35", action:()=>buyItem("Hunter Spear",35,14) },
    { label:"Mage Staff - 45", action:()=>buyItem("Mage Staff",45,16) },
    { label:"Katana - 50", action:()=>buyItem("Katana",50,18,true) },
    { label:"Battle Axe - 60", action:()=>buyItem("Battle Axe",60,21) },
    { label:"Demon Blade - 75", action:()=>buyItem("Demon Blade",75,25) }
  ]);
}

function buyItem(name,cost,damage,katana=false){
  if(state.money < cost){ showMessage("Not enough money."); closePanel(); return; }
  state.money -= cost;
  state.weapon = name;
  state.weaponDamage = damage;
  hotbar.slots[1] = name;
  if(katana){
    state.ownsKatana = true;
    hotbar.slots[3] = "Katana";
  }
  updateHUD();
  updateHotbar();
  showMessage("Purchased " + name + ".");
  closePanel();
}

function forgeIronSword(){
  if(state.iron < 5){ showMessage("Not enough iron."); closePanel(); return; }
  state.iron -= 5;
  state.weapon = "Iron Sword";
  state.weaponDamage = 15;
  hotbar.slots[1] = "Iron Sword";
  updateHUD();
  updateHotbar();
  showMessage("You forged an Iron Sword.");
  closePanel();
}

function forgeSteelSword(){
  if(state.iron < 8 || state.crystal < 2){ showMessage("Need 8 iron and 2 crystal."); closePanel(); return; }
  state.iron -= 8;
  state.crystal -= 2;
  state.weapon = "Steel Sword";
  state.weaponDamage = 22;
  hotbar.slots[1] = "Steel Sword";
  updateHUD();
  updateHotbar();
  showMessage("You forged a Steel Sword.");
  closePanel();
}

function craftArmorPlate(){
  if(state.iron < 4 || state.cloth < 1){ showMessage("Need 4 iron and 1 cloth."); closePanel(); return; }
  state.iron -= 4;
  state.cloth -= 1;
  state.maxHealth += 10;
  state.health = Math.min(state.health + 10, state.maxHealth);
  updateHUD();
  showMessage("You crafted armor and gained +10 max health.");
  closePanel();
}

function craftHealthKit(){
  if(state.cloth < 2 || state.wood < 1){ showMessage("Need 2 cloth and 1 wood."); closePanel(); return; }
  state.cloth -= 2;
  state.wood -= 1;
  state.health = Math.min(state.maxHealth, state.health + 30);
  updateHUD();
  showMessage("You crafted and used a health kit.");
  closePanel();
}

function craftBowKit(){
  if(state.wood < 3 || state.cloth < 1){ showMessage("Need 3 wood and 1 cloth."); closePanel(); return; }
  state.wood -= 3;
  state.cloth -= 1;
  hotbar.slots[4] = "Bow Kit";
  updateHotbar();
  updateHUD();
  showMessage("You crafted a Bow Kit.");
  closePanel();
}

function buyHealthKit(){
  if(state.money < 15){ showMessage("Not enough money."); closePanel(); return; }
  state.money -= 15;
  state.health = Math.min(state.maxHealth, state.health + 25);
  updateHUD();
  showMessage("You used a health kit.");
  closePanel();
}

function restAtInn(){
  state.health = state.maxHealth;
  updateHUD();
  showMessage("You feel rested.");
  closePanel();
}

function showTownNotice(){
  showMessage("Future update: defeat the boss to reach the second town.");
  closePanel();
}

function updateQuestProgress(){
  if(state.questAccepted && !state.questComplete && state.iron >= 5){
    state.questComplete = true;
    document.getElementById("quest-text").textContent = "You have enough ore. Visit the forge.";
    showMessage("Quest complete. Visit the forge.");
  }
}

function useForge(){
  openDoorMenu({ role: "forge", label: "Forge", position: new THREE.Vector3() });
}

function applySelectedSlot(){
  const item = hotbar.slots[hotbar.active];
  if(hotbar.active === 2 && state.hasPickaxe){
    player.pickaxeMesh.visible = true;
    player.swordMesh.visible = false;
    state.weapon = "Pickaxe";
  } else {
    player.pickaxeMesh.visible = false;
    player.swordMesh.visible = true;
    if(hotbar.active === 3 && state.ownsKatana){
      state.weapon = "Katana";
      state.weaponDamage = 18;
    } else if(item === "Iron Sword"){
      state.weapon = "Iron Sword";
      state.weaponDamage = 15;
    } else if(item === "Steel Sword"){
      state.weapon = "Steel Sword";
      state.weaponDamage = 22;
    } else if(item !== "Empty"){
      state.weapon = item;
    }
  }
  updateHUD();
}

function updateHUD(){
  document.getElementById("money").textContent = "$" + state.money;
  document.getElementById("weapon").textContent = "Weapon: " + state.weapon;
  document.getElementById("materials").textContent =
    "Iron: " + state.iron + " · Wood: " + state.wood + " · Cloth: " + state.cloth + " · Crystal: " + state.crystal;
  document.getElementById("health-fill").style.width =
    ((Math.max(0,state.health) / state.maxHealth) * 100) + "%";
}

function updateHotbar(){
  for(let i = 1; i <= 5; i++){
    const slot = document.getElementById("slot-" + i);
    slot.classList.toggle("active", hotbar.active === i);
    slot.querySelector(".slot-label").textContent = hotbar.slots[i];
  }
}

function showMessage(text){
  document.getElementById("message-box").textContent = text;
}

function openPanel(title,text,buttons){
  uiPanelOpen = true;
  document.getElementById("panel-title").textContent = title;
  document.getElementById("panel-text").textContent = text;
  const wrap = document.getElementById("panel-buttons");
  wrap.innerHTML = "";
  buttons.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.label;
    btn.onclick = item.action;
    wrap.appendChild(btn);
  });
  document.getElementById("interaction-panel").classList.remove("hidden");
}

function closePanel(){
  uiPanelOpen = false;
  document.getElementById("interaction-panel").classList.add("hidden");
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e){
  const key = e.key.toLowerCase();
  keys[key] = true;
  if(["1","2","3","4","5"].includes(key)){
    hotbar.active = Number(key);
    updateHotbar();
    applySelectedSlot();
  }
  if(key === "e") tryInteract();
}

function onKeyUp(e){ keys[e.key.toLowerCase()] = false; }

function onMouseMove(e){
  if(uiPanelOpen) return;
  mouseLook.yaw -= e.movementX * 0.0022;
  mouseLook.pitch += e.movementY * 0.0016;
  mouseLook.pitch = clamp(mouseLook.pitch, 0.12, 1.08);
}

function onMouseDown(e){
  if(uiPanelOpen) return;
  if(e.button === 0 && player.attackCooldown <= 0) beginAttack();
}

function beginAttack(){
  if(hotbar.active === 2 && state.hasPickaxe){
    showMessage("Pickaxe equipped.");
    return;
  }
  player.attacking = true;
  player.attackTimer = 0.28;
  player.attackCooldown = 0.42;
  player.justHit.clear();
}

function updatePlayer(dt){
  if(uiPanelOpen) return;

  const input = new THREE.Vector3();
  if(keys["w"]) input.z -= 1;
  if(keys["s"]) input.z += 1;
  if(keys["a"]) input.x -= 1;
  if(keys["d"]) input.x += 1;

  let desiredVelocity = new THREE.Vector3();
  if(input.lengthSq() > 0){
    input.normalize();
    const forward = new THREE.Vector3(Math.sin(mouseLook.yaw), 0, Math.cos(mouseLook.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    desiredVelocity.addScaledVector(forward, -input.z);
    desiredVelocity.addScaledVector(right, input.x);
    desiredVelocity.normalize();
    desiredVelocity.multiplyScalar(keys["shift"] ? player.sprintSpeed : player.moveSpeed);
    player.mesh.rotation.y = Math.atan2(desiredVelocity.x, desiredVelocity.z);
  }

  player.velocity.lerp(desiredVelocity, 0.22);

  const next = player.mesh.position.clone().addScaledVector(player.velocity, dt);
  if(!intersectsBuilding(next)){
    player.mesh.position.copy(next);
  } else {
    const xOnly = player.mesh.position.clone(); xOnly.x += player.velocity.x * dt;
    if(!intersectsBuilding(xOnly)) player.mesh.position.x = xOnly.x;
    const zOnly = player.mesh.position.clone(); zOnly.z += player.velocity.z * dt;
    if(!intersectsBuilding(zOnly)) player.mesh.position.z = zOnly.z;
  }

  if(player.attackCooldown > 0) player.attackCooldown -= dt;
  if(player.attacking){
    player.attackTimer -= dt;
    player.swordMesh.rotation.z = -1.5 + (0.28 - Math.max(player.attackTimer,0)) * 8.5;
    if(player.attackTimer > 0.08 && player.attackTimer < 0.22) hitEnemies();
    if(player.attackTimer <= 0){
      player.attacking = false;
      player.swordMesh.rotation.z = 0.18;
    }
  }

  player.mesh.position.x = clamp(player.mesh.position.x, -180, 180);
  player.mesh.position.z = clamp(player.mesh.position.z, -180, 180);

  updateCamera();
}

function updateCamera(){
  const target = new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 2.1, player.mesh.position.z);
  const offset = new THREE.Vector3(
    Math.sin(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance,
    Math.sin(mouseLook.pitch) * mouseLook.distance + 1.3,
    Math.cos(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance
  );
  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 0.14);
  camera.lookAt(target);
}

function intersectsBuilding(pos){
  const playerBox = new THREE.Box3(
    new THREE.Vector3(pos.x - 0.55, 0, pos.z - 0.55),
    new THREE.Vector3(pos.x + 0.55, 2.8, pos.z + 0.55)
  );
  return collisionBoxes.some(box => box.intersectsBox(playerBox));
}

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  updateEnemies(dt);
  renderer.render(scene, camera);
}

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
