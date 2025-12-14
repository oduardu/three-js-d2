import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import {
    moveSpeed, rotateSpeed, wolfHeight, gravity, groundCheckDistance,
    enemySpeed, winDistance, keys, params, raycaster,
    getValidSpawnPosition, showVictoryScreen, showGameOverScreen,
    walkMode, winConditionMet, gameOver
} from './utils.js';

let wolf, characterMesh, mixer, walkAction;
let enemy, enemyMixer, enemyWalkAction, enemyBiteAction;

export function loadWolf(scene, wallsData, targetPosition) {
    const loader = new FBXLoader();
    loader.load(
        "/assets/Wolf/Wolf.fbx",
        (object) => {
            wolf = new THREE.Group();
            characterMesh = object;
            wolf.add(characterMesh);

            const targetHeight = 1.5;
            const box = new THREE.Box3().setFromObject(characterMesh);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const scaleFactor = targetHeight / size.y;
            characterMesh.scale.setScalar(scaleFactor);
            const scaledBottomY = box.min.y * scaleFactor;
            characterMesh.position.x = -center.x * scaleFactor;
            characterMesh.position.z = -center.z * scaleFactor;
            characterMesh.position.y = -scaledBottomY;

            characterMesh.rotation.y = Math.PI;

            // Carregar Textura
            const texLoader = new THREE.TextureLoader();
            const wolfTexture = texLoader.load(
                "/assets/Wolf/textures/Wolf_Body.jpg",
                undefined, undefined, (err) => console.error("Error texture", err)
            );
            wolfTexture.colorSpace = THREE.SRGBColorSpace;

            characterMesh.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = new THREE.MeshStandardMaterial({
                        map: wolfTexture,
                        color: 0xffffff,
                        roughness: 0.5,
                        metalness: 0,
                    });
                }
            });

            // Animação
            if (characterMesh.animations && characterMesh.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterMesh);
                walkAction = mixer.clipAction(characterMesh.animations[0]);
            }

            // Posição Inicial
            const wolfSpawn = getValidSpawnPosition(wallsData, targetPosition, 10);
            wolf.position.copy(wolfSpawn);
            wolf.rotation.y = Math.PI; // Rotação inicial do grupo (Group)

            scene.add(wolf);
        },
        undefined,
        (error) => {
            console.error("Error loading Wolf:", error);
        }
    );
}

export function loadDino(scene, wallsData, targetPosition) {
    const dinoLoader = new FBXLoader();
    dinoLoader.load("assets/dino-hunter-deadly-shores-vicious/source/a_tyran_01.fbx", (dino) => {
        enemy = new THREE.Group();
        const dinoMesh = dino;
        enemy.add(dinoMesh);

        dinoMesh.scale.setScalar(1);
        dinoMesh.position.set(0, 0, 0);

        const enemySpawn = getValidSpawnPosition(wallsData, targetPosition, 15);
        enemy.position.copy(enemySpawn);

        // Textura e material
        const texLoader = new THREE.TextureLoader();
        const dinoTexture = texLoader.load(
            "/assets/dino-hunter-deadly-shores-vicious/textures/Screenshot_2025-11-13_160217.png",
            undefined, undefined, (err) => console.error("Error loading dino texture", err)
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

        // Animações
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

function checkHorizontalCollision(movementVector, mapRoot) {
    if (!wolf || !mapRoot) return false;

    const origin = new THREE.Vector3(
        wolf.position.x,
        wolf.position.y + wolfHeight / 2,
        wolf.position.z
    );

    const direction = movementVector.clone().applyQuaternion(wolf.quaternion).normalize();
    const checkDistance = moveSpeed + 0.5;

    raycaster.set(origin, direction);
    raycaster.far = checkDistance;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);

    for (let intersection of intersections) {
        let obj = intersection.object;
        let isCollisionTarget = true;

        while (obj) {
            if (obj.userData && obj.userData.isGrass) {
                isCollisionTarget = false;
                break;
            }
            if (!obj.parent || obj.parent === wolf.parent || obj.parent === wolf || obj.parent === enemy?.parent) {
                break;
            }
            obj = obj.parent;
        }

        if (isCollisionTarget) {
            return true;
        }
    }

    return false;
}

function checkVerticalCollision(mapRoot) {
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
            if (!obj.parent || obj.parent === wolf.parent || obj.parent === wolf || obj.parent === enemy?.parent) {
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

export function handleMovement(targetPosition, mapRoot) {
    if (!wolf || winConditionMet || gameOver) return;

    // Rotação
    if (keys.a) { wolf.rotation.y += rotateSpeed; }
    if (keys.d) { wolf.rotation.y -= rotateSpeed; }

    let moved = false;
    let deltaZ = 0;

    // Movimento para frente/trás
    if (keys.w) { deltaZ = -moveSpeed; moved = true; }
    if (keys.s) { deltaZ = moveSpeed; moved = true; }

    // Animação de Caminhada
    if (walkAction) {
        if (moved) {
            if (!walkAction.isRunning()) { walkAction.play(); }
        } else {
            if (walkAction.isRunning()) { walkAction.stop(); }
        }
    }

    if (moved) {
        const movementVector = new THREE.Vector3(0, 0, deltaZ);

        if (!checkHorizontalCollision(movementVector, mapRoot)) {
            movementVector.applyQuaternion(wolf.quaternion);
            const newPosition = wolf.position.clone().add(movementVector);

            const mapBoundary = 49;
            if (Math.abs(newPosition.x) < mapBoundary && Math.abs(newPosition.z) < mapBoundary) {
                wolf.position.add(movementVector);
            }
        }
    }

    // Gravidade/Colisão Vertical
    const deltaY = checkVerticalCollision(mapRoot);
    if (deltaY !== 0) {
        wolf.position.y += deltaY;
    }

    // Checagem de Vitória
    if (wolf.position.distanceTo(targetPosition) < winDistance) {
        if (!winConditionMet && !gameOver && !walkMode) {
            showVictoryScreen();
        }
    }
}

export function handleEnemy(mapRoot) {
    if (walkMode || !enemy || !wolf || gameOver || winConditionMet) {
        return;
    }

    const distance = enemy.position.distanceTo(wolf.position);
    const origin = new THREE.Vector3(enemy.position.x, enemy.position.y + 1, enemy.position.z);
    const direction = new THREE.Vector3().subVectors(wolf.position, enemy.position).normalize();

    // Ações de Animação
    const isClose = distance < 15.0;
    const currentSpeed = isClose ? enemySpeed * 0.5 : enemySpeed;

    if (distance < 5.0) { // Aumentar a chance de ataque quando bem perto
        if (enemyWalkAction && enemyWalkAction.isRunning()) enemyWalkAction.stop();
        if (enemyBiteAction && !enemyBiteAction.isRunning()) {
            enemyBiteAction.reset();
            enemyBiteAction.setLoop(THREE.LoopOnce); // LoopOnce para o ataque
            enemyBiteAction.play();
        }
    } else {
        if (enemyBiteAction && enemyBiteAction.isRunning()) {
             // Quando o ataque termina, volta para a caminhada
             if (enemyBiteAction.getEffectiveWeight() === 0) {
                enemyBiteAction.stop();
                if (enemyWalkAction && !enemyWalkAction.isRunning()) enemyWalkAction.play();
             }
        }
        if (!enemyBiteAction || !enemyBiteAction.isRunning()) {
            if (enemyWalkAction && !enemyWalkAction.isRunning()) enemyWalkAction.play();
        }
    }

    // Movimento
    const moveVector = direction.clone().multiplyScalar(currentSpeed);
    const newPosition = enemy.position.clone().add(moveVector);

    // Checagem de Colisão com Paredes para o Inimigo
    raycaster.set(origin, direction);
    raycaster.far = currentSpeed + 1;

    const intersections = raycaster.intersectObjects(mapRoot.children, true);
    const validIntersections = intersections.filter(int => {
        let obj = int.object;
        while (obj) {
            if (obj.userData && obj.userData.isGrass) return false;
            if (!obj.parent || obj.parent === mapRoot) break;
            obj = obj.parent;
        }
        return true;
    });

    if (validIntersections.length === 0) {
        enemy.position.copy(newPosition);
    } else {
        // Lógica de desvio simplificada: Inverte o movimento
        const right = new THREE.Vector3(-direction.z, 0, direction.x);
        const leftMove = direction.clone().add(right.clone().multiplyScalar(-0.5)).normalize().multiplyScalar(currentSpeed);
        const rightMove = direction.clone().add(right.clone().multiplyScalar(0.5)).normalize().multiplyScalar(currentSpeed);

        raycaster.set(origin, leftMove.clone().normalize());
        raycaster.far = currentSpeed + 1;
        const leftIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => !int.object.userData.isGrass);

        raycaster.set(origin, rightMove.clone().normalize());
        raycaster.far = currentSpeed + 1;
        const rightIntersections = raycaster.intersectObjects(mapRoot.children, true).filter(int => !int.object.userData.isGrass);

        if (leftIntersections.length === 0) {
            enemy.position.add(leftMove);
        } else if (rightIntersections.length === 0) {
            enemy.position.add(rightMove);
        }
    }

    // Orientação
    enemy.lookAt(wolf.position.x, enemy.position.y, wolf.position.z);

    // Checagem de Game Over
    if (distance < 2.0) {
        showGameOverScreen();
    }
}

export function updateCharacterAnimations(delta) {
    if (mixer) mixer.update(delta);
    if (enemyMixer) enemyMixer.update(delta);
}

export function getWolf() {
    return wolf;
}
