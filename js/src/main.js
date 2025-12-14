import * as THREE from 'three';
import {
    onKeyDown, onKeyUp, updateThirdPersonCamera, startGame,
    params, gameOver, gameStarted, walkMode
} from './utils.js';
import {
    setupWorld, updateDayNightCycle, updateChickenAnimation, updateMapCustomAnimations,
    getMapRoot, getTargetPosition, getWallsData
} from './world.js';
import {
    loadWolf, loadDino, handleMovement, handleEnemy,
    updateCharacterAnimations, getWolf
} from './character.js';


let camera, scene, renderer;
let clock = new THREE.Clock();

export function init() {
    // --- Configuração Básica do THREE.js
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 5, 12);
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);

    // --- Menu de Seleção de Modo
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

    // Botão MODO NORMAL
    const normalButton = document.createElement('button');
    normalButton.textContent = 'MODO NORMAL';
    // ... estilos ... (mantidos do original)
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

    normalButton.addEventListener('mouseenter', () => { normalButton.style.backgroundColor = '#da190b'; });
    normalButton.addEventListener('mouseleave', () => { normalButton.style.backgroundColor = '#f44336'; });
    normalButton.addEventListener('click', () => {
        startGame(false, clock, menuContainer); // false para modo normal
        loadDino(scene, getWallsData(), getTargetPosition()); // Carrega o inimigo
    });

    // Botão MODO WALK
    const walkButton = document.createElement('button');
    walkButton.textContent = 'MODO WALK';
    // ... estilos ... (mantidos do original)
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

    walkButton.addEventListener('mouseenter', () => { walkButton.style.backgroundColor = '#45a049'; });
    walkButton.addEventListener('mouseleave', () => { walkButton.style.backgroundColor = '#4CAF50'; });
    walkButton.addEventListener('click', () => {
        startGame(true, clock, menuContainer); // true para modo walk
        // O inimigo NÃO é carregado no modo walk
    });

    menuContainer.appendChild(normalButton);
    menuContainer.appendChild(document.createElement('br'));
    menuContainer.appendChild(walkButton);
    document.body.appendChild(menuContainer);


    // --- Configuração do Mundo
    setupWorld(scene);

    // --- Carregamento do Personagem Principal
    loadWolf(scene, getWallsData(), getTargetPosition());

    // --- Event Listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // --- Início do Loop de Renderização
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) {
        renderer.render(scene, camera);
        return;
    }

    if (gameOver) return;

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    const wolf = getWolf();
    const mapRoot = getMapRoot();
    const targetPosition = getTargetPosition();

    // --- Lógica de Jogo
    updateDayNightCycle(scene, delta);
    handleMovement(targetPosition, mapRoot);
    if (!walkMode) {
        handleEnemy(mapRoot);
    }

    // --- Atualização de Animações
    updateCharacterAnimations(delta);
    updateChickenAnimation(delta);
    updateMapCustomAnimations(time);

    // --- Atualização da Câmera
    if (params.cameraMode === 'Terceira Pessoa' && wolf) {
        updateThirdPersonCamera(camera, wolf);
    }

    // --- Renderização
    renderer.render(scene, camera);
}
