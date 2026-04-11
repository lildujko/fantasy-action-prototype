// Fantasy action prototype game

let scene, camera, renderer;
let clock;
let player;
const enemies = [];
let kills = 0;

let selectedClass = null;
let gameStarted = false;
const keyState = {};

window.addEventListener('load', () => {
  init();
});

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1428);
  scene.fog = new THREE.Fog(0x0f1428, 18, 70);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    220
  );
  camera.position.set(0, 3, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);

  const hemi = new THREE.HemisphereLight(0x8cb7ff, 0x1f1a15, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d7, 1.25);
  sun.position.set(8, 14, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.bias = -0.0007;
  scene.add(sun);

  const rim = new THREE.PointLight(0x4a7fff, 0.8, 40, 2);
  rim.position.set(-8, 6, -10);
  scene.add(rim);

  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2b3248,
    roughness: 0.92,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  addArenaDetails();

  clock = new THREE.Clock();
  player = createPlayer();
  spawnEnemy();

  document.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
  });
}

function addArenaDetails() {
  const stoneGeo = new THREE.DodecahedronGeometry(0.4, 0);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6f7485,
    roughness: 0.94,
    metalness: 0,
  });

  for (let i = 0; i < 40; i++) {
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    const angle = Math.random() * Math.PI * 2;
    const dist = 7 + Math.random() * 45;
    stone.position.set(Math.cos(angle) * dist, 0.25, Math.sin(angle) * dist);
    stone.scale.setScalar(0.7 + Math.random() * 1.7);
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createCharacterMaterials(role) {
  const palettes = {
    beast: {
      skin: 0xf0cfa3,
      body: 0x607d3b,
      cloth: 0x3f4f2a,
      weapon: 0xb0b6bf,
      glow: 0xd5ff8e,
    },
    mage: {
      skin: 0xf3d8bb,
      body: 0x5f5dd8,
      cloth: 0x332d7a,
      weapon: 0xb6d2ff,
      glow: 0x9dd0ff,
    },
    demon: {
      skin: 0xdf8f82,
      body: 0x7a121c,
      cloth: 0x3a090f,
      weapon: 0xd3d5db,
      glow: 0xff8c8c,
    },
    enemy: {
      skin: 0xb97672,
      body: 0x672530,
      cloth: 0x29161a,
      weapon: 0xb0896b,
      glow: 0xff6f61,
    },
  };

  const palette = palettes[role] || palettes.beast;
  return {
    skin: new THREE.MeshStandardMaterial({
      color: palette.skin,
      roughness: 0.56,
      metalness: 0.05,
    }),
    body: new THREE.MeshStandardMaterial({
      color: palette.body,
      roughness: 0.65,
      metalness: 0.18,
    }),
    cloth: new THREE.MeshStandardMaterial({
      color: palette.cloth,
      roughness: 0.85,
      metalness: 0.03,
    }),
    weapon: new THREE.MeshStandardMaterial({
      color: palette.weapon,
      roughness: 0.3,
      metalness: 0.85,
      emissive: palette.glow,
      emissiveIntensity: 0.07,
    }),
  };
}

function buildHumanoid(role) {
  const group = new THREE.Group();
  const mats = createCharacterMaterials(role);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.75, 8, 16), mats.body);
  torso.position.y = 0.95;
  torso.castShadow = true;
  group.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.32), mats.cloth);
  chestPlate.position.set(0, 1.02, 0.22);
  chestPlate.castShadow = true;
  group.add(chestPlate);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), mats.skin);
  head.position.y = 1.68;
  head.castShadow = true;
  group.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.03, 10, 10);
  const eyeMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.8, color: 0x222222 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 1.7, 0.21);
  rightEye.position.set(0.08, 1.7, 0.21);
  group.add(leftEye);
  group.add(rightEye);

  const armGeo = new THREE.CapsuleGeometry(0.1, 0.55, 6, 10);
  const leftArm = new THREE.Mesh(armGeo, mats.skin);
  leftArm.position.set(-0.45, 1.05, 0);
  leftArm.rotation.z = 0.15;
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArmAnchor = new THREE.Group();
  rightArmAnchor.position.set(0.45, 1.25, 0);
  group.add(rightArmAnchor);

  const rightArm = new THREE.Mesh(armGeo, mats.skin);
  rightArm.position.y = -0.2;
  rightArm.rotation.z = -0.1;
  rightArm.castShadow = true;
  rightArmAnchor.add(rightArm);

  const legGeo = new THREE.CapsuleGeometry(0.11, 0.65, 6, 10);
  const leftLeg = new THREE.Mesh(legGeo, mats.cloth);
  const rightLeg = new THREE.Mesh(legGeo, mats.cloth);
  leftLeg.position.set(-0.16, 0.35, 0.01);
  rightLeg.position.set(0.16, 0.35, 0.01);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  group.add(leftLeg);
  group.add(rightLeg);

  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), mats.weapon);
  sword.position.set(0, -0.08, -0.6);
  sword.castShadow = true;
  rightArmAnchor.add(sword);

  return {
    group,
    rightArmAnchor,
    sword,
    head,
    torso,
    materials: mats,
  };
}

function createPlayer() {
  const model = buildHumanoid('beast');
  scene.add(model.group);

  return {
    ...model,
    speed: 4,
    rotationSpeed: 2.5,
    health: 100,
    maxHealth: 100,
    attackDamage: 20,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    justHitEnemies: new Set(),
    classType: selectedClass,
  };
}

function spawnEnemy() {
  const model = buildHumanoid('enemy');
  const angle = Math.random() * Math.PI * 2;
  const distance = 7 + Math.random() * 8;
  model.group.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
  scene.add(model.group);

  enemies.push({
    ...model,
    health: 70,
    damageTimer: 0,
    stepTime: Math.random() * Math.PI * 2,
    hitFlash: 0,
  });
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
  if (keyState['KeyA']) {
    player.group.rotation.y += player.rotationSpeed * dt;
  }
  if (keyState['KeyD']) {
    player.group.rotation.y -= player.rotationSpeed * dt;
  }

  const forwardDir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(player.group.quaternion)
    .setY(0)
    .normalize();

  const moveVector = new THREE.Vector3();
  if (keyState['KeyW']) moveVector.add(forwardDir);
  if (keyState['KeyS']) moveVector.add(forwardDir.clone().negate());

  const sprinting = keyState['ShiftLeft'] || keyState['ShiftRight'];
  const speedMultiplier = sprinting ? 1.8 : 1;

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize();
    player.group.position.addScaledVector(moveVector, player.speed * speedMultiplier * dt);
  }

  if (keyState['Space'] && !player.attacking && player.attackCooldown <= 0) {
    player.attacking = true;
    player.attackTimer = 0.35;
    player.attackCooldown = 0.6;
    player.justHitEnemies.clear();
    player.sword.scale.set(1, 1.1, 1.35);
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  if (player.attacking) {
    player.attackTimer -= dt;
    player.rightArmAnchor.rotation.x = -1.15;
    player.rightArmAnchor.rotation.z = -0.7;
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.sword.scale.set(1, 1, 1);
      player.rightArmAnchor.rotation.set(0, 0, 0);
    }
  } else {
    player.rightArmAnchor.rotation.x = THREE.MathUtils.lerp(player.rightArmAnchor.rotation.x, 0, 0.12);
    player.rightArmAnchor.rotation.z = THREE.MathUtils.lerp(player.rightArmAnchor.rotation.z, 0, 0.12);
  }

  const bob = Math.sin(clock.elapsedTime * 5) * (moveVector.lengthSq() > 0 ? 0.035 : 0.01);
  player.head.position.y = 1.68 + bob;

  updateHealthUI();

  const cameraOffset = new THREE.Vector3(0, 2.7, 5.5);
  const rotatedOffset = cameraOffset.applyQuaternion(player.group.quaternion);
  camera.position.copy(player.group.position).add(rotatedOffset);
  camera.lookAt(player.group.position.x, player.group.position.y + 1.1, player.group.position.z);
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const enemyPos = enemy.group.position;
    const playerPos = player.group.position;

    const dirToPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos).setY(0);
    const distance = dirToPlayer.length();

    enemy.stepTime += dt * 4;
    enemy.head.position.y = 1.68 + Math.sin(enemy.stepTime) * 0.02;

    if (distance > 0.1) {
      dirToPlayer.normalize();
      enemyPos.addScaledVector(dirToPlayer, 2.1 * dt);
    }

    enemy.group.lookAt(playerPos.x, enemyPos.y + 0.8, playerPos.z);

    enemy.damageTimer -= dt;
    if (distance < 1.0 && enemy.damageTimer <= 0) {
      player.health -= 6;
      enemy.damageTimer = 0.85;
    }

    if (player.attacking && !player.justHitEnemies.has(enemy)) {
      const swordWorldPos = new THREE.Vector3();
      player.sword.getWorldPosition(swordWorldPos);
      if (swordWorldPos.distanceTo(enemyPos) < 1.15) {
        enemy.health -= player.attackDamage;
        enemy.hitFlash = 0.12;
        player.justHitEnemies.add(enemy);
      }
    }

    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= dt;
      enemy.torso.material.emissive = new THREE.Color(0xff4d4d);
      enemy.torso.material.emissiveIntensity = 0.8;
    } else {
      enemy.torso.material.emissiveIntensity = 0;
    }

    if (enemy.health <= 0) {
      scene.remove(enemy.group);
      enemies.splice(i, 1);
      kills++;
      updateEnemyCounter();
      setTimeout(spawnEnemy, 700);
    }
  }

  if (player.health <= 0) {
    player.group.position.set(0, 0, 0);
    player.health = player.maxHealth;
    kills = 0;
    updateEnemyCounter();
  }
}

function updateHealthUI() {
  const healthFill = document.getElementById('health-fill');
  if (!healthFill) return;

  const healthPercent = Math.max(player.health, 0) / player.maxHealth;
  healthFill.style.width = `${healthPercent * 100}%`;
}

function selectClass(type) {
  selectedClass = type;
  const startElem = document.getElementById('start-screen');
  if (startElem) {
    startElem.style.display = 'none';
  }

  applyClassStats();
  if (!gameStarted) {
    gameStarted = true;
    animate();
  }
}

function applyClassStats() {
  if (!player) return;

  let role = 'beast';
  switch (selectedClass) {
    case 'beast':
      player.speed = 6;
      player.maxHealth = 95;
      player.attackDamage = 26;
      role = 'beast';
      break;
    case 'mage':
      player.speed = 3.8;
      player.maxHealth = 78;
      player.attackDamage = 34;
      role = 'mage';
      break;
    case 'demon':
      player.speed = 2.9;
      player.maxHealth = 150;
      player.attackDamage = 20;
      role = 'demon';
      break;
    default:
      break;
  }

  player.health = player.maxHealth;
  const updatedMats = createCharacterMaterials(role);
  player.torso.material = updatedMats.body;
  player.head.material = updatedMats.skin;
  player.sword.material = updatedMats.weapon;
}
