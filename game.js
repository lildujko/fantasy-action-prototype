// Fantasy action prototype game

// Global variables
let scene, camera, renderer;
let clock;
let player;
const enemies = [];
let kills = 0;

// Selected character class and game state
// selectedClass will be set when the player chooses a class from the start screen
let selectedClass = null;
// Flag to ensure we start the game loop once the class is selected
let gameStarted = false;
// Keyboard state
const keyState = {};

// Initialize the game when the window loads
window.addEventListener('load', () => {
  init();
});

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e2e);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 3, 6);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Resize handling
  window.addEventListener('resize', onWindowResize);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.7);
  directional.position.set(5, 10, 3);
  scene.add(directional);

  // Build the environment
  // Create a graveyard-like map with ground and simple props.
  createMap();

  // Ground
  const groundGeo = new THREE.PlaneGeometry(80, 80);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2f3656 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Initialize clock
  clock = new THREE.Clock();

  // Create player
  player = createPlayer();

  // Spawn first enemy
  spawnEnemy();

  // Event listeners
  document.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
  });

  // Do not start the animation loop immediately.
  // The game will begin once a class is selected on the start screen via selectClass().
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createPlayer() {
  // Build a more expressive player model using multiple simple shapes.
  // Color the character based on the chosen class: beasts are brown,
  // mages are purple and demon lords are dark red. If none is chosen,
  // default to a neutral blue.
  let charColor;
  switch (selectedClass) {
    case 'beast':
      charColor = 0x8b4513; // saddle brown
      break;
    case 'mage':
      charColor = 0x663399; // rebecca purple
      break;
    case 'demon':
      charColor = 0x5c0000; // dark red
      break;
    default:
      charColor = 0x3c8dbc; // fallback blue
  }
  // Group to hold all player parts
  const group = new THREE.Group();
  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.0, 8);
  const torsoMat = new THREE.MeshStandardMaterial({ color: charColor });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.5;
  group.add(torso);
  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.15;
  group.add(head);
  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  const armMat = new THREE.MeshStandardMaterial({ color: charColor });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.45, 0.8, 0);
  rightArm.position.set(0.45, 0.8, 0);
  // Rotate arms to be horizontal
  leftArm.rotation.z = Math.PI / 2;
  rightArm.rotation.z = Math.PI / 2;
  group.add(leftArm);
  group.add(rightArm);
  // Legs
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
  const legMat = new THREE.MeshStandardMaterial({ color: charColor });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.18, 0.0, 0);
  rightLeg.position.set(0.18, 0.0, 0);
  group.add(leftLeg);
  group.add(rightLeg);
  // Weapon: a sword for melee classes and a staff for mages
  let sword;
  if (selectedClass === 'mage') {
    const staffGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x9c27b0 });
    sword = new THREE.Mesh(staffGeo, staffMat);
    sword.position.set(0.6, 0.7, 0);
    sword.rotation.z = Math.PI / 2;
    group.add(sword);
  } else {
    const swordGeo = new THREE.BoxGeometry(0.08, 0.08, 1.1);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
    sword = new THREE.Mesh(swordGeo, swordMat);
    sword.position.set(0.6, 0.7, 0);
    sword.rotation.y = Math.PI / 2;
    group.add(sword);
  }

  scene.add(group);

  return {
    group: group,
    sword: sword,
    speed: 4,
    rotationSpeed: 2.5,
    health: 100,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    justHitEnemies: new Set(),
    classType: selectedClass,
  };
}

function spawnEnemy() {
  // Zombies are boxy humanoid enemies with a sickly green color.
  const zombieGeom = new THREE.BoxGeometry(0.5, 1.0, 0.5);
  const zombieMat = new THREE.MeshStandardMaterial({ color: 0x556b2f });
  const enemyMesh = new THREE.Mesh(zombieGeom, zombieMat);
  // Random position away from the player (avoid spawning too close)
  const angle = Math.random() * Math.PI * 2;
  const distance = 8 + Math.random() * 10;
  enemyMesh.position.set(
    Math.cos(angle) * distance,
    0.5,
    Math.sin(angle) * distance
  );
  scene.add(enemyMesh);
  // Each zombie has its own health and a timer controlling how often it can hit the player
  enemies.push({ mesh: enemyMesh, health: 35, damageTimer: 0 });
  updateEnemyCounter();
}

function updateEnemyCounter() {
  const counterElem = document.getElementById('enemy-counter');
  if (counterElem) {
    counterElem.textContent = `Zombies slain: ${kills}`;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  updatePlayer(dt);
  updateEnemies(dt);
  renderer.render(scene, camera);
}

function updatePlayer(dt) {
  // Handle rotation
  if (keyState['KeyA']) {
    player.group.rotation.y += player.rotationSpeed * dt;
  }
  if (keyState['KeyD']) {
    player.group.rotation.y -= player.rotationSpeed * dt;
  }
  // Compute forward direction based on player's rotation
  const forwardDir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(player.group.quaternion)
    .setY(0)
    .normalize();

  // Movement vector
  const moveVector = new THREE.Vector3();
  if (keyState['KeyW']) {
    moveVector.add(forwardDir);
  }
  if (keyState['KeyS']) {
    moveVector.add(forwardDir.clone().negate());
  }
  // Sprint if shift held
  let speedMultiplier = 1;
  if (keyState['ShiftLeft'] || keyState['ShiftRight']) {
    speedMultiplier = 1.8;
  }
  if (moveVector.lengthSq() > 0) {
    moveVector.normalize();
    player.group.position.addScaledVector(
      moveVector,
      player.speed * speedMultiplier * dt
    );
  }

  // Attack handling
  if (keyState['Space'] && !player.attacking && player.attackCooldown <= 0) {
    player.attacking = true;
    player.attackTimer = 0.35; // length of attack
    player.attackCooldown = 0.6; // time until next attack allowed
    player.justHitEnemies.clear();
    // Visual indication: enlarge sword
    player.sword.scale.set(1, 1.5, 1.5);
  }
  // Update timers
  if (player.attackCooldown > 0) {
    player.attackCooldown -= dt;
  }
  if (player.attacking) {
    player.attackTimer -= dt;
    // If timer done, end attack
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.sword.scale.set(1, 1, 1);
    }
  }

  // Update health UI
  updateHealthUI();

  // Update camera to follow player
  const cameraOffset = new THREE.Vector3(0, 2.5, 5);
  // Apply player's rotation to offset so camera stays behind
  const rotatedOffset = cameraOffset.applyQuaternion(player.group.quaternion);
  camera.position.copy(player.group.position).add(rotatedOffset);
  camera.lookAt(player.group.position);
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const enemyPos = enemy.mesh.position;
    const playerPos = player.group.position;
    // Move towards player
    const dirToPlayer = new THREE.Vector3()
      .subVectors(playerPos, enemyPos)
      .setY(0);
    const distance = dirToPlayer.length();
    if (distance > 0.1) {
      dirToPlayer.normalize();
      enemyPos.addScaledVector(dirToPlayer, 2.0 * dt); // enemy speed
    }
    // Face the player
    enemy.mesh.lookAt(playerPos.x, enemyPos.y, playerPos.z);
    // Enemy deals damage if close enough
    enemy.damageTimer -= dt;
    if (distance < 0.8 && enemy.damageTimer <= 0) {
      // Reduce player's health
      player.health -= 5;
      enemy.damageTimer = 0.8; // delay between damage ticks
    }
    // Player attack detection
    if (player.attacking) {
      // Check if this enemy was hit already in this attack
      if (!player.justHitEnemies.has(enemy)) {
        // Compute sword world position
        const swordWorldPos = new THREE.Vector3();
        player.sword.getWorldPosition(swordWorldPos);
        const distToSword = swordWorldPos.distanceTo(enemyPos);
        if (distToSword < 1.0) {
          enemy.health -= 20;
          player.justHitEnemies.add(enemy);
        }
      }
    }
    // Remove enemy if dead
    if (enemy.health <= 0) {
      // Remove from scene
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      kills++;
      updateEnemyCounter();
      // Spawn a new enemy after a small delay
      setTimeout(() => {
        spawnEnemy();
      }, 800);
    }
  }
  // If player health <= 0, respawn player
  if (player.health <= 0) {
    // Reset player's position and health
    player.group.position.set(0, 0, 0);
    player.health = 100;
    // Reset kills count
    kills = 0;
    updateEnemyCounter();
  }
}

// Build a simple graveyard map for the game. This function constructs a
// ground plane and populates the scene with a handful of box-shaped
// gravestones and ruins to give the environment more atmosphere. The
// positions of the props are randomized within a defined range so the
// map feels less repetitive. Additional objects can be added here to
// further enrich the world (trees, rocks, etc.).
function createMap() {
  // Create a large ground plane that the player and enemies can walk on
  const groundGeom = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Gravestones
  const gravestoneGeom = new THREE.BoxGeometry(0.7, 1.2, 0.3);
  const gravestoneMat = new THREE.MeshStandardMaterial({ color: 0x4b4b4b });
  for (let i = 0; i < 25; i++) {
    const grave = new THREE.Mesh(gravestoneGeom, gravestoneMat);
    // Spread graves across the map, leaving space near the center for the player
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 50;
    // Avoid placing props too close to the origin
    if (Math.abs(x) < 5 && Math.abs(z) < 5) {
      i--;
      continue;
    }
    grave.position.set(x, 0.6, z);
    grave.castShadow = true;
    scene.add(grave);
  }

  // Ruined walls
  const wallGeom = new THREE.BoxGeometry(4, 1.2, 0.4);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  for (let i = 0; i < 6; i++) {
    const wall = new THREE.Mesh(wallGeom, wallMat);
    const x = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;
    wall.position.set(x, 0.6, z);
    wall.rotation.y = Math.random() * Math.PI;
    wall.castShadow = true;
    scene.add(wall);
  }
}

function updateHealthUI() {
  const healthFill = document.getElementById('health-fill');
  if (!healthFill) return;
  const healthPercent = Math.max(player.health, 0) / 100;
  healthFill.style.width = `${healthPercent * 100}%`;
}

// -------------------------------------------------------------
// Class selection logic
// These functions handle displaying the start screen, storing the
// selected class and applying its stats to the player. Once a
// class has been chosen, the start screen is hidden and the game
// loop begins.

// Called from the start screen buttons in index.html
function selectClass(type) {
  selectedClass = type;
  // Hide the start screen
  const startElem = document.getElementById('start-screen');
  if (startElem) {
    startElem.style.display = 'none';
  }
  // Apply class-specific stats to the player
  applyClassStats();

  // Spawn an initial wave of zombies when the game starts. A handful of
  // enemies are created here to immediately populate the map. Additional
  // enemies can be spawned later based on gameplay progression.
  for (let i = 0; i < 7; i++) {
    spawnEnemy();
  }
  // Start the game loop on first selection
  if (!gameStarted) {
    gameStarted = true;
    animate();
  }
}

// Adjust player stats based on selected class
function applyClassStats() {
  if (!player) return;
  switch (selectedClass) {
    case 'beast':
      player.speed = 6;
      player.health = 80;
      break;
    case 'mage':
      player.speed = 3;
      player.health = 70;
      break;
    case 'demon':
      player.speed = 2.5;
      player.health = 150;
      break;
    default:
      // If no class selected, leave defaults as-is
      break;
  }
}