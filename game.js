let scene, camera, renderer, clock;
let player;
let keys = {};
let npcs = [];
let zombies = [];
let ores = [];
let buildings = [];
let doors = [];
let collisionBoxes = [];
let selectedClass = null;
let messageTimer = 0;
let uiPanelOpen = false;

const mouseLook = {
  yaw: 0,
  pitch: 0.28,
  distance: 8.8
};

const hotbar = {
  active: 1,
  slots: {
    1: "Sword",
    2: "Pickaxe",
    3: "Katana",
    4: "Empty",
    5: "Empty"
  }
};

const state = {
  money: 0,
  health: 100,
  maxHealth: 100,
  hasPickaxe: false,
  iron: 0,
  weapon: "Sword",
  weaponDamage: 8,
  ownsKatana: false,
  questAccepted: false,
  questComplete: false
};

function startGame(type) {
  selectedClass = type;
  document.getElementById("start-screen").style.display = "none";
  init();
  animate();
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ea2c9);
  scene.fog = new THREE.Fog(0x7ea2c9, 40, 120);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 8, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  setupLights();
  createGround();
  createTown();
  createWilderness();
  player = createPlayer(selectedClass);
  spawnStartingZombies();

  updateHUD();
  updateHotbar();
  showMessage("You arrived in town.");
  bindEvents();
}

function bindEvents() {
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(20, 30, 10);
  scene.add(sun);
}

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0x6b8f52 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshStandardMaterial({ color: 0x8a8f98 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  scene.add(plaza);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af });
  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 34), roadMat);
  road1.rotation.x = -Math.PI / 2;
  road1.position.y = 0.03;
  scene.add(road1);

  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(34, 8), roadMat);
  road2.rotation.x = -Math.PI / 2;
  road2.position.y = 0.03;
  scene.add(road2);
}

function createTown() {
  createBuilding(-12, -9, 10, 8, 0x8b5e3c, "Weapon Shop", "weapon");
  createBuilding(12, -9, 10, 8, 0x7b5537, "Armor Shop", "armor");
  createBuilding(-12, 9, 10, 8, 0x6f4a2f, "Item Shop", "item");
  createBuilding(12, 9, 10, 8, 0x50545c, "Forge", "forge");

  createGate(0, -19);

  createNPC("Quest Giver", -4, 0, 0x3b82f6, "quest");
  createNPC("Merchant", 10, -2, 0xf59e0b, "merchant");
  createNPC("Blacksmith", 12, 9, 0x94a3b8, "forge");

  for (let i = -16; i <= 16; i += 8) {
    createLamp(i, -16);
    createLamp(i, 16);
  }
  createLamp(-16, 0);
  createLamp(16, 0);
}

function createBuilding(x, z, w, d, color, label, role) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, 6, d),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.set(x, 3, z);
  scene.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.75, 3.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x3b2f2f })
  );
  roof.position.set(x, 7.2, z);
  roof.rotation.y = Math.PI * 0.25;
  scene.add(roof);

  const sign = createStaticSign(label);
  sign.position.set(x, 4.7, z - d / 2 - 0.45);
  scene.add(sign);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 2.6, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x4b2e1a })
  );
  door.position.set(x, 1.3, z - d / 2 - 0.11);
  scene.add(door);

  buildings.push({ x, z, w, d, role });
  doors.push({
    mesh: door,
    role,
    label,
    position: new THREE.Vector3(x, 0, z - d / 2 - 1.4)
  });

  // main building collision
  collisionBoxes.push(new THREE.Box3(
    new THREE.Vector3(x - w / 2, 0, z - d / 2),
    new THREE.Vector3(x + w / 2, 6, z + d / 2)
  ));
}

function createStaticSign(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f2d39b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#6b4423";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = "#2f2418";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  return new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.7), mat);
}

function createGate(x, z) {
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(2, 8, 2),
    new THREE.MeshStandardMaterial({ color: 0x64748b })
  );
  left.position.set(x - 4, 4, z);
  scene.add(left);

  const right = left.clone();
  right.position.x = x + 4;
  scene.add(right);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(10, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x475569 })
  );
  top.position.set(x, 8, z);
  scene.add(top);

  collisionBoxes.push(new THREE.Box3(
    new THREE.Vector3(x - 5, 0, z - 1),
    new THREE.Vector3(x - 3, 8, z + 1)
  ));
  collisionBoxes.push(new THREE.Box3(
    new THREE.Vector3(x + 3, 0, z - 1),
    new THREE.Vector3(x + 5, 8, z + 1)
  ));
}

function createLamp(x, z) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f3f46 })
  );
  post.position.set(x, 2, z);
  scene.add(post);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8e16c, emissive: 0xf8e16c, emissiveIntensity: 0.7 })
  );
  glow.position.set(x, 4.2, z);
  scene.add(glow);
}

function createNPC(name, x, z, color, role) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 0.55),
    new THREE.MeshStandardMaterial({ color })
  );
  torso.position.y = 1.2;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xf1c27d })
  );
  head.position.y = 2.15;
  group.add(head);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.95, 0.24),
    new THREE.MeshStandardMaterial({ color })
  );
  leftArm.position.set(-0.65, 1.25, 0);
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.65;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 1, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  );
  leftLeg.position.set(-0.22, 0.45, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.22;
  group.add(rightLeg);

  if (role === "merchant") {
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12 })
    );
    hat.position.y = 2.55;
    group.add(hat);
  }

  if (role === "forge") {
    const hammer = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.8, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x4b5563 })
    );
    hammer.position.set(0.78, 1.2, 0);
    group.add(hammer);
  }

  group.position.set(x, 0, z);
  scene.add(group);
  npcs.push({ name, role, mesh: group });
}

function createPlayer(playerClass) {
  const colors = {
    demon: 0x7f1d1d,
    mage: 0x4338ca,
    beast: 0x7c2d12
  };

  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.35, 0.65),
    new THREE.MeshStandardMaterial({ color: colors[playerClass] || 0x2563eb })
  );
  torso.position.y = 1.25;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf1c27d })
  );
  head.position.y = 2.25;
  group.add(head);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.05, 0.24),
    new THREE.MeshStandardMaterial({ color: colors[playerClass] || 0x2563eb })
  );
  leftArm.position.set(-0.72, 1.25, 0);
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.72;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 1.1, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  leftLeg.position.set(-0.24, 0.5, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;
  group.add(rightLeg);

  if (playerClass === "mage") {
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x111827 })
    );
    hat.position.y = 2.95;
    group.add(hat);
  }

  if (playerClass === "demon") {
    const horn1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: 0x111827 })
    );
    horn1.position.set(0.2, 2.75, 0.05);
    horn1.rotation.z = -0.5;
    group.add(horn1);

    const horn2 = horn1.clone();
    horn2.position.x = -0.2;
    horn2.rotation.z = 0.5;
    group.add(horn2);
  }

  if (playerClass === "beast") {
    const ear1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 10),
      new THREE.MeshStandardMaterial({ color: 0x3f2a18 })
    );
    ear1.position.set(0.23, 2.75, 0);
    group.add(ear1);

    const ear2 = ear1.clone();
    ear2.position.x = -0.23;
    group.add(ear2);

    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.2, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x6b4423 })
    );
    snout.position.set(0, 2.12, 0.33);
    group.add(snout);
  }

  const sword = createSword();
  sword.position.set(0.92, 1.2, 0);
  group.add(sword);

  const pickaxe = createPickaxe();
  pickaxe.position.set(0.92, 1.2, 0);
  pickaxe.visible = false;
  group.add(pickaxe);

  group.position.set(0, 0, 0);
  scene.add(group);

  return {
    mesh: group,
    swordMesh: sword,
    pickaxeMesh: pickaxe,
    moveSpeed: 4.2,
    sprintSpeed: 7.0,
    attackTimer: 0,
    attackCooldown: 0,
    attacking: false,
    justHit: new Set(),
    velocity: new THREE.Vector3()
  };
}

function createSword() {
  const group = new THREE.Group();

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 2.0),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.3 })
  );
  blade.position.z = 0.95;
  group.add(blade);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af })
  );
  guard.position.z = -0.05;
  group.add(guard);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x3f2a18 })
  );
  handle.position.z = -0.38;
  group.add(handle);

  group.rotation.x = Math.PI / 2;
  group.rotation.z = 0.25;
  return group;
}

function createPickaxe() {
  const group = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c5a34 })
  );
  handle.rotation.z = 0.4;
  group.add(handle);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.12, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af })
  );
  head.position.set(0.26, 0.56, 0);
  head.rotation.z = 0.4;
  group.add(head);

  group.scale.set(1.1, 1.1, 1.1);
  return group;
}

function createWilderness() {
  for (let i = 0; i < 12; i++) {
    createTree(-40 + Math.random() * 80, -26 - Math.random() * 40);
  }
  for (let i = 0; i < 16; i++) {
    spawnOre(-30 + Math.random() * 60, -32 - Math.random() * 55);
  }
}

function createTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423 })
  );
  trunk.position.set(x, 1.6, z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x2f6b32 })
  );
  leaves.position.set(x, 4.3, z);
  scene.add(leaves);
}

function spawnOre(x, z) {
  const ore = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x6b7280 })
  );
  ore.position.set(x, 0.9, z);
  scene.add(ore);
  ores.push({ mesh: ore, mined: false });
}

function spawnStartingZombies() {
  for (let i = 0; i < 10; i++) {
    spawnZombie(-34 + Math.random() * 68, -38 - Math.random() * 40);
  }
}

function spawnZombie(x, z) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x4d6b39 })
  );
  torso.position.y = 1.2;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x7fa36c })
  );
  head.position.y = 2.1;
  group.add(head);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.0, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x4d6b39 })
  );
  leftArm.position.set(-0.63, 1.2, 0.15);
  leftArm.rotation.x = 0.45;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.63;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 1.0, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  leftLeg.position.set(-0.2, 0.48, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.2;
  group.add(rightLeg);

  group.position.set(x, 0, z);
  scene.add(group);

  zombies.push({
    mesh: group,
    health: 26,
    damageCooldown: 0
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (["1", "2", "3", "4", "5"].includes(key)) {
    hotbar.active = Number(key);
    updateHotbar();
    applySelectedSlot();
  }

  if (key === "e") tryInteract();
}

function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false;
}

function onMouseMove(e) {
  if (uiPanelOpen) return;
  mouseLook.yaw -= e.movementX * 0.0028;
  mouseLook.pitch += e.movementY * 0.0018;
  mouseLook.pitch = clamp(mouseLook.pitch, 0.08, 1.1);
}

function onMouseDown(e) {
  if (uiPanelOpen) return;
  if (e.button === 0 && player.attackCooldown <= 0) {
    beginAttack();
  }
}

function beginAttack() {
  // only attack with combat weapons
  if (hotbar.active === 2 && state.hasPickaxe) {
    showMessage("Pickaxe equipped.");
    return;
  }
  player.attacking = true;
  player.attackTimer = 0.28;
  player.attackCooldown = 0.42;
  player.justHit.clear();
}

function updatePlayer(dt) {
  if (uiPanelOpen) return;

  const input = new THREE.Vector3();
  if (keys["w"]) input.z -= 1;
  if (keys["s"]) input.z += 1;
  if (keys["a"]) input.x -= 1;
  if (keys["d"]) input.x += 1;

  let desiredVelocity = new THREE.Vector3();
  if (input.lengthSq() > 0) {
    input.normalize();

    const forward = new THREE.Vector3(Math.sin(mouseLook.yaw), 0, Math.cos(mouseLook.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    desiredVelocity.addScaledVector(forward, -input.z);
    desiredVelocity.addScaledVector(right, input.x);
    desiredVelocity.normalize();

    const speed = keys["shift"] ? player.sprintSpeed : player.moveSpeed;
    desiredVelocity.multiplyScalar(speed);

    const faceAngle = Math.atan2(desiredVelocity.x, desiredVelocity.z);
    player.mesh.rotation.y = faceAngle;
  }

  player.velocity.lerp(desiredVelocity, 0.16);
  const nextPos = player.mesh.position.clone().addScaledVector(player.velocity, dt);

  if (!intersectsBuilding(nextPos)) {
    player.mesh.position.copy(nextPos);
  } else {
    // try axis-separated slide
    const xOnly = player.mesh.position.clone();
    xOnly.x += player.velocity.x * dt;
    if (!intersectsBuilding(xOnly)) player.mesh.position.x = xOnly.x;

    const zOnly = player.mesh.position.clone();
    zOnly.z += player.velocity.z * dt;
    if (!intersectsBuilding(zOnly)) player.mesh.position.z = zOnly.z;
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  if (player.attacking) {
    player.attackTimer -= dt;
    player.swordMesh.rotation.z = -1.5 + (0.28 - Math.max(player.attackTimer, 0)) * 8.5;
    if (player.attackTimer > 0.08 && player.attackTimer < 0.22) hitZombies();
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.swordMesh.rotation.z = 0.25;
    }
  }

  player.mesh.position.x = clamp(player.mesh.position.x, -95, 95);
  player.mesh.position.z = clamp(player.mesh.position.z, -95, 95);

  updateCamera();
}

function updateCamera() {
  const target = new THREE.Vector3(
    player.mesh.position.x,
    player.mesh.position.y + 2.2,
    player.mesh.position.z
  );

  const offset = new THREE.Vector3(
    Math.sin(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance,
    Math.sin(mouseLook.pitch) * mouseLook.distance + 1.5,
    Math.cos(mouseLook.yaw) * Math.cos(mouseLook.pitch) * mouseLook.distance
  );

  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 0.12);
  camera.lookAt(target);
}

function intersectsBuilding(pos) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(pos.x - 0.55, 0, pos.z - 0.55),
    new THREE.Vector3(pos.x + 0.55, 2.8, pos.z + 0.55)
  );
  return collisionBoxes.some(box => box.intersectsBox(playerBox));
}

function updateZombies(dt) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, z.mesh.position);
    const dist = toPlayer.length();

    if (dist < 18 && !uiPanelOpen) {
      toPlayer.y = 0;
      toPlayer.normalize();
      z.mesh.position.addScaledVector(toPlayer, 2.05 * dt);
      z.mesh.lookAt(player.mesh.position.x, z.mesh.position.y, player.mesh.position.z);
    }

    if (z.damageCooldown > 0) z.damageCooldown -= dt;

    if (dist < 1.55 && z.damageCooldown <= 0) {
      state.health -= 6;
      z.damageCooldown = 1.0;
      showMessage("A zombie hit you.");
      if (state.health <= 0) {
        state.health = state.maxHealth;
        player.mesh.position.set(0, 0, 0);
        showMessage("You were sent back to town.");
      }
      updateHUD();
    }

    if (z.health <= 0) {
      scene.remove(z.mesh);
      zombies.splice(i, 1);
      state.money += 1;
      if (Math.random() < 0.22) state.iron += 1;
      if (Math.random() < 0.08) state.money += 4;
      showMessage("Zombie defeated.");
      updateQuestProgress();
      updateHUD();
      spawnZombie(-34 + Math.random() * 68, -42 - Math.random() * 45);
    }
  }
}

function hitZombies() {
  const weaponPos = new THREE.Vector3();
  player.swordMesh.getWorldPosition(weaponPos);

  for (const z of zombies) {
    if (player.justHit.has(z)) continue;
    const dist = weaponPos.distanceTo(z.mesh.position);
    if (dist < 1.9) {
      z.health -= state.weaponDamage;
      player.justHit.add(z);
    }
  }
}

function tryInteract() {
  const p = player.mesh.position;

  // door interactions
  for (const door of doors) {
    if (p.distanceTo(door.position) < 3.1) {
      openDoorMenu(door);
      return;
    }
  }

  // npc interactions
  for (const npc of npcs) {
    if (p.distanceTo(npc.mesh.position) < 3.3) {
      if (npc.role === "quest") {
        if (!state.questAccepted) {
          state.questAccepted = true;
          state.hasPickaxe = true;
          hotbar.slots[2] = "Pickaxe";
          document.getElementById("quest-text").textContent = "Mine 5 iron ore outside the town.";
          showMessage("Quest accepted. You received a pickaxe.");
          updateHotbar();
        } else if (!state.questComplete) {
          showMessage("Bring me 5 iron ore.");
        } else {
          showMessage("The road south will lead to the next town after a boss is added.");
        }
        updateHUD();
        return;
      }

      if (npc.role === "merchant") {
        openShop();
        return;
      }

      if (npc.role === "forge") {
        useForge();
        return;
      }
    }
  }

  // ore interactions
  for (const ore of ores) {
    if (ore.mined) continue;
    if (p.distanceTo(ore.mesh.position) < 2.6) {
      if (!state.hasPickaxe) {
        showMessage("You need a pickaxe first.");
        return;
      }
      if (hotbar.active !== 2) {
        showMessage("Equip the pickaxe in slot 2.");
        return;
      }
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

function openDoorMenu(door) {
  const title = door.label + " Door";
  let text = "Choose what you want.";
  let buttons = [];

  if (door.role === "weapon") {
    text = "Browse weapons or talk to the merchant.";
    buttons = [
      { label: "Open Weapon Shop", action: () => openShop() },
      { label: "Leave", action: () => closePanel() }
    ];
  } else if (door.role === "forge") {
    text = "Use the forge or leave.";
    buttons = [
      { label: "Use Forge", action: () => useForge() },
      { label: "Leave", action: () => closePanel() }
    ];
  } else if (door.role === "armor") {
    text = "Armor shop coming next.";
    buttons = [
      { label: "Close", action: () => closePanel() }
    ];
  } else if (door.role === "item") {
    text = "Item shop coming next.";
    buttons = [
      { label: "Close", action: () => closePanel() }
    ];
  }

  openPanel(title, text, buttons);
}

function openShop() {
  openPanel("Weapon Shop", "Choose a weapon to buy.", [
    { label: "Rusty Sword - 10", action: () => buyItem("Rusty Sword", 10, 10) },
    { label: "Hunter Spear - 35", action: () => buyItem("Hunter Spear", 35, 14) },
    { label: "Mage Staff - 45", action: () => buyItem("Mage Staff", 45, 16) },
    { label: "Katana - 50", action: () => buyItem("Katana", 50, 18, true) },
    { label: "Battle Axe - 60", action: () => buyItem("Battle Axe", 60, 21) },
    { label: "Demon Blade - 75", action: () => buyItem("Demon Blade", 75, 25) }
  ]);
}

function buyItem(name, cost, damage, katana = false) {
  if (state.money < cost) {
    showMessage("Not enough money.");
    closePanel();
    return;
  }
  state.money -= cost;
  state.weapon = name;
  state.weaponDamage = damage;
  hotbar.slots[1] = name;
  if (katana) {
    state.ownsKatana = true;
    hotbar.slots[3] = "Katana";
  }
  updateHUD();
  updateHotbar();
  showMessage("Purchased " + name + ".");
  closePanel();
}

function updateQuestProgress() {
  if (state.questAccepted && !state.questComplete && state.iron >= 5) {
    state.questComplete = true;
    document.getElementById("quest-text").textContent = "Take your ore to the forge to craft an iron sword.";
    showMessage("Quest complete. Visit the forge.");
  }
}

function useForge() {
  if (!state.questComplete) {
    showMessage("Bring 5 iron ore first.");
    return;
  }

  if (!state.hasIronSword) {
    state.hasIronSword = true;
    state.weapon = "Iron Sword";
    state.weaponDamage = 15;
    hotbar.slots[1] = "Iron Sword";
    showMessage("You forged an Iron Sword.");
    updateHUD();
    updateHotbar();
    return;
  }

  showMessage("The forge is quiet for now.");
}

function applySelectedSlot() {
  const slotItem = hotbar.slots[hotbar.active];

  if (hotbar.active === 2 && state.hasPickaxe) {
    player.pickaxeMesh.visible = true;
    player.swordMesh.visible = false;
    state.weapon = "Pickaxe";
  } else {
    player.pickaxeMesh.visible = false;
    player.swordMesh.visible = true;
    if (hotbar.active === 3 && state.ownsKatana) {
      state.weapon = "Katana";
      state.weaponDamage = 18;
    } else if (hotbar.slots[1] === "Iron Sword") {
      state.weapon = "Iron Sword";
      state.weaponDamage = 15;
    } else if (hotbar.slots[1] !== "Empty") {
      state.weapon = hotbar.slots[1];
    }
  }
  updateHUD();
}

function updateHUD() {
  document.getElementById("money").textContent = "$" + state.money;
  document.getElementById("weapon").textContent = "Weapon: " + state.weapon;
  document.getElementById("ore").textContent = "Iron: " + state.iron;
  const pct = Math.max(0, state.health) / state.maxHealth;
  document.getElementById("health-fill").style.width = (pct * 100) + "%";
}

function updateHotbar() {
  for (let i = 1; i <= 5; i++) {
    const slot = document.getElementById("slot-" + i);
    slot.classList.toggle("active", hotbar.active === i);
    slot.querySelector(".slot-label").textContent = hotbar.slots[i];
  }
}

function showMessage(text) {
  document.getElementById("message-box").textContent = text;
  messageTimer = 2.5;
}

function openPanel(title, text, buttons) {
  uiPanelOpen = true;
  const panel = document.getElementById("interaction-panel");
  const titleEl = document.getElementById("panel-title");
  const textEl = document.getElementById("panel-text");
  const buttonsEl = document.getElementById("panel-buttons");

  titleEl.textContent = title;
  textEl.textContent = text;
  buttonsEl.innerHTML = "";

  buttons.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.label;
    btn.onclick = item.action;
    buttonsEl.appendChild(btn);
  });

  panel.classList.remove("hidden");
}

function closePanel() {
  uiPanelOpen = false;
  document.getElementById("interaction-panel").classList.add("hidden");
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  updatePlayer(dt);
  updateZombies(dt);

  renderer.render(scene, camera);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
