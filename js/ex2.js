import * as THREE from 'three';
import { FBXLoader } from '../js/jsm/loaders/FBXLoader.js';
import { OrbitControls } from '../js/jsm/controls/OrbitControls.js';

let camera, scene, renderer, controls, minion, flashModel, sunLight;
let clock;
let mapMeshes = [];
let minionVelocity = new THREE.Vector3();
let gravity = 50.0;
let sunAngle = 0;

let flashbangs = [];
let nextFlashTime = 0;

export function init() {
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000100); 
    scene.fog = new THREE.Fog(0x87CEEB, 200, 1000);

    clock = new THREE.Clock();

    
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 4000);
    camera.position.set(0, 100, 175);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 30, 0);
    controls.update();

    
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 1000;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    scene.add(sunLight);

    
    const loader = new FBXLoader();
    loader.load("/assets/dust2/source/Dust2.fbx", (fbx) => {
        fbx.scale.setScalar(3);
        fbx.rotation.y = -Math.PI / 2;

        fbx.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                if (obj.material) obj.material.side = THREE.DoubleSide;
                mapMeshes.push(obj);
            }
        });
        scene.add(fbx);
    });


    const minLoader = new FBXLoader();
    minLoader.load("/assets/Minion/FBX/Minion_FBX.fbx", (mf) => {
        minion = mf.scene || mf;
        minion.scale.setScalar(0.5);

        minion.position.set(0, 30, 0);

        minion.traverse(o => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                if (o.material) {
                    const materials = Array.isArray(o.material) ? o.material : [o.material];
                    materials.forEach(mat => {
                        if (mat.color) {
                            mat.color.set(0xffffff);
                            const name = mat.name ? mat.name.toLowerCase() : '';
                            if (name.includes('body') || name.includes('skin')) {
                                mat.color.set(0xFFFF00);
                                if (mat.emissive) mat.emissive.set(0x333300);
                            }
                        }
                    });
                }
            }
        });
        scene.add(minion);
    });

    const flashLoader = new FBXLoader();
    flashLoader.load("/assets/flashbang/flashbang_lowpoly.fbx", (obj) => {
        flashModel = obj;
        flashModel.scale.setScalar(0.5);
        flashModel.visible = false; 
        
        const tLoader = new THREE.TextureLoader();
        const albedo = tLoader.load('/assets/flashbang/textures/flashbang_albedo.png');
        const normal = tLoader.load('/assets/flashbang/textures/flashbang_normal.png');
        
        flashModel.traverse(m => {
            if(m.isMesh) {
                 m.material = new THREE.MeshStandardMaterial({
                     map: albedo,
                     normalMap: normal,
                     metalness: 0.8,
                     roughness: 0.2
                 });
            }
        });
        scene.add(flashModel);
    });

    animate();
}

function spawnFlashbang() {
    if (!flashModel) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 400;
    const height = 200;

    const startPos = new THREE.Vector3(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
    );

    const bang = flashModel.clone();
    bang.visible = true;
    bang.position.copy(startPos);

    const target = new THREE.Vector3(0, 10, 0);

    const distH = new THREE.Vector2(target.x - startPos.x, target.z - startPos.z).length();
    const speedH = 100;
    const tripTime = distH / speedH;

    const velX = (target.x - startPos.x) / tripTime;
    const velZ = (target.z - startPos.z) / tripTime;

    const velY = (target.y - startPos.y - 0.5 * (-gravity) * tripTime * tripTime) / tripTime;

    const velocity = new THREE.Vector3(velX, velY, velZ);

    const light = new THREE.PointLight(0xffffff, 0, 500);
    light.position.set(0, 10, 0);
    bang.add(light);

    scene.add(bang);

    flashbangs.push({
        mesh: bang,
        velocity: velocity,
        light: light,
        timer: tripTime,
        exploded: false,
        life: tripTime + 10.0
    });
}

function updateFlashbangs(dt) {
    for (let i = flashbangs.length - 1; i >= 0; i--) {
        const fb = flashbangs[i];

        if (!fb.exploded) {
            fb.velocity.y -= gravity * dt;

            const moveStep = fb.velocity.clone().multiplyScalar(dt);
            fb.mesh.position.add(moveStep);

            fb.mesh.rotation.x += 5 * dt;
            fb.mesh.rotation.z += 5 * dt;

            if (fb.mesh.position.y < 0) {
                fb.mesh.position.y = 0;
                fb.velocity.y *= -0.5;
                fb.velocity.x *= 0.7;
                fb.velocity.z *= 0.7;
            }
        }

        fb.timer -= dt;
        fb.life -= dt;

        if (fb.timer <= 0 && !fb.exploded) {
            fb.exploded = true;
            fb.light.intensity = 10000;
        }

        if (fb.exploded) {
             fb.light.intensity = THREE.MathUtils.lerp(fb.light.intensity, 0, dt * 0.8);
        }

        if (fb.life <= 0) {
            scene.remove(fb.mesh);
            flashbangs.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const dt = clock.getDelta();
    const now = clock.getElapsedTime();

    sunAngle += 0.05 * dt;
    const sunRadius = 400;
    sunLight.position.x = Math.cos(sunAngle) * sunRadius;
    sunLight.position.z = Math.sin(sunAngle) * sunRadius;
    sunLight.lookAt(0, 0, 0);
    
    if (minion) {
        minionVelocity.y -= gravity * dt;
        
        const potentialPos = minion.position.clone().add(minionVelocity.clone().multiplyScalar(dt));
        
        const rayStart = potentialPos.clone();
        rayStart.y += 50; 
        const raycaster = new THREE.Raycaster(rayStart, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(mapMeshes);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance < 55) {
                potentialPos.y = hit.point.y;
                minionVelocity.y = 0;
            }
        }
        
        if (potentialPos.y < -100) {
            potentialPos.set(0, 300, 0);
            minionVelocity.set(0, 0, 0);
        }

        minion.position.copy(potentialPos);
    }
    
    controls.update();
    
    if (now > nextFlashTime) {
        spawnFlashbang();
        nextFlashTime = now + 1.0 + Math.random() * 2; 
    }
    
    updateFlashbangs(dt);

    renderer.render(scene, camera);
}
