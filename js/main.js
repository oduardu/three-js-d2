import * as THREE from 'three';
import { FBXLoader } from './jsm/loaders/FBXLoader.js';

let camera, scene, renderer, wolf, mapRoot;
let characterMesh;
let mixer, walkAction;
let clock = new THREE.Clock();
let sunMesh, sunLight, sunTarget, moonMesh, moonLight;
let sunAngle = 0;
let winConditionMet = false;
let enemy;
let enemySpeed = 0.06;
let gameOver = false;
let chickenAnimationMixer;
let chickenAction;
let enemyMixer, enemyWalkAction, enemyBiteAction;
let gameStarted = false;
let walkMode = false;

const params = {
    cameraMode: 'Terceira Pessoa'
};

function getRandomPosition(excludePosition, minDistance = 10) {
    const range = 40;
    while (true) {
        const x = (Math.random() - 0.5) * 2 * range;
        const z = (Math.random() - 0.5) * 2 * range;
        const pos = new THREE.Vector3(x, 0, z);

        if (excludePosition) {
            if (pos.distanceTo(excludePosition) >= minDistance) {
                return pos;
            }
        } else {
            return pos;
        }
    }
}

function isPositionInsideWall(position, walls) {
    for (let w of walls) {
        const [x, y, z, width, height, depth] = w;
        const halfWidth = width / 2;
        const halfDepth = depth / 2;

        if (position.x >= x - halfWidth && position.x <= x + halfWidth &&
            position.z >= z - halfDepth && position.z <= z + halfDepth) {
            return true;
        }
    }
    return false;
}

function getValidSpawnPosition(walls, excludePosition = null, minDistance = 10) {
    const range = 40;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        const x = (Math.random() - 0.5) * 2 * range;
        const z = (Math.random() - 0.5) * 2 * range;
        const pos = new THREE.Vector3(x, 0, z);

        if (!isPositionInsideWall(pos, walls)) {
            if (excludePosition) {
                if (pos.distanceTo(excludePosition) >= minDistance) {
                    return pos;
                }
            } else {
                return pos;
            }
        }
        attempts++;
    }

    return new THREE.Vector3(0, 0, 0);
}

const thirdPersonCamera = {
    distance: 2.5,
    height: 2.0,
    lookAtHeight: 1.0
};

const moveSpeed = 0.2;
const rotateSpeed = 0.05;
const targetPosition = new THREE.Vector3(10, 1, -15);
const winDistance = 2;

function showGameOverScreen() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '2000';
    overlay.style.fontFamily = 'Arial, sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.color = '#f44336';
    title.style.fontSize = '72px';
    title.style.marginBottom = '20px';
    title.style.textShadow = '4px 4px 8px rgba(0,0,0,0.9)';
    title.style.animation = 'pulse 1.5s infinite';

    const message = document.createElement('p');
    message.textContent = 'O dinossauro te pegou!';
    message.style.color = 'white';
    message.style.fontSize = '32px';
    message.style.marginBottom = '40px';
    message.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';

    const restartButton = document.createElement('button');
    restartButton.textContent = 'REINICIAR';
    restartButton.style.padding = '20px 50px';
    restartButton.style.fontSize = '28px';
    restartButton.style.fontWeight = 'bold';
    restartButton.style.backgroundColor = '#f44336';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '10px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.fontFamily = 'Arial, sans-serif';

    restartButton.addEventListener('mouseenter', () => {
        restartButton.style.backgroundColor = '#da190b';
    });

    restartButton.addEventListener('mouseleave', () => {
        restartButton.style.backgroundColor = '#f44336';
    });

    restartButton.addEventListener('click', () => {
        location.reload();
    });

    overlay.appendChild(title);
    overlay.appendChild(message);
    overlay.appendChild(restartButton);
    document.body.appendChild(overlay);
}

function showVictoryScreen() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '2000';
    overlay.style.fontFamily = 'Arial, sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'VITÓRIA!';
    title.style.color = '#4CAF50';
    title.style.fontSize = '72px';
    title.style.marginBottom = '20px';
    title.style.textShadow = '4px 4px 8px rgba(0,0,0,0.9)';
    title.style.animation = 'pulse 1.5s infinite';

    const message = document.createElement('p');
    message.textContent = 'Você alcançou o frango dourado!';
    message.style.color = 'white';
    message.style.fontSize = '32px';
    message.style.marginBottom = '40px';
    message.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';

    const restartButton = document.createElement('button');
    restartButton.textContent = 'JOGAR NOVAMENTE';
    restartButton.style.padding = '20px 50px';
    restartButton.style.fontSize = '28px';
    restartButton.style.fontWeight = 'bold';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '10px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.fontFamily = 'Arial, sans-serif';

    restartButton.addEventListener('mouseenter', () => {
        restartButton.style.backgroundColor = '#45a049';
    });

    restartButton.addEventListener('mouseleave', () => {
        restartButton.style.backgroundColor = '#4CAF50';
    });

    restartButton.addEventListener('click', () => {
        location.reload();
    });

    overlay.appendChild(title);
    overlay.appendChild(message);
    overlay.appendChild(restartButton);
    document.body.appendChild(overlay);
}

const raycaster = new THREE.Raycaster();
const wolfHeight = 1.6;
const gravity = -0.15;
const groundCheckDistance = 10;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

function updateThirdPersonCamera() {
    if (!wolf || params.cameraMode !== 'Terceira Pessoa') return;

    const direction = new THREE.Vector3(0, 0, 2.5);
    direction.applyQuaternion(wolf.quaternion);

    const cameraPosition = new THREE.Vector3();
    cameraPosition.copy(wolf.position);
    cameraPosition.addScaledVector(direction, thirdPersonCamera.distance);
    cameraPosition.y += thirdPersonCamera.height;

    camera.position.copy(cameraPosition);

    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.copy(wolf.position);
    lookAtPoint.y += thirdPersonCamera.lookAtHeight;

    camera.lookAt(lookAtPoint);
}


export function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 5, 12);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);

    const menuContainer = document.createElement('div');
    menuContainer.id = 'menuContainer';
    menuContainer.style.position = 'absolute';
    menuContainer.style.top = '50%';
    menuContainer.style.left = '50%';
    menuContainer.style.transform = 'translate(-50%, -50%)';
    menuContainer.style.textAlign = 'center';
    menuContainer.style.zIndex = '1000';
    menuContainer.style.fontFamily = 'Arial, sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'ESCOLHA O MODO DE JOGO';
    title.style.color = 'white';
    title.style.marginBottom = '30px';
    title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    menuContainer.appendChild(title);

    const normalButton = document.createElement('button');
    normalButton.textContent = 'MODO NORMAL';
    normalButton.style.padding = '20px 40px';
    normalButton.style.fontSize = '24px';
    normalButton.style.fontWeight = 'bold';
    normalButton.style.backgroundColor = '#f44336';
    normalButton.style.color = 'white';
    normalButton.style.border = 'none';
    normalButton.style.borderRadius = '10px';
    normalButton.style.cursor = 'pointer';
    normalButton.style.margin = '10px';
    normalButton.style.fontFamily = 'Arial, sans-serif';

    normalButton.addEventListener('mouseenter', () => {
        normalButton.style.backgroundColor = '#da190b';
    });

    normalButton.addEventListener('mouseleave', () => {
        normalButton.style.backgroundColor = '#f44336';
    });

    normalButton.addEventListener('click', () => {
        walkMode = false;
        gameStarted = true;
        menuContainer.remove();
        clock.start();
    });

    const walkButton = document.createElement('button');
    walkButton.textContent = 'MODO WALK';
    walkButton.style.padding = '20px 40px';
    walkButton.style.fontSize = '24px';
    walkButton.style.fontWeight = 'bold';
    walkButton.style.backgroundColor = '#4CAF50';
    walkButton.style.color = 'white';
    walkButton.style.border = 'none';
    walkButton.style.borderRadius = '10px';
    walkButton.style.cursor = 'pointer';
    walkButton.style.margin = '10px';
    walkButton.style.fontFamily = 'Arial, sans-serif';

    walkButton.addEventListener('mouseenter', () => {
        walkButton.style.backgroundColor = '#45a049';
    });

    walkButton.addEventListener('mouseleave', () => {
        walkButton.style.backgroundColor = '#4CAF50';
    });

    walkButton.addEventListener('click', () => {
        walkMode = true;
        gameStarted = true;
        menuContainer.remove();
        clock.start();
    });

    menuContainer.appendChild(normalButton);
    menuContainer.appendChild(document.createElement('br'));
    menuContainer.appendChild(walkButton);

    document.body.appendChild(menuContainer);

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const fill = new THREE.DirectionalLight(0xffffff, 0.2);
    fill.position.set(5, 8, 3);
    scene.add(fill);

    const sunGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff000 });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xaaaaff });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 0);
    scene.add(sunTarget);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    moonLight = new THREE.DirectionalLight(0x6666ff, 0.3);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 100;
    scene.add(moonLight);

    const wallsData = [
        [0, 2.5, -50, 100, 5, 1],
        [0, 2.5, 50, 100, 5, 1],
        [-50, 2.5, 0, 1, 5, 100],
        [50, 2.5, 0, 1, 5, 100],
        [15, 2.5, 10, 10, 5, 1],
        [-10, 2.5, -15, 1, 5, 20],
        [25, 2.5, -20, 15, 5, 1],
        [-25, 2.5, 15, 1, 5, 15],
        [0, 2.5, 0, 12, 5, 1],
        [-30, 2.5, -30, 10, 5, 1],
        [30, 2.5, 30, 1, 5, 12],
        [10, 2.5, -35, 8, 5, 1],
        [-20, 2.5, 30, 15, 5, 1]
    ];

    targetPosition.copy(getValidSpawnPosition(wallsData));

    let targetIndicator;
    const chickenLoader = new FBXLoader();
    chickenLoader.load(
        "/assets/golden-chicken-hero/source/chicken_with_model.fbx",
        (chickenModel) => {
            targetIndicator = chickenModel;
            targetIndicator.scale.setScalar(0.02);
            targetIndicator.position.copy(targetPosition);
            targetIndicator.position.y = 0;

            const texLoader = new THREE.TextureLoader();
            const chickenTexture = texLoader.load(
                "/assets/golden-chicken-hero/textures/Albedo_Chicken_03.tga.png",
                undefined,
                undefined,
                (err) => console.error("Error loading chicken texture", err)
            );
            chickenTexture.colorSpace = THREE.SRGBColorSpace;

            targetIndicator.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = new THREE.MeshStandardMaterial({
                        map: chickenTexture,
                        color: 0xffffff,
                        roughness: 0.5,
                        metalness: 0
                    });
                }
                if (o.isLineSegments || o.isLine) {
                    o.visible = false;
                }
            });

            scene.add(targetIndicator);

            const anim1Loader = new FBXLoader();
            anim1Loader.load(
                "/assets/golden-chicken-hero/source/animations/chicken_with_animation_1.fbx",
                (anim1) => {
                    if (anim1.animations && anim1.animations.length > 0) {
                        chickenAnimationMixer = new THREE.AnimationMixer(targetIndicator);
                        chickenAction = chickenAnimationMixer.clipAction(anim1.animations[0]);
                        chickenAction.play();
                    }
                },
                undefined,
                (err) => console.error("Error loading chicken animation 1:", err)
            );
        },
        undefined,
        (error) => {
            console.error("Error loading chicken:", error);
            const targetGeo = new THREE.SphereGeometry(1, 8, 8);
            const targetMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            targetIndicator = new THREE.Mesh(targetGeo, targetMat);
            targetIndicator.position.copy(targetPosition);
            scene.add(targetIndicator);
        }
    );

    mapRoot = new THREE.Group();
    scene.add(mapRoot);

    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mapRoot.add(ground);

    const groundTexLoader = new THREE.TextureLoader();
    const grassTexture = groundTexLoader.load("/assets/yard-grass/textures/gm.png");
    grassTexture.colorSpace = THREE.SRGBColorSpace;

    const grassOpacity = groundTexLoader.load("/assets/yard-grass/textures/gm_Opacity.png");

    const grassInstanceCount = 80000;
    const grassGeometry = new THREE.PlaneGeometry(0.5, 1);
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        alphaMap: grassOpacity,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.5
    });

    const grassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassInstanceCount);
    grassMesh.castShadow = true;
    grassMesh.receiveShadow = true;
    grassMesh.userData.isGrass = true;

    const dummy = new THREE.Object3D();
    const mapSize = 90;

    for (let i = 0; i < grassInstanceCount; i++) {
        const x = (Math.random() - 0.5) * mapSize;
        const z = (Math.random() - 0.5) * mapSize;

        dummy.position.set(x, 0.8, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.set(
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4,
            1
        );
        dummy.updateMatrix();
        grassMesh.setMatrixAt(i, dummy.matrix);
    }

    mapRoot.add(grassMesh);

    grassMesh.userData.animate = (time) => {
        for (let i = 0; i < grassInstanceCount; i++) {
            grassMesh.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            const offset = i * 0.1;
            const sway = Math.sin(time * 2 + offset) * 0.05;
            dummy.rotation.z = sway;

            dummy.updateMatrix();
            grassMesh.setMatrixAt(i, dummy.matrix);
        }
        grassMesh.instanceMatrix.needsUpdate = true;
    };

    const wallHeight = 5;
    const wallThickness = 1;

    const wallTexLoader = new THREE.TextureLoader();
    const wallBaseColor = wallTexLoader.load(
        "/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_BaseColor.png",
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
        }
    );
    wallBaseColor.colorSpace = THREE.SRGBColorSpace;

    const wallNormal = wallTexLoader.load(
        "/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_Normal.png",
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
        }
    );

    const wallRoughness = wallTexLoader.load(
        "/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_Roughness.png",
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
        }
    );

    const walls = wallsData;

    walls.forEach(w => {
        const geo = new THREE.BoxGeometry(w[3], w[4], w[5]);
        const wallMat = new THREE.MeshStandardMaterial({
            map: wallBaseColor,
            normalMap: wallNormal,
            roughnessMap: wallRoughness,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(w[0], w[1], w[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mapRoot.add(mesh);
    });

    const loader = new FBXLoader();
    loader.load(
        "/assets/Wolf/Wolf.fbx",
        (object) => {
            wolf = new THREE.Group();
            characterMesh = object;
            wolf.add(characterMesh);

            characterMesh.rotation.y = Math.PI;
            characterMesh.rotation.y = Math.PI;

            characterMesh.scale.setScalar(1);
            characterMesh.position.set(0, 0, 0);

            const box = new THREE.Box3().setFromObject(characterMesh);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const targetHeight = 1.5;
            const scaleFactor = targetHeight / size.y;
            characterMesh.scale.setScalar(scaleFactor);

            const scaledCenter = center.clone().multiplyScalar(scaleFactor);
            const scaledBottomY = box.min.y * scaleFactor;

            characterMesh.position.x = -scaledCenter.x;
            characterMesh.position.z = -scaledCenter.z;
            characterMesh.position.y = -scaledBottomY;

            const texLoader = new THREE.TextureLoader();
            const wolfTexture = texLoader.load(
                "/assets/Wolf/textures/Wolf_Body.jpg",
                undefined,
                undefined,
                (err) => console.error("Error texture", err)
            );
            wolfTexture.colorSpace = THREE.SRGBColorSpace;

            characterMesh.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    const applyTexture = (mat) => {
                        const newMat = new THREE.MeshStandardMaterial({
                            map: wolfTexture,
                            color: 0xffffff,
                            roughness: 0.5,
                            metalness: 0,
                        });
                        return newMat;
                    };
                    if (Array.isArray(o.material)) {
                        o.material = o.material.map(applyTexture);
                    } else if (o.material) {
                        o.material = applyTexture(o.material);
                    }
                }
            });

            if (characterMesh.animations && characterMesh.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterMesh);
                walkAction = mixer.clipAction(characterMesh.animations[0]);
            }

            const wolfSpawn = getValidSpawnPosition(wallsData, targetPosition, 10);
            wolf.position.copy(wolfSpawn);

            scene.add(wolf);
            switchCamera(params.cameraMode);
        },
        undefined,
        (error) => {
            console.error("Error loading Wolf:", error);
        }
    );

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    function loadDino() {
        const dinoLoader = new FBXLoader();
        dinoLoader.load("/assets/dino-hunter-deadly-shores-vicious/source/a_tyran_01.fbx", (dino) => {
            enemy = new THREE.Group();
            const dinoMesh = dino;
            enemy.add(dinoMesh);

            dinoMesh.scale.setScalar(1);
            dinoMesh.position.set(0, 0, 0);

            const enemySpawn = getValidSpawnPosition(wallsData, targetPosition, 15);
            enemy.position.copy(enemySpawn);

            const texLoader = new THREE.TextureLoader();
            const dinoTexture = texLoader.load(
                "/assets/dino-hunter-deadly-shores-vicious/textures/Screenshot_2025-11-13_160217.png",
                undefined,
                undefined,
                (err) => console.error("Error loading dino texture", err)
            );
            dinoTexture.colorSpace = THREE.SRGBColorSpace;

            dinoMesh.traverse(o => {
                if (o.isMesh) {
                    const meshName = o.name.toLowerCase();
                    if (meshName.includes('lung') || meshName.includes('pulm') || meshName.includes('organ') || meshName.includes('internal')) {
                        o.visible = false;
                        return;
                    }

                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = new THREE.MeshStandardMaterial({
                        map: dinoTexture,
                        color: 0xffffff,
                        roughness: 0.7,
                        metalness: 0
                    });
                }
            });

            if (dino.animations && dino.animations.length > 0) {
                enemyMixer = new THREE.AnimationMixer(dinoMesh);

                const runAnim = dino.animations.find(a => a.name === "run");
                const attackAnim = dino.animations.find(a => a.name === "attack");

                if (runAnim) {
                    enemyWalkAction = enemyMixer.clipAction(runAnim);
                    enemyWalkAction.play();
                }

                if (attackAnim) {
                    enemyBiteAction = enemyMixer.clipAction(attackAnim);
                }
            }

            scene.add(enemy);
        }, undefined, (err) => {
            console.error("Error loading Dino:", err);
        });
    }

    setTimeout(() => {
        if (!walkMode) {
            loadDino();
        }
    }, 100);

    animate();
}

function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
}

function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
}


function checkHorizontalCollision(movementVector) {
    if (!mapRoot) return false;

    const origin = new THREE.Vector3(
        wolf.position.x,
        wolf.position.y + wolfHeight / 2,
        wolf.position.z
    );

    const direction = movementVector.clone().applyQuaternion(wolf.quaternion).normalize();
    const checkDistance = moveSpeed + 0.5; // Aumentado um pouco para evitar entrar na parede

    raycaster.set(origin, direction);
    raycaster.far = checkDistance;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);

    for (let intersection of intersections) {
        let obj = intersection.object;
        while (obj) {
            if (obj.userData && obj.userData.isGrass) {
                break;
            }
            if (!obj.parent || obj.parent === scene) {
                return true;
            }
            obj = obj.parent;
        }
        if (!obj || !obj.userData || !obj.userData.isGrass) {
            return true;
        }
    }

    return false;
}

function checkVerticalCollision() {
    if (!wolf || !mapRoot) return gravity;

    const origin = new THREE.Vector3(
        wolf.position.x,
        wolf.position.y + 1,
        wolf.position.z
    );
    const direction = new THREE.Vector3(0, -1, 0);

    raycaster.set(origin, direction);
    raycaster.far = groundCheckDistance;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);

    for (let intersection of intersections) {
        let obj = intersection.object;
        let isGrass = false;

        while (obj) {
            if (obj.userData && obj.userData.isGrass) {
                isGrass = true;
                break;
            }
            if (!obj.parent || obj.parent === scene) {
                break;
            }
            obj = obj.parent;
        }

        if (!isGrass) {
            const distanceToGround = intersection.distance;
            const offset = 1.0;
            const trueDistance = distanceToGround - offset;

            if (Math.abs(trueDistance) < 0.1) {
                return -trueDistance;
            }

            if (trueDistance < -0.1) {
                return -trueDistance;
            }
            return gravity;
        }
    }

    return gravity;
}


function handleMovement() {
    if (!wolf || winConditionMet) return;

    if (keys.a) {
        wolf.rotation.y += rotateSpeed;
    }
    if (keys.d) {
        wolf.rotation.y -= rotateSpeed;
    }

    let moved = false;
    let deltaZ = 0;

    if (keys.w) { deltaZ = -moveSpeed; moved = true; }
    if (keys.s) { deltaZ = moveSpeed; moved = true; }

    if (walkAction) {
        if (moved) {
            if (!walkAction.isRunning()) {
                walkAction.play();
            }
        } else {
            if (walkAction.isRunning()) {
                walkAction.stop();
            }
        }
    }

    if (moved) {
        const movementVector = new THREE.Vector3(0, 0, deltaZ);

        if (!checkHorizontalCollision(movementVector)) {
            movementVector.applyQuaternion(wolf.quaternion);
            const newPosition = wolf.position.clone().add(movementVector);

            const mapBoundary = 49;
            if (Math.abs(newPosition.x) < mapBoundary && Math.abs(newPosition.z) < mapBoundary) {
                wolf.position.add(movementVector);
            }
        }
    }

    const deltaY = checkVerticalCollision();
    if (deltaY !== 0) {
        wolf.position.y += deltaY;
    }
    if (wolf.position.distanceTo(targetPosition) < winDistance) {
        if (!winConditionMet && !gameOver && !walkMode) {
            winConditionMet = true;
            showVictoryScreen();
        }
    }
}

function handleEnemy() {
    if (walkMode || !enemy || !wolf || gameOver || winConditionMet) {
        return;
    }

    const distance = enemy.position.distanceTo(wolf.position);

    if (distance < 15.0) {
        if (enemyWalkAction) {
            enemyWalkAction.stop();
        }
        if (enemyBiteAction) {
            if (!enemyBiteAction.isRunning()) {
                enemyBiteAction.reset();
                enemyBiteAction.setLoop(THREE.LoopRepeat);
                enemyBiteAction.play();
            }
        }

        const direction = new THREE.Vector3();
        direction.subVectors(wolf.position, enemy.position).normalize();
        const moveVector = direction.clone().multiplyScalar(enemySpeed * 0.5);

        const newPosition = enemy.position.clone().add(moveVector);

        const origin = new THREE.Vector3(
            enemy.position.x,
            enemy.position.y + 1,
            enemy.position.z
        );

        raycaster.set(origin, direction);
        raycaster.far = enemySpeed * 0.5 + 1;

        const intersections = raycaster.intersectObjects(mapRoot.children, true);
        const validIntersections = intersections.filter(int => {
            let obj = int.object;
            while (obj) {
                if (obj.userData && obj.userData.isGrass) return false;
                if (!obj.parent || obj.parent === scene) break;
                obj = obj.parent;
            }
            return true;
        });

        if (validIntersections.length === 0) {
            enemy.position.copy(newPosition);
        } else {
            const right = new THREE.Vector3(-direction.z, 0, direction.x);
            const leftMove = direction.clone().add(right.clone().multiplyScalar(-0.5)).normalize().multiplyScalar(enemySpeed * 0.5);
            const rightMove = direction.clone().add(right.clone().multiplyScalar(0.5)).normalize().multiplyScalar(enemySpeed * 0.5);

            raycaster.set(origin, leftMove.clone().normalize());
            raycaster.far = enemySpeed * 0.5 + 1;
            const leftIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => {
                let obj = int.object;
                while (obj) {
                    if (obj.userData && obj.userData.isGrass) return false;
                    if (!obj.parent || obj.parent === scene) break;
                    obj = obj.parent;
                }
                return true;
            });

            raycaster.set(origin, rightMove.clone().normalize());
            raycaster.far = enemySpeed * 0.5 + 1;
            const rightIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => {
                let obj = int.object;
                while (obj) {
                    if (obj.userData && obj.userData.isGrass) return false;
                    if (!obj.parent || obj.parent === scene) break;
                    obj = obj.parent;
                }
                return true;
            });

            if (leftIntersections.length === 0) {
                enemy.position.add(leftMove);
            } else if (rightIntersections.length === 0) {
                enemy.position.add(rightMove);
            }
        }

        if (distance < 2.0) {
            gameOver = true;
            showGameOverScreen();
        }
    } else {
        if (enemyBiteAction) {
            enemyBiteAction.stop();
        }
        if (enemyWalkAction) {
            if (!enemyWalkAction.isRunning()) {
                enemyWalkAction.play();
            }
        }

        const direction = new THREE.Vector3();
        direction.subVectors(wolf.position, enemy.position).normalize();

        const moveVector = direction.clone().multiplyScalar(enemySpeed);
        const newPosition = enemy.position.clone().add(moveVector);

        const origin = new THREE.Vector3(
            enemy.position.x,
            enemy.position.y + 1,
            enemy.position.z
        );

        raycaster.set(origin, direction);
        raycaster.far = enemySpeed + 1;

        const intersections = raycaster.intersectObjects(mapRoot.children, true);
        const validIntersections = intersections.filter(int => {
            let obj = int.object;
            while (obj) {
                if (obj.userData && obj.userData.isGrass) return false;
                if (!obj.parent || obj.parent === scene) break;
                obj = obj.parent;
            }
            return true;
        });

        if (validIntersections.length === 0) {
            enemy.position.copy(newPosition);
        } else {
            const right = new THREE.Vector3(-direction.z, 0, direction.x);
            const leftMove = direction.clone().add(right.clone().multiplyScalar(-0.5)).normalize().multiplyScalar(enemySpeed);
            const rightMove = direction.clone().add(right.clone().multiplyScalar(0.5)).normalize().multiplyScalar(enemySpeed);

            raycaster.set(origin, leftMove.clone().normalize());
            raycaster.far = enemySpeed + 1;
            const leftIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => {
                let obj = int.object;
                while (obj) {
                    if (obj.userData && obj.userData.isGrass) return false;
                    if (!obj.parent || obj.parent === scene) break;
                    obj = obj.parent;
                }
                return true;
            });

            raycaster.set(origin, rightMove.clone().normalize());
            raycaster.far = enemySpeed + 1;
            const rightIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => {
                let obj = int.object;
                while (obj) {
                    if (obj.userData && obj.userData.isGrass) return false;
                    if (!obj.parent || obj.parent === scene) break;
                    obj = obj.parent;
                }
                return true;
            });

            if (leftIntersections.length === 0) {
                enemy.position.add(leftMove);
            } else if (rightIntersections.length === 0) {
                enemy.position.add(rightMove);
            }
        }
    }

    enemy.lookAt(wolf.position);
}

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) {
        renderer.render(scene, camera);
        return;
    }

    if (gameOver) return;

    sunAngle += 0.0007;
    const r = 100;
    const sunX = Math.cos(sunAngle) * r;
    const sunY = Math.sin(sunAngle) * r;
    const sunZ = 0;

    sunMesh.position.set(sunX, sunY, sunZ);
    sunLight.position.copy(sunMesh.position);
    sunLight.target.position.set(0, 0, 0);
    sunLight.target.updateMatrixWorld();

    const moonX = Math.cos(sunAngle + Math.PI) * r;
    const moonY = Math.sin(sunAngle + Math.PI) * r;
    const moonZ = 0;

    moonMesh.position.set(moonX, moonY, moonZ);
    moonLight.position.copy(moonMesh.position);
    moonLight.target.position.set(0, 0, 0);
    moonLight.target.updateMatrixWorld();

    const dayProgress = (Math.sin(sunAngle) + 1) / 2;

    if (sunY > 0) {
        sunLight.intensity = 1.5 * dayProgress;
        moonLight.intensity = 0;
        scene.background = new THREE.Color().lerpColors(
            new THREE.Color(0x87ceeb),
            new THREE.Color(0xff6b35),
            1 - dayProgress
        );
    } else {
        sunLight.intensity = 0;
        moonLight.intensity = 0.3;
        scene.background = new THREE.Color(0x0a0a1a);
    }

    handleMovement();
    handleEnemy();

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (mixer) {
        mixer.update(delta);
    }

    if (chickenAnimationMixer) {
        chickenAnimationMixer.update(delta);
    }

    if (enemyMixer) {
        enemyMixer.update(delta);
    }

    mapRoot.children.forEach(child => {
        if (child.userData.animate) {
            child.userData.animate(time);
        }
    });

    if (params.cameraMode === 'Terceira Pessoa') {
        updateThirdPersonCamera();
    }

    renderer.render(scene, camera);
}
