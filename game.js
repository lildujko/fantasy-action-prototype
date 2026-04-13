// Core logic for the V13.1 build of the MMO RPG prototype.
// This file defines the scene, player, enemies, cave area, and basic RPG mechanics.

// THREE.js objects
let scene, camera, renderer;

// Game state
let player;
let enemies = [];
let selectedClass = null;
let gameStarted = false;
let isInCave = false;
let lastSpawnTime = 0;

// Boss and progression flags
let bossSpawned = false;
let secondTownUnlocked = false;

// World objects
let townObjects = [];
let caveGroup;

// Controls
const keys = {};
let mouseDown = false;

// Stats and inventory
const inventory = {
  pickaxe: false,
  iron: 0,
  crystal: 0,
  weapons: [],
};
let money = 0;

// XP and leveling
let xp = 0;
let level = 1;
let xpToNext = 100;

// UI elements (cached after init)
let healthFill,
  xpFill,
  levelValue,
  moneyDisplay,
  inventoryOverlay,
  inventoryList,
  alertBox;

// Start the game after class selection
function startGame(type) {
  if (gameStarted) return;
  selectedClass = type;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  init();
  gameStarted = true;
  animate();
}

// Initialization
function init() {
  // Cache UI refs
  healthFill = document.getElementById('health-fill');
  xpFill = document.getElementById('xp-fill');
  levelValue = document.getElementById('level-value');
  moneyDisplay = document.getElementById('money-display');
  inventoryOverlay = document.getElementById('inventory-overlay');
  inventoryList = document.getElementById('inventory-list');
  alertBox = document.getElementById('alert');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202030);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 4, 8);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onResize);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // Build initial town
  buildTown();

  // Create player
  player = createPlayer(selectedClass);

  // Event listeners for input
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e') {
      handleInteract();
    }
    if (e.key.toLowerCase() === 'i') {
      toggleInventory();
    }
    if (e.key.toLowerCase() === 'c') {
      // Attempt to enter/exit cave when 'c' is pressed near entrance
      handleCaveToggle();
    }
  });
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
      beginAttack();
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
  });

  // Close inventory button
  document.getElementById('close-inventory').addEventListener('click', () => {
    inventoryOverlay.classList.add('hidden');
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Build town environment with houses and signs
function buildTown() {
  // Clear old objects
  townObjects.forEach((obj) => {
    scene.remove(obj);
  });
  townObjects = [];

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e2a34 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  townObjects.push(ground);

  // Create some buildings with signs
  const buildings = [
    { x: -20, z: 0, label: 'Forge' },
    { x: 20, z: 0, label: 'Weapons' },
    { x: 0, z: -20, label: 'Supplies' },
    { x: 40, z: -20, label: 'Town Hall' },
    { x: -40, z: -20, label: 'Home' },
  ];
  buildings.forEach(({ x, z, label }) => {
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x4e342e })
    );
    house.position.set(x, 2, z);
    scene.add(house);
    townObjects.push(house);
    // Add sign above
    const sign = createTextSign(label);
    sign.position.set(x, 5, z);
    scene.add(sign);
    townObjects.push(sign);
  });

  // Cave entrance marker
  const caveEntrance = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4, 2),
    new THREE.MeshStandardMaterial({ color: 0x1b5e20 })
  );
  caveEntrance.position.set(0, 2, 40);
  caveEntrance.name = 'caveEntrance';
  scene.add(caveEntrance);
  townObjects.push(caveEntrance);

  // If second town unlocked, build the new town
  if (secondTownUnlocked) {
    buildSecondTown();
  }
}

// Build the second town after defeating the boss
function buildSecondTown() {
  // Create a plaza further away with new buildings
  const secondBuildings = [
    { x: 0, z: 100, label: 'Blacksmith' },
    { x: 10, z: 110, label: 'Inn' },
    { x: -10, z: 90, label: 'Magic Shop' },
  ];
  secondBuildings.forEach(({ x, z, label }) => {
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x546e7a })
    );
    house.position.set(x, 2, z);
    scene.add(house);
    townObjects.push(house);
    const sign = createTextSign(label);
    sign.position.set(x, 5, z);
    scene.add(sign);
    townObjects.push(sign);
  });
  showAlert('You discovered Second Town');
}

// Create a sign with text using a canvas texture
function createTextSign(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#221f1f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), material);
  sign.rotation.y = Math.PI; // front/back orientation ensures text is readable
  return sign;
}

// Create player object with class-specific model and weapon
function createPlayer(classType) {
  const group = new THREE.Group();
  // Determine color based on class
  let bodyColor;
  switch (classType) {
    case 'demon':
      bodyColor = 0x7b0000;
      break;
    case 'mage':
      bodyColor = 0x5e35b1;
      break;
    case 'beast':
      bodyColor = 0x4e342e;
      break;
    default:
      bodyColor = 0x455a64;
  }
  // Torso
  const torsoGeo = new THREE.BoxGeometry(1, 1.5, 0.6);
  const torso = new THREE.Mesh(torsoGeo, new THREE.MeshStandardMaterial({ color: bodyColor }));
  torso.position.y = 1.1;
  group.add(torso);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd7ccc8 }));
  head.position.y = 2.1;
  group.add(head);
  // Arms
  const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: bodyColor });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.8, 1.4, 0);
  rightArm.position.set(0.8, 1.4, 0);
  leftArm.rotation.z = Math.PI / 2;
  rightArm.rotation.z = Math.PI / 2;
  group.add(leftArm);
  group.add(rightArm);
  // Legs
  const legGeo = new THREE.CylinderGeometry(0.17, 0.17, 1.5, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: bodyColor });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.3, 0.5, 0);
  rightLeg.position.set(0.3, 0.5, 0);
  group.add(leftLeg);
  group.add(rightLeg);
  // Weapon
  let weapon;
  if (classType === 'mage') {
    // Staff
    weapon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x9575cd })
    );
    weapon.position.set(0.9, 1.1, 0);
    weapon.rotation.z = Math.PI / 2;
    group.add(weapon);
  } else if (classType === 'beast') {
    // Claws (two small blades)
    weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffd54f })
    );
    weapon.position.set(1.0, 1.1, 0);
    weapon.rotation.y = Math.PI / 2;
    group.add(weapon);
  } else {
    // Demon uses a blood orb as weapon
    weapon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );
    weapon.position.set(0.9, 1.2, 0);
    group.add(weapon);
  }
  scene.add(group);
  return {
    mesh: group,
    weapon: weapon,
    health: 100,
    maxHealth: 100,
    speed: 0.12,
    sprintMultiplier: 1.8,
    attacking: false,
    attackTime: 0,
    attackCooldown: 0,
    attackDamage: 20,
  };
}

// Main animation loop
let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  update(dt);
  renderer.render(scene, camera);
}

// Update logic per frame
function update(dt) {
  if (!player) return;
  // Spawn new enemies occasionally; different spawn counts in town vs cave
  const now = performance.now();
  if (now - lastSpawnTime > 5000) {
    if (!isInCave && enemies.length < 5) {
      spawnEnemy();
      lastSpawnTime = now;
    }
    if (isInCave && enemies.length < 8) {
      spawnEnemy();
      lastSpawnTime = now;
    }
  }

  // Update player movement
  updateMovement(dt);

  // Update attack animation and cooldown
  updateAttack(dt);

  // Update enemies
  updateEnemies(dt);

  // Update XP and level (UI update in updateUI)
  updateUI();
}

// Handle player movement and camera follow
function updateMovement(dt) {
  const dir = new THREE.Vector3();
  if (keys['w']) dir.z -= 1;
  if (keys['s']) dir.z += 1;
  if (keys['a']) dir.x -= 1;
  if (keys['d']) dir.x += 1;
  if (dir.lengthSq() > 0) {
    dir.normalize();
    let speed = player.speed;
    if (keys['shift']) speed *= player.sprintMultiplier;
    player.mesh.position.add(dir.multiplyScalar(speed));
    // Collision: keep within bounds of town when not in cave
    if (!isInCave) {
      // Basic bound check to prevent leaving town area except through cave entrance
      const x = player.mesh.position.x;
      const z = player.mesh.position.z;
      const max = 55;
      if (x > max) player.mesh.position.x = max;
      if (x < -max) player.mesh.position.x = -max;
      if (z < -max) player.mesh.position.z = -max;
    }
  }
  // Camera follows player smoothly
  const camTarget = new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 2, player.mesh.position.z + 8);
  camera.position.lerp(camTarget, 0.1);
  camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1, player.mesh.position.z);
}

// Attack handling: start attack on mouse down
function beginAttack() {
  if (player.attacking || player.attackCooldown > 0) return;
  player.attacking = true;
  player.attackTime = 0;
  player.attackCooldown = 0.6; // global cooldown between attacks
}

function updateAttack(dt) {
  if (player.attackCooldown > 0) {
    player.attackCooldown -= dt;
  }
  if (!player.attacking) return;
  player.attackTime += dt;
  // Attack animation: rotate weapon on Z axis for swing; detect hit window
  const swingDuration = 0.4;
  const progress = player.attackTime / swingDuration;
  // Swing arc: from -1 rad to 1 rad
  const angle = -1 + 2 * progress;
  if (player.weapon) {
    player.weapon.rotation.z = angle;
  }
  // Hit window between 0.3 and 0.6 of the swing
  if (progress >= 0.3 && progress <= 0.6) {
    // Hit enemies in range
    enemies.forEach((enemy) => {
      const dist = enemy.mesh.position.distanceTo(player.mesh.position);
      if (!enemy.hit && dist < 2.0) {
        enemy.health -= player.attackDamage;
        // Knockback
        const knock = new THREE.Vector3().subVectors(enemy.mesh.position, player.mesh.position).normalize().multiplyScalar(0.5);
        enemy.mesh.position.add(knock);
        enemy.hit = true;
        if (enemy.health <= 0) {
          handleEnemyDeath(enemy);
        }
      }
    });
  }
  // End of attack
  if (player.attackTime >= swingDuration) {
    player.attacking = false;
    player.attackTime = 0;
    // Reset weapon rotation
    if (player.weapon) player.weapon.rotation.z = 0;
    // Reset hit flag on enemies for next attack
    enemies.forEach((e) => (e.hit = false));
  }
}

// Spawn enemy at random position around town or in cave
function spawnEnemy() {
  const enemy = {};
  const geom = new THREE.BoxGeometry(0.8, 1.6, 0.8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x33691e });
  const mesh = new THREE.Mesh(geom, mat);
  // Determine spawn position: if in cave, spawn near origin; else around town edges
  let x, z;
  if (isInCave) {
    x = (Math.random() - 0.5) * 20;
    z = (Math.random() - 0.5) * 20;
  } else {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 10;
    x = Math.cos(angle) * dist;
    z = Math.sin(angle) * dist;
  }
  mesh.position.set(x, 0.8, z);
  scene.add(mesh);
  enemy.mesh = mesh;
  enemy.health = isInCave ? 60 : 40;
  enemies.push(enemy);
}

// Spawn a boss in the cave. The boss is a large enemy with high health.
function spawnBoss() {
  const boss = {};
  // Big geometry
  const geom = new THREE.BoxGeometry(2.5, 5, 2.5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x880e4f });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0, 2.5, 30);
  scene.add(mesh);
  boss.mesh = mesh;
  boss.health = 400;
  boss.boss = true;
  enemies.push(boss);
}

// Update enemies: simple AI to chase player
function updateEnemies(dt) {
  enemies = enemies.filter((enemy) => {
    if (!enemy.mesh) return false;
    // Enemy chases player
    const dir = new THREE.Vector3().subVectors(player.mesh.position, enemy.mesh.position);
    const distance = dir.length();
    if (distance > 0.1) {
      dir.normalize();
      enemy.mesh.position.add(dir.multiplyScalar(0.06));
    }
    return true;
  });
}

// Handle enemy death: remove from scene, grant rewards
function handleEnemyDeath(enemy) {
  scene.remove(enemy.mesh);
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
  money += isInCave ? 3 : 1;
  xp += isInCave ? 50 : 20;
  // Rare drop: iron or crystal
  const dropChance = Math.random();
  if (!isInCave && dropChance < 0.4) {
    inventory.iron++;
    showAlert('Found iron ore');
  }
  if (isInCave && dropChance < 0.5) {
    inventory.crystal++;
    showAlert('Found crystal');
  }

  // If killed a boss, unlock second town and exit cave
  if (enemy.boss) {
    bossSpawned = false;
    secondTownUnlocked = true;
    showAlert('Boss defeated! Second town unlocked');
    // Immediately exit cave and rebuild town to include second town
    exitCave();
    buildTown();
  }
}

// UI update: health, XP, level, money
function updateUI() {
  // Health bar
  const healthPerc = player.health / player.maxHealth;
  healthFill.style.width = `${Math.max(0, Math.min(1, healthPerc)) * 100}%`;
  // XP bar
  const xpPerc = xp / xpToNext;
  xpFill.style.width = `${Math.max(0, Math.min(1, xpPerc)) * 100}%`;
  // Level
  levelValue.textContent = level;
  // Money
  moneyDisplay.textContent = `$${money}`;
  // Level up if xp reached
  if (xp >= xpToNext) {
    xp -= xpToNext;
    level++;
    xpToNext = Math.floor(xpToNext * 1.3);
    player.maxHealth += 20;
    player.health = player.maxHealth;
    player.attackDamage += 5;
    showAlert(`Level up! Level ${level}`);
  }
}

// Toggle inventory overlay
function toggleInventory() {
  if (inventoryOverlay.classList.contains('hidden')) {
    // Populate list
    inventoryList.innerHTML = '';
    if (inventory.pickaxe) {
      const li = document.createElement('li');
      li.textContent = 'Iron Pickaxe';
      inventoryList.appendChild(li);
    }
    if (inventory.weapons.length > 0) {
      inventory.weapons.forEach((w) => {
        const li = document.createElement('li');
        li.textContent = w;
        inventoryList.appendChild(li);
      });
    }
    if (inventory.iron > 0) {
      const li = document.createElement('li');
      li.textContent = `Iron: ${inventory.iron}`;
      inventoryList.appendChild(li);
    }
    if (inventory.crystal > 0) {
      const li = document.createElement('li');
      li.textContent = `Crystal: ${inventory.crystal}`;
      inventoryList.appendChild(li);
    }
    if (inventoryList.children.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Empty';
      inventoryList.appendChild(li);
    }
    inventoryOverlay.classList.remove('hidden');
  } else {
    inventoryOverlay.classList.add('hidden');
  }
}

// Interact with objects: open shop, forge, quest, etc.
function handleInteract() {
  // Check proximity to buildings or objects
  const pos = player.mesh.position;
  let interactionHandled = false;
  townObjects.forEach((obj) => {
    const name = obj.name || '';
    if (name === 'caveEntrance') return;
    const dist = obj.position.distanceTo(pos);
    if (dist < 4) {
      // Determine based on sign label behind building
      // We'll examine sign label from mesh children (not trivial). For now, approximate by position.
      if (Math.abs(obj.position.x + 20) < 1 && Math.abs(obj.position.z) < 1) {
        // Forge building at (-20,0)
        openForgeMenu();
        interactionHandled = true;
      } else if (Math.abs(obj.position.x - 20) < 1 && Math.abs(obj.position.z) < 1) {
        // Weapons building at (20,0)
        openWeaponShop();
        interactionHandled = true;
      } else if (Math.abs(obj.position.x) < 1 && Math.abs(obj.position.z + 20) < 1) {
        // Supplies building at (0,-20)
        openSuppliesShop();
        interactionHandled = true;
      }
    }
  });
  if (!interactionHandled) {
    // check if near cave entrance and call automatically?
  }
}

function openForgeMenu() {
  const options = [];
  // Iron pickaxe requires 3 iron
  if (!inventory.pickaxe && inventory.iron >= 3) {
    options.push('Craft Iron Pickaxe (3 Iron)');
  }
  // Craft iron sword if not have
  if (inventory.iron >= 2) {
    options.push('Craft Iron Sword (2 Iron)');
  }
  if (options.length === 0) {
    alert('Forge: You do not have enough materials');
    return;
  }
  const choice = prompt('Forge:\n' + options.map((o, i) => `${i + 1}. ${o}`).join('\n'));
  const iChoice = parseInt(choice);
  if (!iChoice || iChoice < 1 || iChoice > options.length) return;
  const selected = options[iChoice - 1];
  if (selected.startsWith('Craft Iron Pickaxe')) {
    inventory.iron -= 3;
    inventory.pickaxe = true;
    showAlert('Forged an iron pickaxe!');
  } else if (selected.startsWith('Craft Iron Sword')) {
    inventory.iron -= 2;
    inventory.weapons.push('Iron Sword');
    showAlert('Forged an iron sword!');
  }
}

function openWeaponShop() {
  const items = [
    { name: 'Rusty Sword', price: 10 },
    { name: 'Katana', price: 50 },
    { name: 'Steel Sword', price: 80 },
  ];
  const choice = prompt('Weapon Shop:\n' + items.map((it, i) => `${i + 1}. ${it.name} ($${it.price})`).join('\n'));
  const iChoice = parseInt(choice);
  if (!iChoice || iChoice < 1 || iChoice > items.length) return;
  const selected = items[iChoice - 1];
  if (money >= selected.price) {
    money -= selected.price;
    inventory.weapons.push(selected.name);
    showAlert(`Purchased ${selected.name}`);
  } else {
    alert('Not enough money');
  }
}

function openSuppliesShop() {
  const items = [
    { name: 'Health Potion', price: 5 },
    { name: 'Mana Potion', price: 5 },
  ];
  const choice = prompt('Supplies Shop:\n' + items.map((it, i) => `${i + 1}. ${it.name} ($${it.price})`).join('\n'));
  const iChoice = parseInt(choice);
  if (!iChoice || iChoice < 1 || iChoice > items.length) return;
  const selected = items[iChoice - 1];
  if (money >= selected.price) {
    money -= selected.price;
    if (selected.name === 'Health Potion') {
      player.health = Math.min(player.maxHealth, player.health + 30);
      showAlert('Drank health potion');
    }
    // Additional potions can be added later
  } else {
    alert('Not enough money');
  }
}

// Handle cave toggle: enter or exit
function handleCaveToggle() {
  const entrance = townObjects.find((obj) => obj.name === 'caveEntrance');
  if (!entrance) return;
  const dist = entrance.position.distanceTo(player.mesh.position);
  if (dist < 6) {
    if (!isInCave) {
      enterCave();
    } else {
      exitCave();
    }
  }
}

function enterCave() {
  isInCave = true;
  showAlert('Entered Crystal Cavern');
  // Remove town objects except ground (we keep them but make them invisible)
  townObjects.forEach((obj) => (obj.visible = false));
  // Darker background and fog
  scene.background = new THREE.Color(0x050507);
  scene.fog = new THREE.Fog(0x000000, 5, 50);
  // Build cave group
  caveGroup = new THREE.Group();
  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x232323 }));
  floor.rotation.x = -Math.PI / 2;
  caveGroup.add(floor);
  // Walls around cave
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x303030 });
  for (let i = 0; i < 4; i++) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), wallMat);
    wall.position.set(0, 6, 30);
    wall.rotation.y = i * Math.PI / 2;
    caveGroup.add(wall);
  }
  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  ceiling.position.y = 12;
  ceiling.rotation.x = Math.PI / 2;
  caveGroup.add(ceiling);
  // Crystal nodes
  for (let i = 0; i < 10; i++) {
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.4 + Math.random() * 0.4, 1.5 + Math.random(), 6),
      new THREE.MeshStandardMaterial({ color: 0x00bcd4 })
    );
    crystal.position.set((Math.random() - 0.5) * 40, 0.8, (Math.random() - 0.5) * 40);
    caveGroup.add(crystal);
    // Name to identify as mineable
    crystal.userData = { type: 'crystal' };
  }
  scene.add(caveGroup);
  // Position player at cave entrance
  player.mesh.position.set(0, 0, 0);
  enemies.forEach((enemy) => {
    scene.remove(enemy.mesh);
  });
  enemies = [];

  // Spawn boss if not already spawned
  if (!bossSpawned) {
    spawnBoss();
    bossSpawned = true;
  }
}

function exitCave() {
  isInCave = false;
  showAlert('Returned to Town');
  // Remove cave group
  if (caveGroup) {
    caveGroup.children.forEach((child) => {
      child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    scene.remove(caveGroup);
    caveGroup = null;
  }
  scene.background = new THREE.Color(0x202030);
  scene.fog = null;
  // Show town objects
  townObjects.forEach((obj) => (obj.visible = true));
  // Reposition player near cave entrance outside
  player.mesh.position.set(0, 0, 34);
  enemies.forEach((enemy) => {
    scene.remove(enemy.mesh);
  });
  enemies = [];
}

// Show an on-screen alert message for a short time
function showAlert(message) {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 2000);
}