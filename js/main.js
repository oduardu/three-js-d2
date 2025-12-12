import * as THREE from 'three';
import { GUI } from './jsm/libs/lil-gui.module.min.js';
import { FBXLoader } from './jsm/loaders/FBXLoader.js';

let camera, scene, renderer, gui, minion, mapRoot;
let characterMesh;
let mixer, walkAction;
let clock = new THREE.Clock();
let sunMesh, sunLight, sunTarget;
let sunAngle = 0;
let winConditionMet = false;
let enemy;
let enemySpeed = 0.06;
let gameOver = false;

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

const thirdPersonCamera = {
    distance: 2.5,
    height: 2.0,
    lookAtHeight: 1.0
};

const moveSpeed = 0.1;
const rotateSpeed = 0.05;
const targetPosition = new THREE.Vector3(10, 1, -15);
const winDistance = 2;

const raycaster = new THREE.Raycaster();
const minionHeight = 1.6;
const raycastOffset = 0.3;
const gravity = -0.15;
const groundCheckDistance = 10;
const minionRadius = 0.5;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

function setupGUI() {
    gui = new GUI();

    gui.add(params, 'cameraMode', ['Primeira Pessoa', 'Terceira Pessoa'])
        .name('Modo de Câmera')
        .onChange(switchCamera);


}

function switchCamera(mode) {
    if (!minion) return;

    if (characterMesh) {
        if (mode === 'Primeira Pessoa') {
            characterMesh.visible = false;
        } else {
            characterMesh.visible = true;
        }
    }

    if (camera.parent) {
        camera.parent.remove(camera);
    }
    if (camera.parent !== scene) {
        scene.add(camera);
    }

    if (mode === 'Primeira Pessoa') {
        camera.position.set(0, minionHeight, 0);
        minion.add(camera);
        console.log("Câmera em Primeira Pessoa ativada.");
    } else {
        updateThirdPersonCamera();
        console.log("Câmera em Terceira Pessoa ativada.");
    }
}

function updateThirdPersonCamera() {
    if (!minion || params.cameraMode !== 'Terceira Pessoa') return;

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(minion.quaternion);

    const cameraPosition = new THREE.Vector3();
    cameraPosition.copy(minion.position);
    cameraPosition.addScaledVector(direction, thirdPersonCamera.distance);
    cameraPosition.y += thirdPersonCamera.height;

    camera.position.copy(cameraPosition);

    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.copy(minion.position);
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

    setupGUI();

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(5, 8, 3);
    scene.add(fill);

    const geo = new THREE.SphereGeometry(0.6, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    sunMesh = new THREE.Mesh(geo, mat);
    scene.add(sunMesh);

    sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 0);
    scene.add(sunTarget);

    sunLight = new THREE.SpotLight(0xffffff, 2, 200, Math.PI * 0.22, 0.4, 1);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.4;
    sunLight.target = sunTarget;
    scene.add(sunLight);

    targetPosition.copy(getRandomPosition());
    console.log("New Target Position:", targetPosition);

    const targetGeo = new THREE.SphereGeometry(1, 8, 8);
    const targetMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    const targetIndicator = new THREE.Mesh(targetGeo, targetMat);
    targetIndicator.position.copy(targetPosition);
    scene.add(targetIndicator);

    mapRoot = new THREE.Group();
    scene.add(mapRoot);

    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x808080,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mapRoot.add(ground);

    const wallHeight = 5;
    const wallThickness = 1;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        side: THREE.DoubleSide
    });

    const walls = [
        // x, y, z, width, height, depth
        [0, 2.5, -50, 100, 5, 1], // Norte
        [0, 2.5, 50, 100, 5, 1],  // Sul
        [-50, 2.5, 0, 1, 5, 100], // Oeste
        [50, 2.5, 0, 1, 5, 100],  // Leste
        [15, 2.5, 10, 10, 5, 1],  // Obstáculo 1
        [-10, 2.5, -15, 1, 5, 20] // Obstáculo 2
    ];

    walls.forEach(w => {
        const geo = new THREE.BoxGeometry(w[3], w[4], w[5]);
        const mesh = new THREE.Mesh(geo, wallMaterial);
        mesh.position.set(w[0], w[1], w[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mapRoot.add(mesh);
    });

    const loader = new FBXLoader();
    loader.load(
        "/assets/Wolf/Wolf.fbx",
        (object) => {
            console.log("Wolf Loaded Successfully");

            minion = new THREE.Group();
            characterMesh = object;
            minion.add(characterMesh);

            characterMesh.rotation.y = Math.PI;
            characterMesh.rotation.y = Math.PI;

            characterMesh.scale.setScalar(1);
            characterMesh.position.set(0, 0, 0);

            const box = new THREE.Box3().setFromObject(characterMesh);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            console.log("Original Size:", size);

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
                (tex) => console.log("Texture loaded"),
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

            scene.add(minion);
            switchCamera(params.cameraMode);

            const minionLoader = new FBXLoader();
            minionLoader.load("/assets/Minion/FBX/Minion_FBX.fbx", (mf) => {
                enemy = mf.scene || mf;
                enemy.scale.setScalar(0.08);

                const enemySpawn = getRandomPosition(minion.position, 15);
                enemy.position.copy(enemySpawn);

                enemy.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;

                        const tintRed = (mat) => {
                            if (mat && mat.color) {
                                mat.color.setHex(0xff0000);
                                if (mat.emissive) mat.emissive.setHex(0x550000);
                            }
                        };

                        if (Array.isArray(o.material)) {
                            o.material.forEach(tintRed);
                        } else {
                            tintRed(o.material);
                        }
                    }
                });

                scene.add(enemy);
                console.log("Enemy Spawned successfully at:", enemy.position);
            }, undefined, (err) => {
                console.error("Error loading Enemy Minion:", err);
            });
        },
        undefined,
        (error) => {
            console.error("Error loading Wolf:", error);
        }
    );

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

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
        minion.position.x,
        minion.position.y + minionHeight / 2,
        minion.position.z
    );

    const direction = movementVector.clone().applyQuaternion(minion.quaternion).normalize();
    const checkDistance = moveSpeed + 0.5; // Aumentado um pouco para evitar entrar na parede

    raycaster.set(origin, direction);
    raycaster.far = checkDistance;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);

    if (intersections.length > 0) {
        return true;
    }

    return false;
}

function checkVerticalCollision() {
    if (!minion || !mapRoot) return gravity;

    const origin = new THREE.Vector3(
        minion.position.x,
        minion.position.y + 1,
        minion.position.z
    );
    const direction = new THREE.Vector3(0, -1, 0);

    raycaster.set(origin, direction);
    raycaster.far = groundCheckDistance;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);

    if (intersections.length > 0) {
        const intersection = intersections[0];
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

    return gravity;
}


function handleMovement() {
    if (!minion || winConditionMet) return;

    if (keys.a) {
        minion.rotation.y += rotateSpeed;
    }
    if (keys.d) {
        minion.rotation.y -= rotateSpeed;
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
            movementVector.applyQuaternion(minion.quaternion);
            minion.position.add(movementVector);
        }
    }

    const deltaY = checkVerticalCollision();
    if (deltaY !== 0) {
        minion.position.y += deltaY;
    }
    if (minion.position.distanceTo(targetPosition) < winDistance) {
        if (!winConditionMet && !gameOver) {
            winConditionMet = true;
            alert("VITÓRIA! Destino alcançado!");
        }
    }
}

function handleEnemy() {
    if (!enemy || !minion || gameOver || winConditionMet) return;

    const direction = new THREE.Vector3();
    direction.subVectors(minion.position, enemy.position).normalize();

    const moveVector = direction.clone().multiplyScalar(enemySpeed);
    enemy.position.add(moveVector);

    enemy.lookAt(minion.position);

    const distance = enemy.position.distanceTo(minion.position);
    if (distance < 1.0) {
        gameOver = true;
        alert("GAME OVER! O Minion te pegou!");
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameOver) return;

    sunAngle += 0.003;
    const r = 25;
    const x = Math.cos(sunAngle) * r;
    const z = Math.sin(sunAngle) * r;

    sunMesh.position.set(x, 18, z);
    sunLight.position.copy(sunMesh.position);

    sunTarget.position.set(0, 0, 0);
    sunLight.target.updateMatrixWorld();

    handleMovement();
    handleEnemy();

    if (mixer) {
        mixer.update(clock.getDelta());
    }

    if (params.cameraMode === 'Terceira Pessoa') {
        updateThirdPersonCamera();
    }

    renderer.render(scene, camera);
}
