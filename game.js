let scene, camera, renderer, clock;
let player;
let keys = {};
let npcs = [];
let zombies = [];
let ores = [];
let townBounds = { minX: -18, maxX: 18, minZ: -18, maxZ: 18 };

let selectedClass = null;
let messageTimer = 0;

const state = {
  money: 0,
  health: 100,
  maxHealth: 100,
  hasPickaxe: false,
  iron: 0,
  weapon: "None",
  weaponDamage: 8,
  hasIronSword: false,
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
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  setupLights();
  createGround();
  createTown();
  createWilderness();
  player = createPlayer(selectedClass);
  spawnStartingZombies();

  updateHUD();
  showMessage("You arrived in town.");

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
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
  createBuilding(-12, -9, 10, 8, 0x8b5e3c, "Weapon Shop");
  createBuilding(12, -9, 10, 8, 0x7b5537, "Armor Shop");
  createBuilding(-12, 9, 10, 8, 0x6f4a2f, "Item Shop");
  createBuilding(12, 9, 10, 8, 0x50545c, "Forge");

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

function createBuilding(x, z, w, d, color, label) {
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

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xe5c07b })
  );
  sign.position.set(x, 4.5, z - d / 2 - 0.3);
  scene.add(sign);
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
  npcs.push({ name, role, mesh: group, cooldown: 0 });
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

    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed })
    );
    staff.position.set(0.9, 1.1, 0);
    staff.rotation.z = Math.PI / 10;
    group.add(staff);
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

  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.8, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af })
  );
  weapon.position.set(0.9, 1.2, 0);
  group.add(weapon);

  group.position.set(0, 0, 0);
  scene.add(group);

  return {
    mesh: group,
    weaponMesh: weapon,
    moveSpeed: 5.0,
    sprintSpeed: 8.5,
    attackTimer: 0,
    attackCooldown: 0,
    attacking: false,
    justHit: new Set()
  };
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

  if (key === "e") tryInteract();
  if (key === " " && player.attackCooldown <= 0) beginAttack();
}

function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false;
}

function beginAttack() {
  player.attacking = true;
  player.attackTimer = 0.28;
  player.attackCooldown = 0.45;
  player.justHit.clear();
}

function updatePlayer(dt) {
  const move = new THREE.Vector3();
  if (keys["w"]) move.z -= 1;
  if (keys["s"]) move.z += 1;
  if (keys["a"]) move.x -= 1;
  if (keys["d"]) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize();
    const speed = keys["shift"] ? player.sprintSpeed : player.moveSpeed;
    player.mesh.position.addScaledVector(move, speed * dt);

    const angle = Math.atan2(move.x, move.z);
    player.mesh.rotation.y = angle;
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  if (player.attacking) {
    player.attackTimer -= dt;
    player.weaponMesh.rotation.z = -1.4 + (0.28 - Math.max(player.attackTimer, 0)) * 8;
    if (player.attackTimer > 0.08 && player.attackTimer < 0.22) {
      hitZombies();
    }
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.weaponMesh.rotation.z = 0;
    }
  }

  // keep player inside broad world limits
  player.mesh.position.x = clamp(player.mesh.position.x, -95, 95);
  player.mesh.position.z = clamp(player.mesh.position.z, -95, 95);

  const camTarget = new THREE.Vector3(
    player.mesh.position.x,
    player.mesh.position.y + 3.5,
    player.mesh.position.z + 8.5
  );
  camera.position.lerp(camTarget, 0.08);
  camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.5, player.mesh.position.z);
}

function updateZombies(dt) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    if (!z || !z.mesh) continue;

    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, z.mesh.position);
    const dist = toPlayer.length();

    if (dist < 18) {
      toPlayer.y = 0;
      toPlayer.normalize();
      z.mesh.position.addScaledVector(toPlayer, 2.1 * dt);
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

      // respawn deeper in wilderness
      spawnZombie(-34 + Math.random() * 68, -42 - Math.random() * 45);
    }
  }
}

function hitZombies() {
  const weaponPos = new THREE.Vector3();
  player.weaponMesh.getWorldPosition(weaponPos);

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

  // NPC interactions
  for (const npc of npcs) {
    const d = p.distanceTo(npc.mesh.position);
    if (d < 3.3) {
      if (npc.role === "quest") {
        if (!state.questAccepted) {
          state.questAccepted = true;
          state.hasPickaxe = true;
          document.getElementById("quest-text").textContent = "Mine 5 iron ore outside the town.";
          showMessage("Quest accepted. You received a pickaxe.");
        } else if (!state.questComplete) {
          showMessage("Bring me 5 iron ore.");
        } else {
          showMessage("The path south leads to danger. A boss will guard the second town later.");
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
    const d = p.distanceTo(ore.mesh.position);
    if (d < 2.8) {
      if (!state.hasPickaxe) {
        showMessage("You need a pickaxe first.");
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
    showMessage("You forged an Iron Sword.");
    updateHUD();
    return;
  }

  showMessage("The forge is quiet for now.");
}

function openShop() {
  const choice = prompt(
    "Weapon Shop\n\n" +
    "1. Rusty Sword - 10\n" +
    "2. Hunter Spear - 35\n" +
    "3. Mage Staff - 45\n" +
    "4. Katana - 50\n" +
    "5. Battle Axe - 60\n" +
    "6. Demon Blade - 75\n\n" +
    "Type 1-6"
  );

  if (!choice) return;

  const items = {
    "1": { name: "Rusty Sword", cost: 10, damage: 10 },
    "2": { name: "Hunter Spear", cost: 35, damage: 14 },
    "3": { name: "Mage Staff", cost: 45, damage: 16 },
    "4": { name: "Katana", cost: 50, damage: 18 },
    "5": { name: "Battle Axe", cost: 60, damage: 21 },
    "6": { name: "Demon Blade", cost: 75, damage: 25 }
  };

  const item = items[choice];
  if (!item) {
    showMessage("That is not a valid choice.");
    return;
  }

  if (state.money < item.cost) {
    showMessage("Not enough money.");
    return;
  }

  state.money -= item.cost;
  state.weapon = item.name;
  state.weaponDamage = item.damage;
  showMessage("Purchased " + item.name + ".");
  updateHUD();
}

function updateHUD() {
  document.getElementById("money").textContent = "$" + state.money;
  document.getElementById("weapon").textContent = "Weapon: " + state.weapon;
  document.getElementById("ore").textContent = "Iron: " + state.iron;

  const pct = Math.max(0, state.health) / state.maxHealth;
  document.getElementById("health-fill").style.width = (pct * 100) + "%";
}

function showMessage(text) {
  document.getElementById("message-box").textContent = text;
  messageTimer = 2.5;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  updatePlayer(dt);
  updateZombies(dt);

  if (messageTimer > 0) {
    messageTimer -= dt;
  }

  renderer.render(scene, camera);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
