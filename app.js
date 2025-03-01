<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Retro 3D Game</title>
  <style>
    /* Ocupamos toda la ventana y evitamos fondo blanco */
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
      background-color: black;
    }

    /* --- MIRA EN FORMA DE CRUZ --- */
    #crosshair {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 9999; /* Encima del canvas */
    }
    .crosshairH, .crosshairV {
      position: absolute;
      background-color: white;
    }
    .crosshairH {
      top: 50%;
      left: 0;
      width: 20px;
      height: 2px;
      transform: translateY(-50%);
    }
    .crosshairV {
      left: 50%;
      top: 0;
      width: 2px;
      height: 20px;
      transform: translateX(-50%);
    }

    /* Barras de vida, mensajes, etc. */
    .health-bar {
      transform: translate(-50%, -100%);
      pointer-events: none;
    }
    .health-bar-inner {
      transition: width 0.2s ease-in-out;
    }
    #levelComplete {
      pointer-events: none;
    }
    
    /* Contador de FPS */
    #fpsCounter {
      position: absolute;
      top: 10px;
      right: 10px;
      color: white;
      font-size: 20px;
      font-family: Arial, sans-serif;
      background-color: rgba(0, 0, 0, 0.5);
      padding: 5px 10px;
      border-radius: 5px;
      z-index: 9999;
    }
  </style>
</head>
<body>

<!-- Mira en forma de cruz -->
<div id="crosshair">
  <div class="crosshairH"></div>
  <div class="crosshairV"></div>
</div>

<!-- Contador de FPS -->
<div id="fpsCounter">FPS: 0</div>

<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

  // --- CONTADOR DE FPS ---
  let fpsCounter = document.getElementById('fpsCounter');
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    const elapsedTime = currentTime - lastTime;
    if (elapsedTime >= 500) {
      fps = Math.round((frameCount * 1000) / elapsedTime);
      fpsCounter.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastTime = currentTime;
    }
  }

  // --- RENDERIZADOR RETRO 640×480 ---
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(640, 480, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.objectFit = 'fill';
  renderer.domElement.style.imageRendering = 'pixelated';
  document.body.appendChild(renderer.domElement);

  // --- ESCENA Y CÁMARA ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000080); // Azul marino

  const camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
  camera.position.set(0, 1.5, 5);
  camera.rotation.order = 'YXZ';

  // Agregar luz ambiental 50% menos potente
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // --- AUDIO: Listener y sonido de disparo ---
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();
  let shootSoundBuffer = null;
  // Reemplaza la URL por la del sonido deseado (similar al arma Elstar de Apex Legends)
  audioLoader.load('https://example.com/elstar.mp3', function(buffer) {
    shootSoundBuffer = buffer;
  });

  // --- TEXTURAS Y PISO ---
  const textureLoader = new THREE.TextureLoader();
  let planeSize = 50;
  const groundTexture = textureLoader.load(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg'
  );
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(planeSize / 16, planeSize / 16);
  groundTexture.magFilter = THREE.NearestFilter;
  groundTexture.minFilter = THREE.NearestFilter;

  const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  // Subir el plano a y=0 para eliminar el gap con los muros
  plane.rotation.x = Math.PI / 2;
  plane.position.y = 0;
  plane.receiveShadow = true;
  scene.add(plane);

  // --- MUROS (concreto claro, grosor 0.4, altura 5) ---
  const wallHeight = 5;
  const wallThickness = 0.4;
  const wallTexture = textureLoader.load(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/pbr/Concrete_011_basecolor.jpg'
  );
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(1, 1);
  wallTexture.magFilter = THREE.NearestFilter;
  wallTexture.minFilter = THREE.NearestFilter;
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });

  function createWalls() {
    // Eliminar muros anteriores para evitar duplicados
    scene.children.forEach(child => {
      if (child.isMesh && child.geometry.type === "BoxGeometry" && child.material === wallMaterial) {
        scene.remove(child);
      }
    });

    const northWallGeometry = new THREE.BoxGeometry(planeSize, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, planeSize / 2 - wallThickness / 2);
    scene.add(northWall);

    const southWallGeometry = new THREE.BoxGeometry(planeSize, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight / 2, -planeSize / 2 + wallThickness / 2);
    scene.add(southWall);

    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, planeSize);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(planeSize / 2 - wallThickness / 2, wallHeight / 2, 0);
    scene.add(eastWall);

    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, planeSize);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-planeSize / 2 + wallThickness / 2, wallHeight / 2, 0);
    scene.add(westWall);
  }
  createWalls();

  // --- ESTRELLAS ---
  function createStars() {
    const starGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 200; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.set(
        Math.random() * 60 - 30,
        Math.random() * 50 + 10,
        Math.random() * 60 - 30
      );
      scene.add(star);
    }
  }
  createStars();

  // --- LUNA LLENA ---
  function createMoon() {
    const moonTexture = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'
    );
    const moonGeometry = new THREE.SphereGeometry(4, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ map: moonTexture });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-30, 40, -50);
    scene.add(moon);
  }
  createMoon();

  // --- LUZ DIRECCIONAL ---
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // --- VARIABLES DE JUEGO ---
  const targets = [];
  const targetHealth = [];
  let currentLevel = 1;
  let targetsDestroyed = 0;
  let totalTargets = 0;
  let bulletDamage = 10; // Daño base, se duplica con power up
  const bullets = [];
  const particles = [];

  // --- CREAR OBJETIVOS ---
  function createTargets() {
    const targetGeometry = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeometry = new THREE.EdgesGeometry(targetGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    const targetCount = currentLevel * 10;

    // Limpieza previa
    targets.length = 0;
    targetHealth.length = 0;
    [...scene.children].forEach(child => {
      if (child.isMesh && child.material.color && child.material.color.getHex() === 0x00ff00) {
        scene.remove(child);
      }
      if (child.isLineSegments && child.material.color && child.material.color.getHex() === 0xffff00) {
        scene.remove(child);
      }
    });
    document.querySelectorAll('.health-bar').forEach(bar => bar.remove());

    // Rango interior para que los objetivos aparezcan dentro de los muros
    const halfRange = planeSize / 2 - wallThickness - 0.5;

    for (let i = 0; i < targetCount; i++) {
      const target = new THREE.Mesh(
        targetGeometry,
        new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x006600, emissiveIntensity: 0.5 })
      );
      target.castShadow = true;
      const posX = Math.random() * (halfRange * 2) - halfRange;
      const posZ = Math.random() * (halfRange * 2) - halfRange;
      target.position.set(posX, 0.5, posZ);
      scene.add(target);
      targets.push(target);
      targetHealth.push(100);

      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      edges.position.copy(target.position);
      scene.add(edges);
      target.userData = { edges, healthBar: null, lastHit: 0 };

      createHealthBar(target);
    }
    totalTargets = targetCount;
    targetsDestroyed = 0;
    updateCounter();
  }

  function createHealthBar(target) {
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthBar.style.position = 'absolute';
    healthBar.style.width = '50px';
    healthBar.style.height = '5px';
    healthBar.style.backgroundColor = 'red';
    healthBar.style.border = '1px solid black';
    healthBar.style.display = 'none';
    healthBar.innerHTML = '<div class="health-bar-inner" style="width: 100%; height: 100%; background-color: green;"></div>';
    document.body.appendChild(healthBar);
    target.userData.healthBar = healthBar;
  }

  function updateHealthBars() {
    const cameraPos = camera.position;
    const currentTime = Date.now();
    targets.forEach((target, index) => {
      if (target.userData && target.userData.healthBar) {
        const health = targetHealth[index];
        const distance = cameraPos.distanceTo(target.position);
        const showBar = distance < 15 || (currentTime - target.userData.lastHit < 2000 && health > 0);
        if (showBar && health > 0) {
          const healthBarInner = target.userData.healthBar.querySelector('.health-bar-inner');
          if (healthBarInner) {
            healthBarInner.style.width = `${(health / 100) * 50}px`;
            const vector = target.position.clone();
            vector.project(camera);
            const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
            const y = (1 - (vector.y * 0.5 + 0.5)) * renderer.domElement.clientHeight;
            target.userData.healthBar.style.left = `${x - 25}px`;
            target.userData.healthBar.style.top = `${y - 20}px`;
            target.userData.healthBar.style.display = 'block';
          }
        } else {
          target.userData.healthBar.style.display = 'none';
        }
        if (health <= 0) {
          if (target.userData.healthBar.parentNode) {
            target.userData.healthBar.parentNode.removeChild(target.userData.healthBar);
          }
          delete target.userData.healthBar;
          if (target.userData.edges) {
            scene.remove(target.userData.edges);
            delete target.userData.edges;
          }
        }
      }
    });
  }

  function updateCounter() {
    const counterElement = document.getElementById('targetCounter') || document.createElement('div');
    if (!document.getElementById('targetCounter')) {
      counterElement.id = 'targetCounter';
      counterElement.style.position = 'absolute';
      counterElement.style.top = '10px';
      counterElement.style.left = '10px';
      counterElement.style.color = 'white';
      counterElement.style.fontSize = '20px';
      counterElement.style.fontFamily = 'Arial';
      document.body.appendChild(counterElement);
    }
    counterElement.textContent = `Nivel ${currentLevel} - Objetivos destruidos: ${targetsDestroyed}/${totalTargets}`;
  }

  function showLevelComplete() {
    const message = document.createElement('div');
    message.id = 'levelComplete';
    message.style.position = 'absolute';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = 'white';
    message.style.fontSize = '40px';
    message.style.fontFamily = 'Arial';
    message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';
    message.textContent = `NIVEL ${currentLevel} COMPLETADO`;
    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
      currentLevel++;
      planeSize *= 1.1;
      plane.scale.set(planeSize / 50, planeSize / 50, 1);
      createWalls();   // Se eliminan muros anteriores y se crean nuevos
      createTargets();
      createPowerUp();
    }, 2000);
  }

  // --- EXPLOSIONES ---
  function createExplosion(position) {
    const particleCount = 50;
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      const direction = new THREE.Vector3(
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1
      );
      particle.userData = { velocity: direction, initialPosition: position.clone(), gravity: true };
      scene.add(particle);
      particles.push(particle);
    }
  }

  function createBlueExplosion(position) {
    const particleCount = 50;
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      const direction = new THREE.Vector3(
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1
      );
      particle.userData = { velocity: direction, initialPosition: position.clone() };
      scene.add(particle);
      particles.push(particle);
    }
  }

  // --- POWER UP AZUL TRANSPARENTE CON LUZ ---
  let powerUp = null;
  function createPowerUp() {
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * planeSize,
        1,
        (Math.random() - 0.5) * planeSize
      );
    } while (pos.distanceTo(camera.position) < 5);

    const powerUpGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const powerUpMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5
    });
    powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
    powerUp.position.copy(pos);
    powerUp.userData.baseY = pos.y;
    powerUp.userData.amplitude = 0.5;
    powerUp.userData.speed = 2;
    // Agregar luz puntual al power up
    const powerUpLight = new THREE.PointLight(0x0000ff, 1, 10);
    powerUp.add(powerUpLight);
    powerUp.userData.light = powerUpLight;
    scene.add(powerUp);
  }

  // Partículas alrededor del power up
  function createPowerUpParticle(position) {
    const particleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(position);
    particle.position.x += Math.random() * 0.4 - 0.2;
    particle.position.y += Math.random() * 0.4;
    particle.position.z += Math.random() * 0.4 - 0.2;
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        0.01 + Math.random() * 0.01,
        (Math.random() - 0.5) * 0.01
      ),
      initialPosition: particle.position.clone(),
      life: 60
    };
    scene.add(particle);
    particles.push(particle);
  }

  // --- CONTROLES ---
  const keys = { w: false, a: false, s: false, d: false, space: false, ctrl: false, shift: false };
  let velocityY = 0;
  let isJumping = false;
  let canDash = true;
  let dashCooldown = 1000;
  let lastDashTime = 0;
  const baseMoveSpeed = 0.1;
  const runMoveSpeed = 0.3;
  const rotationSpeed = 0.002;
  const jumpSpeed = 0.3;
  const gravity = 0.008;
  const dashSpeed = 0.5;
  const bulletSpeed = 0.5;

  // --- ZOOM X2 AL MANTENER CLIC DERECHO ---
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  const originalFOV = camera.fov;
  document.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      camera.fov = originalFOV / 2;
      camera.updateProjectionMatrix();
    }
    if (event.button === 0 && (document.pointerLockElement === document.body || document.mozPointerLockElement === document.body)) {
      shootBullet();
    }
  });
  document.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      camera.fov = originalFOV;
      camera.updateProjectionMatrix();
    }
  });

  document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
  document.body.onclick = function() {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  };

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body || document.mozPointerLockElement === document.body) {
      camera.rotation.y -= event.movementX * rotationSpeed;
      camera.rotation.x -= event.movementY * rotationSpeed;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  });

  window.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
      case 'w': keys.w = true; break;
      case 'a': keys.a = true; break;
      case 's': keys.s = true; break;
      case 'd': keys.d = true; break;
      case ' ': keys.space = true; break;
      case 'control': keys.ctrl = true; break;
      case 'shift': keys.shift = true; break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
      case 'w': keys.w = false; break;
      case 'a': keys.a = false; break;
      case 's': keys.s = false; break;
      case 'd': keys.d = false; break;
      case ' ': keys.space = false; break;
      case 'control': keys.ctrl = false; break;
      case 'shift': keys.shift = false; break;
    }
  });

  function shootBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(camera.position);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    bullet.userData = { velocity: direction.clone().multiplyScalar(bulletSpeed) };
    scene.add(bullet);
    bullets.push(bullet);

    // Reproducir sonido de disparo (reemplaza el URL por uno adecuado)
    if (shootSoundBuffer) {
      const sound = new THREE.Audio(listener);
      sound.setBuffer(shootSoundBuffer);
      sound.setVolume(0.5);
      sound.play();
    }

    setTimeout(() => {
      const index = bullets.indexOf(bullet);
      if (index !== -1) {
        scene.remove(bullet);
        bullets.splice(index, 1);
      }
    }, 2000);
  }

  // --- INICIALIZAR OBJETIVOS, CONTADOR, POWERUP ---
  createTargets();
  updateCounter();
  createPowerUp();

  // --- BUCLE PRINCIPAL ---
  function animate() {
    requestAnimationFrame(animate);
    updateFPS();

    const direction = new THREE.Vector3(0, 0, 0);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const currentMoveSpeed = keys.shift ? runMoveSpeed : baseMoveSpeed;

    if (keys.w) direction.add(forward.clone().multiplyScalar(currentMoveSpeed));
    if (keys.s) direction.add(forward.clone().multiplyScalar(-currentMoveSpeed));
    if (keys.a) direction.add(right.clone().multiplyScalar(-currentMoveSpeed));
    if (keys.d) direction.add(right.clone().multiplyScalar(currentMoveSpeed));
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(currentMoveSpeed);
      camera.position.add(new THREE.Vector3(direction.x, 0, direction.z));
    }

    if (keys.space && !isJumping) {
      velocityY = jumpSpeed;
      isJumping = true;
    }
    if (isJumping) {
      velocityY -= gravity;
      camera.position.y += velocityY;
      if (camera.position.y < 1.5) {
        camera.position.y = 1.5;
        velocityY = 0;
        isJumping = false;
      }
    } else {
      camera.position.y = Math.max(1.5, camera.position.y - gravity);
    }

    const now = Date.now();
    if (keys.ctrl && canDash && (now - lastDashTime) >= dashCooldown) {
      const dashDirection = forward.clone().multiplyScalar(dashSpeed);
      camera.position.add(new THREE.Vector3(dashDirection.x, 0, dashDirection.z));
      canDash = false;
      lastDashTime = now;
      setTimeout(() => { canDash = true; }, dashCooldown);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.position.add(bullet.userData.velocity);
      for (let j = targets.length - 1; j >= 0; j--) {
        const target = targets[j];
        const dist = bullet.position.distanceTo(target.position);
        if (dist < 0.6) {
          targetHealth[j] -= bulletDamage;
          target.userData.lastHit = Date.now();
          updateHealthBars();
          if (targetHealth[j] <= 0) {
            createExplosion(target.position);
            scene.remove(target);
            if (target.userData.edges) scene.remove(target.userData.edges);
            targets.splice(j, 1);
            targetHealth.splice(j, 1);
            targetsDestroyed++;
            updateCounter();
            if (targetsDestroyed === totalTargets) showLevelComplete();
          }
          scene.remove(bullet);
          bullets.splice(i, 1);
          break;
        }
      }
      if (
        Math.abs(bullet.position.x) > (planeSize * 0.5) ||
        Math.abs(bullet.position.z) > (planeSize * 0.5) ||
        bullet.position.y < 0 || bullet.position.y > 50
      ) {
        scene.remove(bullet);
        bullets.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      if (!particle.userData) continue;
      if (particle.userData.velocity) {
        // Si la partícula tiene gravedad (las rojas de explosión), aplicarla:
        if (particle.userData.gravity) {
          particle.userData.velocity.y -= 0.001; // Ajusta el valor para más o menos gravedad
        }
        particle.position.add(particle.userData.velocity);
      }
      if (particle.userData.life !== undefined) {
        particle.userData.life--;
        if (particle.userData.life <= 0) {
          scene.remove(particle);
          particles.splice(i, 1);
          continue;
        }
      }
      particle.scale.multiplyScalar(0.98);
      if (
        particle.scale.x < 0.02 ||
        (particle.userData.initialPosition &&
         particle.position.distanceTo(particle.userData.initialPosition) > 5)
      ) {
        scene.remove(particle);
        particles.splice(i, 1);
      }
    }

    camera.position.x = Math.max(-(planeSize * 0.49), Math.min(planeSize * 0.49, camera.position.x));
    camera.position.z = Math.max(-(planeSize * 0.49), Math.min(planeSize * 0.49, camera.position.z));

    updateHealthBars();

    if (powerUp) {
      powerUp.position.y = powerUp.userData.baseY + Math.sin(now * 0.002 * powerUp.userData.speed) * powerUp.userData.amplitude;
      if (Math.random() < 0.02) {
        createPowerUpParticle(powerUp.position);
      }
      if (camera.position.distanceTo(powerUp.position) < 1.5) {
        createBlueExplosion(powerUp.position);
        scene.remove(powerUp);
        powerUp = null;
        bulletDamage *= 2;
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = 640/480;
    camera.updateProjectionMatrix();
  });
</script>
</body>
</html>
