let scene, camera, renderer, clock;
let player;
let selectedClass = null;
const keys = {};
const npcs = [];
const ores = [];
const zombies = [];
const state = {
  money: 0,
  health: 100,
  maxHealth: 100,
  weapon: 'None',
  weaponDamage: 8,
  hasPickaxe: false,
  iron: 0,
  questAccepted: false,
  questComplete: false,
  craftedSword: false,
};

function startGame(type) {
  selectedClass = type;
  document.getElementById('start-screen').style.display = 'none';
  init();
  animate();
}
window.startGame = startGame;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a8c7);
  scene.fog = new THREE.Fog(0x87a8c7, 60, 140);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 8, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x355070, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(30, 35, 10);
  scene.add(sun);

  createWorld();
  player = createPlayer(selectedClass);
  updateHUD();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function createWorld() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x6e9a58 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({ color: 0x8f939a })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  scene.add(plaza);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x9fa4ab });
  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 38), roadMat);
  road1.rotation.x = -Math.PI / 2;
  road1.position.y = 0.03;
  scene.add(road1);
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(38, 8), roadMat);
  road2.rotation.x = -Math.PI / 2;
  road2.position.y = 0.03;
  scene.add(road2);

  createBuilding(-12, -10, 10, 8, 0x8b5e3c);
  createBuilding(12, -10, 10, 8, 0x7b5537);
  createBuilding(-12, 10, 10, 8, 0x6f4a2f);
  createBuilding(12, 10, 10, 8, 0x5b6068);
  createGate(0, -20);

  createNPC('Quest Giver', -4, 0, 0x2563eb, 'quest');
  createNPC('Merchant', 10, -2, 0xf59e0b, 'merchant');
  createNPC('Blacksmith', 12, 10, 0x94a3b8, 'forge');

  for (let i = -16; i <= 16; i += 8) {
    createLamp(i, -16);
    createLamp(i, 16);
  }

  for (let i = 0; i < 18; i++) {
    spawnOre(-36 + Math.random() * 72, -34 - Math.random() * 55);
  }
  for (let i = 0; i < 10; i++) {
    spawnZombie(-38 + Math.random() * 76, -40 - Math.random() * 48);
  }
}

function createBuilding(x, z, w, d, color) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, 6, d),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.set(x, 3, z);
  scene.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.75, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0x3b2f2f })
  );
  roof.position.set(x, 7, z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
}

function createGate(x, z) {
  const post1 = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), new THREE.MeshStandardMaterial({ color: 0x64748b }));
  post1.position.set(x - 4, 4, z);
  scene.add(post1);
  const post2 = post1.clone();
  post2.position.x = x + 4;
  scene.add(post2);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 2), new THREE.MeshStandardMaterial({ color: 0x475569 }));
  top.position.set(x, 8, z);
  scene.add(top);
}

function createLamp(x, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4, 8), new THREE.MeshStandardMaterial({ color: 0x444 }));
  post.position.set(x, 2, z);
  scene.add(post);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf8e16c, emissive: 0xf8e16c, emissiveIntensity: 0.7 }));
  glow.position.set(x, 4.1, z);
  scene.add(glow);
}

function createNPC(name, x, z, color, role) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.55), new THREE.MeshStandardMaterial({ color }));
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
  head.position.y = 2.1;
  g.add(head);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.22), new THREE.MeshStandardMaterial({ color }));
  leftArm.position.set(-0.64, 1.2, 0);
  g.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.64;
  g.add(rightArm);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 0.28), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
  leftLeg.position.set(-0.2, 0.48, 0);
  g.add(leftLeg);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.2;
  g.add(rightLeg);
  g.position.set(x, 0, z);
  scene.add(g);
  npcs.push({ name, role, mesh: g });
}

function createPlayer(type) {
  const colors = { demon: 0x7f1d1d, mage: 0x4338ca, beast: 0x7c2d12 };
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.35, 0.65), new THREE.MeshStandardMaterial({ color: colors[type] || 0x2563eb }));
  torso.position.y = 1.25;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
  head.position.y = 2.22;
  g.add(head);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.24), new THREE.MeshStandardMaterial({ color: colors[type] || 0x2563eb }));
  leftArm.position.set(-0.72, 1.24, 0);
  g.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.72;
  g.add(rightArm);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  leftLeg.position.set(-0.24, 0.5, 0);
  g.add(leftLeg);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;
  g.add(rightLeg);

  if (type === 'mage') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    hat.position.y = 2.95;
    g.add(hat);
  }
  if (type === 'demon') {
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 10), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    horn1.position.set(0.2, 2.75, 0.02);
    horn1.rotation.z = -0.5;
    g.add(horn1);
    const horn2 = horn1.clone();
    horn2.position.x = -0.2;
    horn2.rotation.z = 0.5;
    g.add(horn2);
  }
  if (type === 'beast') {
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0x3f2a18 }));
    ear1.position.set(0.23, 2.7, 0);
    g.add(ear1);
    const ear2 = ear1.clone();
    ear2.position.x = -0.23;
    g.add(ear2);
  }

  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
  weapon.position.set(0.9, 1.2, 0);
  g.add(weapon);

  scene.add(g);
  return {
    mesh: g,
    weaponMesh: weapon,
    moveSpeed: 5,
    sprintSpeed: 8,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    justHit: new Set(),
  };
}

function spawnOre(x, z) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
  mesh.position.set(x, 0.9, z);
  scene.add(mesh);
  ores.push({ mesh, mined: false });
}

function spawnZombie(x, z) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.55), new THREE.MeshStandardMaterial({ color: 0x4d6b39 }));
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 14), new THREE.MeshStandardMaterial({ color: 0x7fa36c }));
  head.position.y = 2.08;
  g.add(head);
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1, 0.26), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  l1.position.set(-0.2, 0.48, 0);
  g.add(l1);
  const l2 = l1.clone();
  l2.position.x = 0.2;
  g.add(l2);
  g.position.set(x, 0, z);
  scene.add(g);
  zombies.push({ mesh: g, health: 24, hitCooldown: 0 });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'e') interact();
  if (k === ' ' && player.attackCooldown <= 0) beginAttack();
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

function beginAttack() {
  player.attacking = true;
  player.attackTimer = 0.28;
  player.attackCooldown = 0.45;
  player.justHit.clear();
}

function updatePlayer(dt) {
  const dir = new THREE.Vector3();
  if (keys['w']) dir.z -= 1;
  if (keys['s']) dir.z += 1;
  if (keys['a']) dir.x -= 1;
  if (keys['d']) dir.x += 1;
  if (dir.lengthSq() > 0) {
    dir.normalize();
    const speed = keys['shift'] ? player.sprintSpeed : player.moveSpeed;
    player.mesh.position.addScaledVector(dir, speed * dt);
    player.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }
  player.mesh.position.x = clamp(player.mesh.position.x, -95, 95);
  player.mesh.position.z = clamp(player.mesh.position.z, -95, 95);

  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attacking) {
    player.attackTimer -= dt;
    player.weaponMesh.rotation.z = -1.4 + (0.28 - Math.max(player.attackTimer, 0)) * 8;
    if (player.attackTimer > 0.08 && player.attackTimer < 0.22) hitZombies();
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.weaponMesh.rotation.z = 0;
    }
  }

  const camPos = new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 7.2, player.mesh.position.z + 9.2);
  camera.position.lerp(camPos, 0.08);
  camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.7, player.mesh.position.z);
}

function updateZombies(dt) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const delta = new THREE.Vector3().subVectors(player.mesh.position, z.mesh.position);
    const dist = delta.length();
    if (dist < 18) {
      delta.y = 0;
      delta.normalize();
      z.mesh.position.addScaledVector(delta, 2.1 * dt);
      z.mesh.lookAt(player.mesh.position.x, z.mesh.position.y, player.mesh.position.z);
    }
    if (z.hitCooldown > 0) z.hitCooldown -= dt;
    if (dist < 1.6 && z.hitCooldown <= 0) {
      state.health -= 6;
      z.hitCooldown = 1.0;
      showMessage('A zombie hit you.');
      if (state.health <= 0) {
        state.health = state.maxHealth;
        player.mesh.position.set(0, 0, 0);
        showMessage('You were sent back to town.');
      }
      updateHUD();
    }
    if (z.health <= 0) {
      scene.remove(z.mesh);
      zombies.splice(i, 1);
      state.money += 1;
      if (Math.random() < 0.22) state.iron += 1;
      if (Math.random() < 0.08) state.money += 4;
      updateQuest();
      updateHUD();
      showMessage('Zombie defeated.');
      spawnZombie(-38 + Math.random() * 76, -42 - Math.random() * 48);
    }
  }
}

function hitZombies() {
  const weaponPos = new THREE.Vector3();
  player.weaponMesh.getWorldPosition(weaponPos);
  for (const z of zombies) {
    if (player.justHit.has(z)) continue;
    if (weaponPos.distanceTo(z.mesh.position) < 1.9) {
      z.health -= state.weaponDamage;
      player.justHit.add(z);
    }
  }
}

function interact() {
  const p = player.mesh.position;
  for (const npc of npcs) {
    if (p.distanceTo(npc.mesh.position) < 3.2) {
      if (npc.role === 'quest') return questTalk();
      if (npc.role === 'merchant') return openShop();
      if (npc.role === 'forge') return useForge();
    }
  }
  for (const ore of ores) {
    if (ore.mined) continue;
    if (p.distanceTo(ore.mesh.position) < 2.8) {
      if (!state.hasPickaxe) {
        showMessage('You need a pickaxe first.');
        return;
      }
      ore.mined = true;
      scene.remove(ore.mesh);
      state.iron += 1;
      updateQuest();
      updateHUD();
      showMessage('You mined 1 iron ore.');
      return;
    }
  }
  showMessage('Nothing to interact with.');
}

function questTalk() {
  if (!state.questAccepted) {
    state.questAccepted = true;
    state.hasPickaxe = true;
    document.getElementById('quest').textContent = 'Mine 5 iron ore outside town.';
    showMessage('Quest accepted. You received a pickaxe.');
    return updateHUD();
  }
  if (!state.questComplete) {
    return showMessage('Bring me 5 iron ore.');
  }
  showMessage('The south road will lead to a boss and second town later.');
}

function updateQuest() {
  if (state.questAccepted && !state.questComplete && state.iron >= 5) {
    state.questComplete = true;
    document.getElementById('quest').textContent = 'Go to the forge and craft an iron sword.';
    showMessage('Quest complete. Visit the forge.');
  }
}

function useForge() {
  if (!state.questComplete) return showMessage('Bring 5 iron ore first.');
  if (!state.craftedSword) {
    state.craftedSword = true;
    state.weapon = 'Iron Sword';
    state.weaponDamage = 15;
    updateHUD();
    return showMessage('You forged an Iron Sword.');
  }
  showMessage('The forge is quiet for now.');
}

function openShop() {
  const choice = prompt(
    'Weapon Shop\n\n' +
    '1. Rusty Sword - 10\n' +
    '2. Hunter Spear - 35\n' +
    '3. Mage Staff - 45\n' +
    '4. Katana - 50\n' +
    '5. Battle Axe - 60\n' +
    '6. Demon Blade - 75\n\n' +
    'Type 1-6'
  );
  if (!choice) return;
  const items = {
    '1': { name: 'Rusty Sword', cost: 10, damage: 10 },
    '2': { name: 'Hunter Spear', cost: 35, damage: 14 },
    '3': { name: 'Mage Staff', cost: 45, damage: 16 },
    '4': { name: 'Katana', cost: 50, damage: 18 },
    '5': { name: 'Battle Axe', cost: 60, damage: 21 },
    '6': { name: 'Demon Blade', cost: 75, damage: 25 },
  };
  const item = items[choice];
  if (!item) return showMessage('That is not a valid choice.');
  if (state.money < item.cost) return showMessage('Not enough money.');
  state.money -= item.cost;
  state.weapon = item.name;
  state.weaponDamage = item.damage;
  updateHUD();
  showMessage('Purchased ' + item.name + '.');
}

function updateHUD() {
  document.getElementById('money').textContent = '$' + state.money;
  document.getElementById('weapon').textContent = 'Weapon: ' + state.weapon;
  document.getElementById('ore').textContent = 'Iron: ' + state.iron;
  document.getElementById('health-fill').style.width = (Math.max(0, state.health) / state.maxHealth * 100) + '%';
}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  updateZombies(dt);
  renderer.render(scene, camera);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
