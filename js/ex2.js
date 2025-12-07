import * as THREE from 'three';
import { FBXLoader } from '../js/jsm/loaders/FBXLoader.js';
import { OrbitControls } from '../js/jsm/controls/OrbitControls.js';
import { GUI } from '../js/jsm/libs/lil-gui.module.min.js';

let camera, scene, renderer, controls, gui, minion;
let sunMesh, sunLight, sunTarget;
let sunAngle = 0;

export function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 12);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
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
    loader.load(
        "/assets/dust2/source/Dust2.fbx",
        (fbx) => {
            let root = fbx.scene || fbx;

            root.scale.setScalar(0.1);
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

            const minLoader = new FBXLoader();
            minLoader.load("/assets/Minion/FBX/Minion_FBX.fbx", (mf) => {
                minion = mf.scene || mf;
                minion.scale.setScalar(0.01);
                minion.position.set(0, 1, 0);

                minion.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }
                });

                scene.add(minion);
            });
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

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}
