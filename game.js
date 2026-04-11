let scene, camera, renderer;
let clock;
let player;
const enemies = [];
const npcs = [];
let kills = 0;

let selectedClass = null;
let gameStarted = false;
let gamePhase = 'town';

const keyState = {};
const moveVelocity = new THREE.Vector3();
const cameraState = {
  yaw: Math.PI,
  pitch: 0.35,
  distance: 6.2,
};

const dialogueState = {
  active: false,
  npc: null,
  index: 0,
  talkedNPCs: new Set(),
};
let objectiveText = '';

window.addEventListener('load', init);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x93b3d6);
  scene.fog = new THREE.Fog(0xa6bdd7, 32, 120);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 4, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  document.body.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xeef6ff, 0x74665b, 0.75);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.05);
  sun.position.set(30, 45, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  buildTown();
  player = createPlayer();
  createTownNPCs();

  clock = new THREE.Clock();
  updateEnemyCounter();
  updateObjective('Talk to the townsfolk (0/3). Press E near an NPC.');

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
  });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', () => {
    if (
      gameStarted &&
      renderer?.domElement?.requestPointerLock &&
      document.pointerLockElement !== renderer.domElement
    ) {
      renderer.domElement.requestPointerLock();
    }
  });
}

function onKeyDown(e) {
  keyState[e.code] = true;

  if (e.code === 'KeyE' && gameStarted && !dialogueState.active) {
    tryStartConversation();
  }

  if (e.code === 'Enter' && dialogueState.active) {
    advanceDialogue();
  }
}

function onMouseMove(e) {
  if (document.pointerLockElement !== renderer.domElement || !gameStarted || dialogueState.active) return;

  cameraState.yaw -= e.movementX * 0.0025;
  cameraState.pitch -= e.movementY * 0.0018;
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch, -0.35, 0.85);
}

function buildTown() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x8ea67c, roughness: 0.98, metalness: 0.01 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 40),
    new THREE.MeshStandardMaterial({ color: 0xb9ad95, roughness: 0.88 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const houseMat = new THREE.MeshStandardMaterial({ color: 0xd5c6af, roughness: 0.94 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c4e3e, roughness: 0.78 });

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 22 + (i % 2) * 5;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const house = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), houseMat);
    house.position.set(x, 2.5, z);
    house.lookAt(0, 2.5, 0);
    house.castShadow = true;
    house.receiveShadow = true;
    scene.add(house);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 3.8, 4), roofMat);
    roof.position.set(x, 6.7, z);
    roof.rotation.y = house.rotation.y + Math.PI / 4;
    roof.castShadow = true;
    scene.add(roof);
  }

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const lampX = Math.cos(angle) * 17;
    const lampZ = Math.sin(angle) * 17;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5f4c3f, roughness: 0.9 })
    );
    pole.position.set(lampX, 1.6, lampZ);
    pole.castShadow = true;
    scene.add(pole);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffcf7f, emissive: 0xffc45c, emissiveIntensity: 0.5 })
    );
    lantern.position.set(lampX, 3.35, lampZ);
    scene.add(lantern);
  }
}

function createCapsuleGeometry(radius, length, capSegments = 6, radialSegments = 10) {
  if (typeof THREE.CapsuleGeometry === 'function') {
    return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
  }
  return new THREE.CylinderGeometry(radius, radius, length + radius * 2, radialSegments);
}

function createCharacterMaterials(role) {
  const palettes = {
    beast: { skin: 0xf0cfa3, body: 0x607d3b, cloth: 0x3f4f2a, weapon: 0xb0b6bf, glow: 0xd5ff8e },
    mage: { skin: 0xf3d8bb, body: 0x5f5dd8, cloth: 0x332d7a, weapon: 0xb6d2ff, glow: 0x9dd0ff },
    demon: { skin: 0xdf8f82, body: 0x7a121c, cloth: 0x3a090f, weapon: 0xd3d5db, glow: 0xff8c8c },
    enemy: { skin: 0xb97672, body: 0x672530, cloth: 0x29161a, weapon: 0xb0896b, glow: 0xff6f61 },
    npc: { skin: 0xe1bd9a, body: 0x4f627f, cloth: 0x384352, weapon: 0x999999, glow: 0xffffff },
  };

  const p = palettes[role] || palettes.beast;
  return {
    skin: new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.56, metalness: 0.05 }),
    body: new THREE.MeshStandardMaterial({ color: p.body, roughness: 0.65, metalness: 0.18 }),
    cloth: new THREE.MeshStandardMaterial({ color: p.cloth, roughness: 0.86, metalness: 0.03 }),
    weapon: new THREE.MeshStandardMaterial({
      color: p.weapon,
      roughness: 0.3,
      metalness: 0.82,
      emissive: p.glow,
      emissiveIntensity: 0.06,
    }),
  };
}

function buildHumanoid(role, withWeapon = true) {
  const group = new THREE.Group();
  const mats = createCharacterMaterials(role);

  const torso = new THREE.Mesh(createCapsuleGeometry(0.33, 0.75, 8, 16), mats.body);
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

  const eyeMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.85, color: 0x222222 });
  const eyeGeo = new THREE.SphereGeometry(0.03, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 1.7, 0.21);
  rightEye.position.set(0.08, 1.7, 0.21);
  group.add(leftEye, rightEye);

  const armGeo = createCapsuleGeometry(0.1, 0.55, 6, 10);
  const leftArm = new THREE.Mesh(armGeo, mats.skin);
  leftArm.position.set(-0.45, 1.05, 0);
  leftArm.rotation.z = 0.18;
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

  const legGeo = createCapsuleGeometry(0.11, 0.65, 6, 10);
  const leftLeg = new THREE.Mesh(legGeo, mats.cloth);
  const rightLeg = new THREE.Mesh(legGeo, mats.cloth);
  leftLeg.position.set(-0.16, 0.35, 0.01);
  rightLeg.position.set(0.16, 0.35, 0.01);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  let sword = null;
  if (withWeapon) {
    sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), mats.weapon);
    sword.position.set(0, -0.08, -0.6);
    sword.castShadow = true;
    rightArmAnchor.add(sword);
  }

  return { group, rightArmAnchor, sword, head, torso };
}

function createPlayer() {
  const model = buildHumanoid('beast', true);
  scene.add(model.group);

  return {
    ...model,
    speed: 5.4,
    runAccel: 24,
    drag: 12,
    rotationLerp: 0.16,
    health: 100,
    maxHealth: 100,
    attackDamage: 20,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    justHitEnemies: new Set(),
  };
}

function createTownNPCs() {
  const npcData = [
    {
      name: 'Rei the Guide',
      lines: [
        'Welcome to Frontier Hollow. Move with W/A/S/D and guide your view with the mouse.',
        'The gate to the wilds only opens for adventurers who greet the town elders.',
      ],
      pos: new THREE.Vector3(3.8, 0, -2.2),
    },
    {
      name: 'Boro the Blacksmith',
      lines: [
        'Keep your blade up and your feet light. Sprint with Shift, then strike with Space.',
        'Don’t mash buttons. Rhythm wins battles out there.',
      ],
      pos: new THREE.Vector3(-4.4, 0, 2.3),
    },
    {
      name: 'Aina the Scout',
      lines: [
        'When you are ready, step through the southern road and the creatures will emerge.',
        'Talk complete? Good. The town believes in you. Press Enter to close this dialogue.',
      ],
      pos: new THREE.Vector3(1.2, 0, 5.3),
    },
  ];

  for (const data of npcData) {
    const model = buildHumanoid('npc', false);
    model.group.position.copy(data.pos);
    scene.add(model.group);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshStandardMaterial({ emissive: 0x7bd6ff, emissiveIntensity: 1.0, color: 0x142233 })
    );
    marker.position.set(0, 2.2, 0);
    model.group.add(marker);

    npcs.push({ ...model, ...data, marker, pulse: Math.random() * Math.PI * 2, talked: false });
  }
}

function tryStartConversation() {
  let nearest = null;
  let nearestDist = Infinity;

  for (const npc of npcs) {
    const dist = npc.group.position.distanceTo(player.group.position);
    if (dist < 2.4 && dist < nearestDist) {
      nearest = npc;
      nearestDist = dist;
    }
  }

  if (!nearest) return;

  dialogueState.active = true;
  dialogueState.npc = nearest;
  dialogueState.index = 0;
  showDialogue(nearest, nearest.lines[0]);
}

function showDialogue(npc, line) {
  const box = document.getElementById('dialogue-box');
  document.getElementById('npc-name').textContent = npc.name;
  document.getElementById('npc-line').textContent = line;
  box.classList.remove('hidden');
}

function advanceDialogue() {
  const npc = dialogueState.npc;
  if (!npc) return;

  dialogueState.index += 1;
  if (dialogueState.index < npc.lines.length) {
    showDialogue(npc, npc.lines[dialogueState.index]);
    return;
  }

  npc.talked = true;
  dialogueState.talkedNPCs.add(npc.name);
  dialogueState.active = false;
  dialogueState.npc = null;

  document.getElementById('dialogue-box').classList.add('hidden');

  const count = dialogueState.talkedNPCs.size;
  if (count < 3) {
    updateObjective(`Talk to the townsfolk (${count}/3). Press E near an NPC.`);
  } else {
    unlockCombatPhase();
  }
}

function unlockCombatPhase() {
  if (gamePhase === 'combat') return;

  gamePhase = 'combat';
  updateObjective('The outer road is open. Survive and slay enemies.');
  spawnEnemy();
}

function spawnEnemy() {
  const model = buildHumanoid('enemy', true);
  const angle = Math.random() * Math.PI * 2;
  const distance = 20 + Math.random() * 6;
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

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  updatePlayer(dt);
  updateTownNPCs(dt);

  if (gamePhase === 'combat') {
    updateEnemies(dt);
  }

  renderer.render(scene, camera);
}

function updatePlayer(dt) {
  if (!dialogueState.active) {
    const forward = new THREE.Vector3(Math.sin(cameraState.yaw), 0, Math.cos(cameraState.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const input = new THREE.Vector3();

    if (keyState['KeyW']) input.add(forward);
    if (keyState['KeyS']) input.sub(forward);
    if (keyState['KeyD']) input.add(right);
    if (keyState['KeyA']) input.sub(right);

    if (input.lengthSq() > 0) input.normalize();

    const sprinting = !!(keyState['ShiftLeft'] || keyState['ShiftRight']);
    const targetSpeed = player.speed * (sprinting ? 1.65 : 1);
    const targetVelocity = input.multiplyScalar(targetSpeed);

    moveVelocity.lerp(targetVelocity, 1 - Math.exp(-player.runAccel * dt));
    moveVelocity.multiplyScalar(1 / (1 + player.drag * dt));

    player.group.position.addScaledVector(moveVelocity, dt);

    if (moveVelocity.lengthSq() > 0.18) {
      const targetAngle = Math.atan2(moveVelocity.x, moveVelocity.z);
      player.group.rotation.y = lerpAngle(player.group.rotation.y, targetAngle, player.rotationLerp);
    }

    if (keyState['Space'] && gamePhase === 'combat' && !player.attacking && player.attackCooldown <= 0) {
      player.attacking = true;
      player.attackTimer = 0.32;
      player.attackCooldown = 0.56;
      player.justHitEnemies.clear();
      player.sword.scale.set(1, 1.1, 1.35);
    }
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  if (player.attacking) {
    player.attackTimer -= dt;
    player.rightArmAnchor.rotation.x = -1.2;
    player.rightArmAnchor.rotation.z = -0.65;
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.sword.scale.set(1, 1, 1);
      player.rightArmAnchor.rotation.set(0, 0, 0);
    }
  } else {
    player.rightArmAnchor.rotation.x = THREE.MathUtils.lerp(player.rightArmAnchor.rotation.x, 0, 0.12);
    player.rightArmAnchor.rotation.z = THREE.MathUtils.lerp(player.rightArmAnchor.rotation.z, 0, 0.12);
  }

  const bobIntensity = moveVelocity.lengthSq() > 0.1 ? 0.034 : 0.01;
  player.head.position.y = 1.68 + Math.sin(clock.elapsedTime * 7) * bobIntensity;

  updateHealthUI();
  updateCamera(dt);
}

function updateCamera(dt) {
  const shoulderHeight = 1.6;
  const target = new THREE.Vector3(
    player.group.position.x,
    player.group.position.y + shoulderHeight,
    player.group.position.z
  );

  const x = Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;
  const y = Math.sin(cameraState.pitch) * cameraState.distance + 1.2;
  const z = Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;

  const desiredPos = new THREE.Vector3(target.x + x, target.y + y, target.z + z);
  camera.position.lerp(desiredPos, 1 - Math.exp(-12 * dt));
  camera.lookAt(target);
}

function updateTownNPCs(dt) {
  for (const npc of npcs) {
    npc.pulse += dt * 4;
    npc.marker.material.emissiveIntensity = npc.talked ? 0.2 : 0.9 + Math.sin(npc.pulse) * 0.3;
    npc.head.position.y = 1.68 + Math.sin(npc.pulse * 0.5) * 0.01;

    const distance = npc.group.position.distanceTo(player.group.position);
    npc.group.lookAt(player.group.position.x, npc.group.position.y + 1, player.group.position.z);

    if (!npc.talked && distance < 2.6 && !dialogueState.active && gamePhase === 'town') {
      updateObjective('Press E to talk with a nearby NPC.');
    }
  }

  if (gamePhase === 'town' && !dialogueState.active) {
    const count = dialogueState.talkedNPCs.size;
    if (count < 3) {
      updateObjective(`Talk to the townsfolk (${count}/3). Press E near an NPC.`);
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const enemyPos = enemy.group.position;
    const playerPos = player.group.position;

    const dir = new THREE.Vector3().subVectors(playerPos, enemyPos).setY(0);
    const distance = dir.length();

    enemy.stepTime += dt * 4;
    enemy.head.position.y = 1.68 + Math.sin(enemy.stepTime) * 0.02;

    if (distance > 1.2) {
      dir.normalize();
      enemyPos.addScaledVector(dir, 2.2 * dt);
    }

    enemy.group.lookAt(playerPos.x, enemyPos.y + 0.8, playerPos.z);

    enemy.damageTimer -= dt;
    if (distance < 1.1 && enemy.damageTimer <= 0) {
      player.health -= 6;
      enemy.damageTimer = 0.84;
    }

    if (player.attacking && !player.justHitEnemies.has(enemy)) {
      const swordWorldPos = new THREE.Vector3();
      player.sword.getWorldPosition(swordWorldPos);
      if (swordWorldPos.distanceTo(enemyPos) < 1.2) {
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
      setTimeout(spawnEnemy, 1200);
    }
  }

  if (player.health <= 0) {
    player.group.position.set(0, 0, 0);
    moveVelocity.set(0, 0, 0);
    player.health = player.maxHealth;
    kills = 0;
    updateEnemyCounter();
    updateObjective('You were rescued and returned to town center.');
  }
}

function selectClass(type) {
  selectedClass = type;
  const startElem = document.getElementById('start-screen');
  if (startElem) startElem.style.display = 'none';

  applyClassStats();

  if (!gameStarted) {
    gameStarted = true;
    animate();
    if (renderer.domElement.requestPointerLock) {
      renderer.domElement.requestPointerLock();
    }
  }
}

function applyClassStats() {
  if (!player) return;

  let role = 'beast';
  switch (selectedClass) {
    case 'beast':
      player.speed = 6.3;
      player.maxHealth = 95;
      player.attackDamage = 26;
      role = 'beast';
      break;
    case 'mage':
      player.speed = 4.5;
      player.maxHealth = 78;
      player.attackDamage = 34;
      role = 'mage';
      break;
    case 'demon':
      player.speed = 3.7;
      player.maxHealth = 150;
      player.attackDamage = 20;
      role = 'demon';
      break;
    default:
      break;
  }

  player.health = player.maxHealth;
  const mats = createCharacterMaterials(role);
  player.torso.material = mats.body;
  player.head.material = mats.skin;
  player.sword.material = mats.weapon;
}

function updateHealthUI() {
  const healthFill = document.getElementById('health-fill');
  if (!healthFill) return;
  const healthPercent = Math.max(player.health, 0) / player.maxHealth;
  healthFill.style.width = `${healthPercent * 100}%`;
}

function updateEnemyCounter() {
  const counterElem = document.getElementById('enemy-counter');
  if (counterElem) counterElem.textContent = `Enemies slain: ${kills}`;
}

function updateObjective(text) {
  const elem = document.getElementById('objective');
  if (!elem || objectiveText === text) return;
  objectiveText = text;
  elem.textContent = `Objective: ${text}`;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function lerpAngle(from, to, alpha) {
  let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * alpha;
}
