import * as THREE from 'three';
import { FBXLoader } from '../jsm/loaders/FBXLoader.js';

export const thirdPersonCamera = {
    distance: 2.5,
    height: 2.0,
    lookAtHeight: 1.0
};
export const moveSpeed = 0.2;
export const rotateSpeed = 0.05;
export const wolfHeight = 1.6;
export const gravity = -0.15;
export const groundCheckDistance = 10;
export const enemySpeed = 0.06;
export const winDistance = 2;

export let winConditionMet = false;
export let gameOver = false;
export let gameStarted = false;
export let walkMode = false;
export const keys = { w: false, a: false, s: false, d: false };
export const params = { cameraMode: 'Terceira Pessoa' };
export const raycaster = new THREE.Raycaster();

export function startGame(isWalkMode, clock, menuContainer) {
    walkMode = isWalkMode;
    gameStarted = true;
    menuContainer.remove();
    clock.start();
}

export function isPositionInsideWall(position, walls) {
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

export function getValidSpawnPosition(walls, excludePosition = null, minDistance = 10) {
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

export function showGameOverScreen() {
    gameOver = true;
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

export function showVictoryScreen() {
    winConditionMet = true;
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

// Inputs

export function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
}

export function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
}

export function updateThirdPersonCamera(camera, wolf) {
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
