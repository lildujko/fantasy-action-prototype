// Fantasy action prototype game

// Global variables
let scene, camera, renderer;
let clock;
let player;
const enemies = [];
let kills = 0;
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

  // Start animation loop
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createPlayer() {
  // Create a group for the player
  const group = new THREE.Group();
  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3c8dbc });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);
  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.1;
  group.add(head);
  // Sword
  const swordGeo = new THREE.BoxGeometry(0.05, 0.05, 1.0);
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
  const sword = new THREE.Mesh(swordGeo, swordMat);
  // Position the sword to the right of the player
  sword.position.set(0.45, 0.7, 0);
  sword.rotation.y = Math.PI / 2;
  group.add(sword);

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
  };
}

function spawnEnemy() {
  // Simple enemy geometry (a red sphere)
  const bodyGeo = new THREE.SphereGeometry(0.4, 10, 10);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe53935 });
  const enemyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  // Random position away from the player
  const angle = Math.random() * Math.PI * 2;
  const distance = 6 + Math.random() * 4;
  enemyMesh.position.set(
    Math.cos(angle) * distance,
    0.5,
    Math.sin(angle) * distance
  );
  scene.add(enemyMesh);
  enemies.push({ mesh: enemyMesh, health: 40, damageTimer: 0 });
  updateEnemyCounter();
}

function updateEnemyCounter() {
  const counterElem = document.getElementById('enemy-counter');
  if (counterElem) {
    counterElem.textContent = `Enemies slain: ${kills}`;
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

function updateHealthUI() {
  const healthFill = document.getElementById('health-fill');
  if (!healthFill) return;
  const healthPercent = Math.max(player.health, 0) / 100;
  healthFill.style.width = `${healthPercent * 100}%`;
}