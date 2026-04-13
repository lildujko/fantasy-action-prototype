let scene, camera, renderer, clock;
let player, boss = null;
let enemies = [];
let projectiles = [];
let interactables = [];
let world = { current: 'town1', town2Unlocked: false, inCave: false };
let controls = { keys: {}, mouseDown: false, dragging: false, lastX: 0, lastY: 0 };
let cam = { yaw: 0, pitch: 0.45, distance: 8.5 };
let selectedClass = null;
let areaSeen = new Set();
let playerState = {
  hp: 100, maxHp: 100,
  xp: 0, xpNext: 100, level: 1,
  money: 0,
  damage: 18,
  sprint: 1.9,
  inventory: { iron: 0, crystal: 0, wood: 0, pickaxe: false, ironPickaxe: false },
  quests: [
    { id: 'iron', label: 'Mine 5 iron', target: 5, progress: 0, complete: false },
    { id: 'boss', label: 'Defeat the cave boss', target: 1, progress: 0, complete: false }
  ]
};

const ui = {};

window.startGame = function(cls) {
  selectedClass = cls;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  init();
  showArea('Town 1');
  animate();
};

window.toggleInventory = function(force) {
  const el = ui.inventory;
  const open = typeof force === 'boolean' ? force : el.classList.contains('hidden');
  if (open) {
    renderInventory();
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
};

function init() {
  cacheUI();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a8cc);
  scene.fog = new THREE.Fog(0x87a8cc, 55, 220);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(30, 40, 20);
  scene.add(sun);

  buildTown1();
  player = createPlayer();
  spawnTownEnemies();
  bindEvents();
  updateUI('Spawned in Town 1');
}

function cacheUI() {
  ui.area = document.getElementById('area-label');
  ui.message = document.getElementById('message-label');
  ui.level = document.getElementById('level-value');
  ui.xp = document.getElementById('xp-value');
  ui.xpNext = document.getElementById('xp-next');
  ui.hp = document.getElementById('hp-value');
  ui.hpMax = document.getElementById('hp-max');
  ui.hpFill = document.getElementById('hp-fill');
  ui.xpFill = document.getElementById('xp-fill');
  ui.money = document.getElementById('money-value');
  ui.hotbar = document.getElementById('hotbar-label');
  ui.inventory = document.getElementById('inventory');
  ui.inventoryContent = document.getElementById('inventory-content');
  ui.alert = document.getElementById('alert-banner');
  document.getElementById('fullscreen-btn').onclick = toggleFullscreen;
  document.getElementById('inventory-btn').onclick = () => toggleInventory();
}

function bindEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    controls.keys[k] = true;
    if (k === 'e') interact();
    if (k === 'i') toggleInventory();
  });
  document.addEventListener('keyup', e => controls.keys[e.key.toLowerCase()] = false);
  renderer.domElement.addEventListener('mousedown', e => {
    if (e.button === 0) {
      controls.mouseDown = true;
      startAttack();
    }
    controls.dragging = true;
    controls.lastX = e.clientX;
    controls.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { controls.mouseDown = false; controls.dragging = false; });
  window.addEventListener('mousemove', e => {
    if (!controls.dragging) return;
    const dx = e.clientX - controls.lastX;
    const dy = e.clientY - controls.lastY;
    controls.lastX = e.clientX; controls.lastY = e.clientY;
    cam.yaw -= dx * 0.005;
    cam.pitch = Math.max(0.18, Math.min(1.2, cam.pitch + dy * 0.003));
  });
}

function createPlayer() {
  const g = new THREE.Group();
  const bodyColor = selectedClass === 'beast' ? 0x8b5a2b : selectedClass === 'mage' ? 0x5b3fd3 : 0x7f1d1d;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.7), new THREE.MeshStandardMaterial({ color: bodyColor }));
  torso.position.y = 1.1;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
  head.position.y = 2.2; g.add(head);
  const weapon = createClassWeapon();
  weapon.position.set(0.9, 1.2, 0); g.add(weapon);
  const pickaxe = createPickaxe();
  pickaxe.position.set(0.9, 1.15, 0); pickaxe.visible = false; g.add(pickaxe);
  g.position.set(0, 0, 10);
  scene.add(g);
  return { group: g, weapon, pickaxe, speed: 7, attackTimer: 0, cooldown: 0, attacking: false };
}

function createClassWeapon() {
  if (selectedClass === 'beast') {
    const grp = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
      claw.rotation.x = Math.PI / 2; claw.position.set(-0.08 + i * 0.08, 0, 0.2 + i * 0.05); grp.add(claw);
    }
    return grp;
  }
  if (selectedClass === 'mage') {
    const grp = new THREE.Group();
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x7c5a34 }));
    staff.rotation.z = 0.25; grp.add(staff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x2563eb, emissiveIntensity: 0.6 }));
    orb.position.set(0.25, 0.82, 0); grp.add(orb);
    return grp;
  }
  const grp = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.8 }));
  grp.add(orb);
  return grp;
}

function createPickaxe() {
  const grp = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.55, 10), new THREE.MeshStandardMaterial({ color: 0x7c5a34 }));
  handle.rotation.z = 0.4; grp.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.14), new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
  head.position.set(0.26, 0.56, 0); head.rotation.z = 0.4; grp.add(head);
  return grp;
}

function clearWorld() {
  interactables.forEach(obj => scene.remove(obj.mesh));
  interactables = [];
  enemies.forEach(e => scene.remove(e.mesh));
  enemies = [];
  projectiles.forEach(p => scene.remove(p.mesh));
  projectiles = [];
  if (boss) { scene.remove(boss.mesh); boss = null; }
  scene.children = scene.children.filter(obj => obj.type.includes('Light') || obj === player?.group);
}

function addGround(color=0x6d8754, size=400) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);
}

function buildTown1() {
  clearWorld();
  world.current = 'town1'; world.inCave = false;
  scene.background = new THREE.Color(0x87a8cc); scene.fog = new THREE.Fog(0x87a8cc, 55, 220);
  addGround(0x6d8754, 500);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(26, 48), new THREE.MeshStandardMaterial({ color: 0xa5aab2 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; scene.add(plaza);
  makeBuilding(-34, -24, 'Weapons', 0x8b5e3c, 'shop-weapons');
  makeBuilding(0, -24, 'Supplies', 0x7b5537, 'shop-supplies');
  makeBuilding(34, -24, 'Inn', 0x6f4a2f, 'inn');
  makeBuilding(-40, 22, 'Workshop', 0x70563d, 'workshop');
  makeBuilding(0, 28, 'Forge', 0x59616f, 'forge');
  makeBuilding(40, 22, 'Storage', 0x7c6a58, 'storage');
  makeBuilding(0, 52, 'Town Hall', 0x8a6a47, 'hall', 22, 14);
  const cave = makeMarker(92, 18, 'Crystal Cave', 0x374151, 'enter-cave');
  cave.scale.set(2.2, 2.2, 2.2);
  if (world.town2Unlocked) {
    const gate = makeMarker(-92, 18, 'Town 2 Portal', 0x0f766e, 'enter-town2');
    gate.scale.set(2.4, 2.4, 2.4);
  }
  player.group.position.set(0, 0, 10);
  spawnTownEnemies();
  showArea('Town 1');
}

function buildTown2() {
  clearWorld();
  world.current = 'town2'; world.inCave = false;
  scene.background = new THREE.Color(0xd8c3a5); scene.fog = new THREE.Fog(0xd8c3a5, 60, 240);
  addGround(0xb88746, 500);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(28, 48), new THREE.MeshStandardMaterial({ color: 0xc7b39a }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; scene.add(plaza);
  makeBuilding(-30, -20, 'Armory', 0x6b7280, 'armory');
  makeBuilding(0, -20, 'Alchemy', 0x7c3aed, 'alchemy');
  makeBuilding(30, -20, 'Guild', 0x92400e, 'guild');
  makeBuilding(-18, 24, 'Desert Inn', 0x9a3412, 'inn2');
  makeBuilding(18, 24, 'Portal Hall', 0x0f766e, 'portal-hall');
  const back = makeMarker(0, 52, 'Return to Town 1', 0x1d4ed8, 'return-town1');
  back.scale.set(2.2, 2.2, 2.2);
  player.group.position.set(0, 0, 10);
  spawnTownEnemies(true);
  showArea('Town 2');
}

function buildCave() {
  clearWorld();
  world.current = 'cave'; world.inCave = true;
  scene.background = new THREE.Color(0x040404); scene.fog = new THREE.Fog(0x050505, 8, 90);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x2e2e2e }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x151515, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 22; scene.add(ceiling);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, side: THREE.DoubleSide });
  const walls = [
    [0, 11, -60, 0, 0, 0], [0, 11, 60, 0, Math.PI, 0], [60, 11, 0, 0, -Math.PI/2, 0], [-60, 11, 0, 0, Math.PI/2, 0]
  ];
  walls.forEach(([x,y,z,rx,ry,rz]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(120, 22), wallMat); w.position.set(x,y,z); w.rotation.set(rx,ry,rz); scene.add(w); });
  for (let i = 0; i < 14; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + Math.random()*2, 0), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
    rock.position.set((Math.random()-0.5)*90, 1 + Math.random()*3, (Math.random()-0.5)*90); scene.add(rock);
  }
  for (let i = 0; i < 18; i++) {
    const stal = new THREE.Mesh(new THREE.ConeGeometry(0.4 + Math.random()*0.8, 2 + Math.random()*6, 8), new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
    stal.position.set((Math.random()-0.5)*96, 0.7 + stal.geometry.parameters.height/2, (Math.random()-0.5)*96); scene.add(stal);
  }
  for (let i = 0; i < 8; i++) {
    const torch = new THREE.PointLight(0xffb74d, 1.2, 24); torch.position.set((i<4?-52:52), 6, -35 + (i%4)*22); scene.add(torch);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2,6), new THREE.MeshStandardMaterial({ color: 0x7c5a34 })); stick.position.copy(torch.position).setY(1.5); scene.add(stick);
  }
  for (let i = 0; i < 12; i++) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1 + Math.random()*0.6, 0), new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x4c1d95, emissiveIntensity: 0.4 }));
    crystal.position.set((Math.random()-0.5)*70, 1.2, -10 + Math.random()*65); scene.add(crystal);
    interactables.push({ type: 'crystal-node', mesh: crystal });
  }
  const exit = makeMarker(0, -42, 'Exit Cave', 0x1d4ed8, 'exit-cave');
  exit.scale.set(2.2,2.2,2.2);
  spawnCaveBoss();
  player.group.position.set(0, 0, -30);
  showArea('Crystal Cavern');
}

function makeBuilding(x, z, label, color, type, w=14, d=10) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), new THREE.MeshStandardMaterial({ color }));
  body.position.set(x, 3.5, z); scene.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w*0.72, 3.6, 4), new THREE.MeshStandardMaterial({ color: 0x3b2f2f }));
  roof.position.set(x, 8.2, z); roof.rotation.y = Math.PI * 0.25; scene.add(roof);
  const signFront = createSign(label); signFront.position.set(x, 5.8, z - d/2 - 0.61); scene.add(signFront);
  const signBack = createSign(label); signBack.position.set(x, 5.8, z - d/2 - 0.58); signBack.rotation.y = Math.PI; scene.add(signBack);
  const marker = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.3), new THREE.MeshStandardMaterial({ color: 0x4b2e1a }));
  marker.position.set(x, 1.5, z - d/2 - 0.15); marker.visible = false; scene.add(marker);
  interactables.push({ type, mesh: marker, label });
}

function createSign(label) {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f2d39b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, canvas.width-8, canvas.height-8);
  ctx.fillStyle = '#2f2418'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, canvas.width/2, canvas.height/2);
  return new THREE.Mesh(new THREE.PlaneGeometry(6.1, 1.95), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
}

function makeMarker(x, z, label, color, type) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.5, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }));
  mesh.position.set(x, 1.75, z); scene.add(mesh);
  const sign = createSign(label); sign.position.set(x, 4.8, z); scene.add(sign);
  const interact = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4, 2.2), new THREE.MeshStandardMaterial({ visible: false }));
  interact.position.copy(mesh.position); scene.add(interact);
  interactables.push({ type, mesh: interact, label });
  return mesh;
}

function spawnTownEnemies(tough=false) {
  for (let i = 0; i < 4; i++) spawnEnemy((Math.random()-0.5)*80, 50 + Math.random()*30, tough ? 70 : 40, tough ? 3 : 1);
}

function spawnEnemy(x, z, hp=40, tier=1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), new THREE.MeshStandardMaterial({ color: tier === 1 ? 0x556b2f : 0x7c3aed }));
  mesh.position.set(x, 0.8, z); scene.add(mesh);
  enemies.push({ mesh, hp, tier, speed: 2 + tier * 0.5, cooldown: 0, boss: false });
}

function spawnCaveBoss() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.5, 3.5), new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.3 }));
  mesh.position.set(0, 2.75, 32); scene.add(mesh);
  boss = { mesh, hp: 260, cooldown: 0, speed: 1.5, boss: true };
  enemies.push(boss);
}

function interact() {
  const p = player.group.position;
  for (const item of interactables) {
    if (p.distanceTo(item.mesh.position) > 4.5) continue;
    switch (item.type) {
      case 'enter-cave': buildCave(); return;
      case 'exit-cave': buildTown1(); return;
      case 'enter-town2': buildTown2(); return;
      case 'return-town1': buildTown1(); return;
      case 'forge': openForge(); return;
      case 'shop-weapons': openWeapons(); return;
      case 'shop-supplies': openSupplies(); return;
      case 'crystal-node': mineCrystal(item); return;
    }
  }
  updateUI('Nothing to interact with');
}

function openForge() {
  const opts = [];
  if (playerState.inventory.iron >= 3 && !playerState.inventory.ironPickaxe) opts.push('1. Craft Iron Pickaxe');
  if (playerState.inventory.iron >= 5) opts.push('2. Craft Iron Sword');
  if (playerState.inventory.iron >= 8 && playerState.inventory.crystal >= 2) opts.push('3. Craft Steel Sword');
  if (!opts.length) return updateUI('Forge: not enough materials');
  const choice = prompt('Forge\n' + opts.join('\n'));
  if (choice === '1') { playerState.inventory.iron -= 3; playerState.inventory.ironPickaxe = true; playerState.inventory.pickaxe = true; ui.hotbar.textContent = 'Weapon: Iron Pickaxe / ' + baseWeaponName(); updateUI('Crafted Iron Pickaxe'); }
  if (choice === '2') { playerState.inventory.iron -= 5; playerState.damage = 28; ui.hotbar.textContent = 'Weapon: Iron Sword'; updateUI('Crafted Iron Sword'); }
  if (choice === '3') { playerState.inventory.iron -= 8; playerState.inventory.crystal -= 2; playerState.damage = 38; ui.hotbar.textContent = 'Weapon: Steel Sword'; updateUI('Crafted Steel Sword'); }
}

function openWeapons() {
  const choice = prompt('Weapon Shop\n1. Katana - $50\n2. Hunter Spear - $35');
  if (choice === '1' && playerState.money >= 50) { playerState.money -= 50; playerState.damage = 30; ui.hotbar.textContent = 'Weapon: Katana'; updateUI('Bought Katana'); }
  else if (choice === '2' && playerState.money >= 35) { playerState.money -= 35; playerState.damage = 24; ui.hotbar.textContent = 'Weapon: Hunter Spear'; updateUI('Bought Hunter Spear'); }
}

function openSupplies() {
  const choice = prompt('Supplies\n1. Health Potion - $15');
  if (choice === '1' && playerState.money >= 15) { playerState.money -= 15; playerState.hp = Math.min(playerState.maxHp, playerState.hp + 35); updateUI('Used Health Potion'); }
}

function mineCrystal(node) {
  if (!playerState.inventory.ironPickaxe) return updateUI('Need an Iron Pickaxe');
  scene.remove(node.mesh); interactables = interactables.filter(i => i !== node); playerState.inventory.crystal += 1; updateUI('Mined Crystal'); renderInventory();
}

function startAttack() {
  if (player.attacking || player.cooldown > 0) return;
  player.attacking = true; player.attackTimer = 0; player.cooldown = 0.45;
}

function update(dt) {
  if (!player) return;
  if (player.cooldown > 0) player.cooldown -= dt;
  updateMovement(dt);
  updateCombat(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateUI();
}

function updateMovement(dt) {
  const input = new THREE.Vector3();
  if (controls.keys['w']) input.z -= 1;
  if (controls.keys['s']) input.z += 1;
  if (controls.keys['a']) input.x -= 1;
  if (controls.keys['d']) input.x += 1;
  if (input.lengthSq() > 0) {
    input.normalize();
    const forward = new THREE.Vector3(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    move.addScaledVector(forward, -input.z).addScaledVector(right, input.x).normalize();
    const speed = player.speed * (controls.keys['shift'] ? playerState.sprint : 1);
    player.group.position.addScaledVector(move, speed * dt);
    player.group.rotation.y = Math.atan2(move.x, move.z);
  }
  const target = new THREE.Vector3(player.group.position.x, player.group.position.y + 2.1, player.group.position.z);
  const offset = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.distance, Math.sin(cam.pitch) * cam.distance + 1.2, Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.distance);
  camera.position.lerp(target.clone().add(offset), 0.12);
  camera.lookAt(target);
}

function updateCombat(dt) {
  if (!player.attacking) return;
  player.attackTimer += dt;
  const t = player.attackTimer / 0.32;
  player.weapon.rotation.z = -1.25 + t * 2.5;
  if (t > 0.28 && t < 0.62) {
    const hitPos = new THREE.Vector3(); player.weapon.getWorldPosition(hitPos);
    for (const enemy of enemies) {
      if (enemy.hitThisSwing) continue;
      if (hitPos.distanceTo(enemy.mesh.position) < (enemy.boss ? 3.6 : 2.1)) {
        enemy.hp -= playerState.damage;
        enemy.hitThisSwing = true;
        spawnPulse(enemy.mesh.position.clone(), selectedClass === 'mage' ? 0x60a5fa : selectedClass === 'demon' ? 0xdc2626 : 0xf59e0b, 0.55);
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
  }
  if (t >= 1) {
    player.attacking = false;
    player.weapon.rotation.z = 0.18;
    enemies.forEach(e => e.hitThisSwing = false);
  }
}

function updateEnemies(dt) {
  for (const enemy of [...enemies]) {
    if (!enemy.mesh) continue;
    const toPlayer = new THREE.Vector3().subVectors(player.group.position, enemy.mesh.position);
    const dist = toPlayer.length();
    if (dist > 0.5) {
      toPlayer.y = 0; toPlayer.normalize();
      enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * dt);
      enemy.mesh.lookAt(player.group.position.x, enemy.mesh.position.y, player.group.position.z);
    }
    if (enemy.cooldown > 0) enemy.cooldown -= dt;
    if (dist < (enemy.boss ? 3.4 : 1.5) && enemy.cooldown <= 0) {
      playerState.hp -= enemy.boss ? 18 : 8;
      enemy.cooldown = enemy.boss ? 1.5 : 1.0;
      spawnPulse(player.group.position.clone(), 0xff4444, 0.7);
      updateUI(enemy.boss ? 'Boss hit you' : 'Enemy hit you');
      if (playerState.hp <= 0) respawnPlayer();
    }
  }
}

function killEnemy(enemy) {
  scene.remove(enemy.mesh);
  enemies = enemies.filter(e => e !== enemy);
  if (enemy.boss) {
    world.town2Unlocked = true;
    playerState.quests.find(q => q.id === 'boss').progress = 1;
    playerState.quests.find(q => q.id === 'boss').complete = true;
    updateUI('Boss defeated! Town 2 unlocked');
    showArea('Town 2 Unlocked');
    buildTown1();
    return;
  }
  playerState.money += enemy.tier ? enemy.tier * 2 : 1;
  gainXp(enemy.tier ? enemy.tier * 30 : 20);
  if (!world.inCave && Math.random() < 0.35) {
    playerState.inventory.iron += 1;
    playerState.quests.find(q => q.id === 'iron').progress = Math.min(5, playerState.quests.find(q => q.id === 'iron').progress + 1);
    if (playerState.quests.find(q => q.id === 'iron').progress >= 5) playerState.quests.find(q => q.id === 'iron').complete = true;
  }
}

function gainXp(n) {
  playerState.xp += n;
  while (playerState.xp >= playerState.xpNext) {
    playerState.xp -= playerState.xpNext;
    playerState.level += 1;
    playerState.xpNext = Math.floor(playerState.xpNext * 1.35);
    playerState.maxHp += 10;
    playerState.hp = playerState.maxHp;
    playerState.damage += 2;
    updateUI('Level up!');
  }
}

function respawnPlayer() {
  playerState.hp = playerState.maxHp;
  if (world.current === 'town2') buildTown2(); else buildTown1();
  updateUI('Respawned in Town 1');
}

function updateProjectiles(dt) { projectiles = projectiles.filter(p => { p.mesh.position.addScaledVector(p.vel, dt); p.life -= dt; if (p.life <= 0) { scene.remove(p.mesh); return false; } return true; }); }

function spawnPulse(pos, color, scale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }));
  mesh.position.copy(pos).setY(pos.y + 1.2); mesh.scale.set(scale, scale, scale); scene.add(mesh); effects.push({ mesh, life: 0.35, grow: 4.2 });
}

function updateUI(msg) {
  if (msg) ui.message.textContent = msg;
  ui.area.textContent = 'Area: ' + (world.current === 'town1' ? 'Town 1' : world.current === 'town2' ? 'Town 2' : 'Crystal Cavern');
  ui.level.textContent = playerState.level;
  ui.xp.textContent = playerState.xp;
  ui.xpNext.textContent = playerState.xpNext;
  ui.hp.textContent = Math.max(0, Math.floor(playerState.hp));
  ui.hpMax.textContent = playerState.maxHp;
  ui.money.textContent = playerState.money;
  ui.hpFill.style.width = (playerState.hp / playerState.maxHp * 100) + '%';
  ui.xpFill.style.width = (playerState.xp / playerState.xpNext * 100) + '%';
}

function renderInventory() {
  ui.inventoryContent.innerHTML = '';
  const rows = [
    'Weapon: ' + ui.hotbar.textContent.replace('Weapon: ', ''),
    'Iron: ' + playerState.inventory.iron,
    'Crystal: ' + playerState.inventory.crystal,
    'Pickaxe: ' + (playerState.inventory.pickaxe ? (playerState.inventory.ironPickaxe ? 'Iron Pickaxe' : 'Basic Pickaxe') : 'None'),
    'Quest - Mine 5 iron: ' + playerState.quests.find(q => q.id === 'iron').progress + '/5',
    'Quest - Defeat boss: ' + (playerState.quests.find(q => q.id === 'boss').complete ? 'Complete' : 'Incomplete')
  ];
  rows.forEach(text => {
    const div = document.createElement('div'); div.className = 'inv-row'; div.textContent = text; ui.inventoryContent.appendChild(div);
  });
}

function showArea(name) {
  if (areaSeen.has(name)) return;
  areaSeen.add(name);
  ui.alert.textContent = name;
  ui.alert.classList.remove('hidden');
  setTimeout(() => ui.alert.classList.add('hidden'), 1800);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}
