import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { getValidSpawnPosition } from './utils.js';

let sunMesh, sunLight, sunTarget, moonMesh, moonLight;
let sunAngle = 0;
let mapRoot;
let chickenAnimationMixer, targetIndicator, targetPosition;

export const wallsData = [
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

export function setupWorld(scene) {
    // Posição do alvo (Frango Dourado)
    targetPosition = getValidSpawnPosition(wallsData);

    // Luz Ambiente
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const fill = new THREE.DirectionalLight(0xffffff, 0.2);
    fill.position.set(5, 8, 3);
    scene.add(fill);

    // Céu/Luzes Dinâmicas (Sol e Lua)
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

    // Map Root e Chão
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

    // Grama (InstancedMesh)
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

    // Adiciona a função de animação da grama ao userData
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

    // --- Paredes
    const wallTexLoader = new THREE.TextureLoader();
    const wallBaseColor = wallTexLoader.load("/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_BaseColor.png", (tex) => { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; });
    wallBaseColor.colorSpace = THREE.SRGBColorSpace;
    const wallNormal = wallTexLoader.load("/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_Normal.png", (tex) => { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; });
    const wallRoughness = wallTexLoader.load("/assets/wall-door-19mb/textures/Untitled_1_DefaultMaterial_Roughness.png", (tex) => { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; });

    wallsData.forEach(w => {
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

    // --- Objetivo (Frango Dourado)
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
                        const chickenAction = chickenAnimationMixer.clipAction(anim1.animations[0]);
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
            // Fallback
            const targetGeo = new THREE.SphereGeometry(1, 8, 8);
            const targetMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            targetIndicator = new THREE.Mesh(targetGeo, targetMat);
            targetIndicator.position.copy(targetPosition);
            scene.add(targetIndicator);
        }
    );
}

export function updateDayNightCycle(scene, delta) {
    sunAngle += 0.0007;
    const r = 100;
    const sunX = Math.cos(sunAngle) * r;
    const sunY = Math.sin(sunAngle) * r;
    const sunZ = 0;

    // Posição e Luz do Sol
    sunMesh.position.set(sunX, sunY, sunZ);
    sunLight.position.copy(sunMesh.position);
    sunLight.target.position.set(0, 0, 0);
    sunLight.target.updateMatrixWorld();

    // Posição e Luz da Lua
    const moonX = Math.cos(sunAngle + Math.PI) * r;
    const moonY = Math.sin(sunAngle + Math.PI) * r;
    const moonZ = 0;

    moonMesh.position.set(moonX, moonY, moonZ);
    moonLight.position.copy(moonMesh.position);
    moonLight.target.position.set(0, 0, 0);
    moonLight.target.updateMatrixWorld();

    // Intensidade da Luz e Cor de Fundo
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
}

export function updateChickenAnimation(delta) {
    if (chickenAnimationMixer) {
        chickenAnimationMixer.update(delta);
    }
}

export function updateMapCustomAnimations(time) {
    if (mapRoot) {
        mapRoot.children.forEach(child => {
            if (child.userData.animate) {
                child.userData.animate(time);
            }
        });
    }
}

export function getMapRoot() {
    return mapRoot;
}

export function getTargetPosition() {
    return targetPosition;
}

export function getWallsData() {
    return wallsData;
}
