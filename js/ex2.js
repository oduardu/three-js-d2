import * as THREE from 'three';
import { FBXLoader } from '../js/jsm/loaders/FBXLoader.js';
import { OrbitControls } from '../js/jsm/controls/OrbitControls.js';
import { GUI } from '../js/jsm/libs/lil-gui.module.min.js';

let camera, scene, renderer, controls, gui, minion, flash, flashLight;
let sunMesh, sunLight, sunTarget;
let sunAngle = 0;
let flashAnimTime = 0;
let startX = 20, startZ = 20;

export function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 15);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
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

    const loader = new FBXLoader();
    loader.setResourcePath('/assets/dust2/source/');
    loader.load(
        "/assets/dust2/source/Dust2.fbx",
        (fbx) => {
            let root = fbx.scene || fbx;

            root.scale.setScalar(1);
            root.rotation.y = -Math.PI / 2;

            root.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;

                    if (obj.material) {
                        obj.material.side = THREE.DoubleSide;
                    }
                }
            });

            scene.add(root);

            // const minLoader = new FBXLoader();
            // minLoader.load("/assets/Minion/FBX/Minion_FBX.fbx", (mf) => {
            //     minion = mf.scene || mf;
            //     minion.scale.setScalar(1);
            //     minion.position.set(0, 1, 0);

            //     minion.traverse(o => {
            //         if (o.isMesh) {
            //             o.castShadow = true;
            //             o.receiveShadow = true;
            //         }
            //     });

            //     scene.add(minion);
            // });


            const flashbangLoader = new FBXLoader();
            flashbangLoader.load("/assets/flashbang/flashbang_lowpoly.fbx", (flashLoader) => {
                flash = flashLoader.scene || flashLoader;

                const textureLoader = new THREE.TextureLoader();
                const albedo = textureLoader.load('/assets/flashbang/textures/flashbang_albedo.png');
                const normal = textureLoader.load('/assets/flashbang/textures/flashbang_normal.png');
                const mixmap = textureLoader.load('/assets/flashbang/textures/flashbang_mixmap.png');

                const roughnessTex = mixmap.clone();
                roughnessTex.channel = 1; // green channel for roughness

                const metalnessTex = mixmap.clone();
                metalnessTex.channel = 0; // red channel for metalness

                const aoTex = mixmap.clone();
                aoTex.channel = 2; // blue channel for ao

                flash.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                        o.material = new THREE.MeshStandardMaterial({
                            map: albedo,
                            normalMap: normal,
                            roughnessMap: roughnessTex,
                            metalnessMap: metalnessTex,
                            aoMap: aoTex
                        });
                    }
                });

                scene.add(flash);
                flash.visible = true;

                flashLight = new THREE.PointLight(0xffffff, 3, 100);
                flashLight.position.set(0, 3, 0);
                scene.add(flashLight);
            })
        }
    );

    function animate() {
        requestAnimationFrame(animate);
        sunAngle += 0.003;
        const r = 25;

        const x = Math.cos(sunAngle) * r;
        const z = Math.sin(sunAngle) * r;

        sunMesh.position.set(x, 18, z);
        sunLight.position.copy(sunMesh.position);

        sunTarget.position.set(0, 0, 0);
        sunLight.target.updateMatrixWorld();

        // Flashbang animation
        if (flash) {
            flashAnimTime += 0.01;
            const progress = flashAnimTime % 3; // loop every 3 units: 1 anim + 2 delay

            if (progress < 1) {
                // Animation phase
                if (progress < 0.01) {
                    // Randomize start position
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 20 + Math.random() * 10;
                    startX = Math.cos(angle) * dist;
                    startZ = Math.sin(angle) * dist;
                }
                const animProgress = progress;
                flash.visible = true;
                if (animProgress < 0.8) {
                    // Approach
                    const approachProgress = animProgress / 0.8;
                    flash.position.x = startX * (1 - approachProgress);
                    flash.position.z = startZ * (1 - approachProgress);
                    flash.position.y = 8;
                    flash.rotation.y += 0.2;
                    flash.rotation.x += 0.1;
                    flash.scale.setScalar(0.2);
                    flash.traverse(o => {
                        if (o.isMesh && o.material) {
                            o.material.opacity = 1;
                            o.material.transparent = false;
                        }
                    });
                    flashLight.intensity = 0;
                } else {
                    // Explosion
                    flash.position.set(0, 10, 0);
                    const explodeProgress = (animProgress - 0.8) / 0.2;
                    flash.scale.setScalar(0.2 + explodeProgress * 1);
                    flash.rotation.y += 0.4;
                    flash.rotation.x += 0.2;
                    if (explodeProgress > 0.9) {
                        flash.visible = false;
                    } else {
                        flash.traverse(o => {
                            if (o.isMesh && o.material) {
                                o.material.opacity = 1;
                                o.material.transparent = false;
                            }
                        });
                    }
                    // Light burst
                    const lightIntensity = Math.max(0, 1 - explodeProgress * 0.1) * 100;
                    flashLight.intensity = lightIntensity;
                }
            } else {
                // Delay phase
                flash.visible = false;
                flashLight.intensity = 0;
            }
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}
