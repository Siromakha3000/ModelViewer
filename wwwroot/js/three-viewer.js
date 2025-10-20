// Three.js Viewer
let scene, camera, renderer, controls, currentMesh = null;
let wireframeMode = false;  // Start with solid materials by default

class ThreeJSViewer {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f7fa);

        // Camera setup
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 5;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        // Ensure container has our canvas
        if (!this.container.contains(this.renderer.domElement)) {
            this.container.appendChild(this.renderer.domElement);
        }

        // Controls setup - OrbitControls is attached to THREE after the script loads
        if (!THREE.OrbitControls) {
            throw new Error('OrbitControls not found. Make sure all Three.js scripts are loaded properly.');
        }
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.autoRotate = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lighting setup
        this.setupLighting();

        // Animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, 5, 5);
        this.scene.add(pointLight);
    }

    loadGLB(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    this.addMesh(gltf.scene);
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    console.error('Error loading GLB:', error);
                    reject(error);
                }
            );
        });
    }

    loadGLTF(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    this.addMesh(gltf.scene);
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    console.error('Error loading GLTF:', error);
                    reject(error);
                }
            );
        });
    }

    loadOBJ(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.OBJLoader();
            loader.load(
                url,
                (object) => {
                    // Apply material to OBJ
                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material = new THREE.MeshPhongMaterial({
                                color: 0x667eea,
                                specular: 0x111111,
                                shininess: 200
                            });
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.addMesh(object);
                    resolve(object);
                },
                undefined,
                (error) => {
                    console.error('Error loading OBJ:', error);
                    reject(error);
                }
            );
        });
    }

    loadSTL(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(
                url,
                (geometry) => {
                    geometry.computeVertexNormals();
                    geometry.center();

                    const material = new THREE.MeshPhongMaterial({
                        color: 0x764ba2,
                        specular: 0x111111,
                        shininess: 200
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    this.addMesh(mesh);
                    resolve(mesh);
                },
                undefined,
                (error) => {
                    console.error('Error loading STL:', error);
                    reject(error);
                }
            );
        });
    }

    addMesh(object) {
        // Remove previous mesh
        if (currentMesh) {
            this.scene.remove(currentMesh);
        }

        // Add new mesh
        this.scene.add(object);
        currentMesh = object;

        // Apply material flags to all meshes
        object.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                // Apply wireframe material
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            mat.wireframe = wireframeMode;
                            mat.transparent = false;
                            mat.opacity = 1;
                        });
                    } else {
                        node.material.wireframe = wireframeMode;
                        node.material.transparent = false;
                        node.material.opacity = 1;
                    }
                }
            }
        });

        // Center and scale the object
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;

        object.position.sub(center);
        object.scale.multiplyScalar(scale);

        // Ensure our canvas is attached (in case outer code removed children)
        if (!this.container.contains(this.renderer.domElement)) {
            this.container.appendChild(this.renderer.domElement);
        }

        // Remove loading state if present
        this.container.classList.remove('loading');
        const spinner = this.container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }

        // Update camera to fit the model in the view
        this.fitToFrame();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    resetView() {
        this.fitToFrame();
    }

    fitToFrame() {
        if (currentMesh) {
            const box = new THREE.Box3().setFromObject(currentMesh);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const center = box.getCenter(new THREE.Vector3());

            // Calculate distance needed to fit model in view
            const distance = maxDim / (2 * Math.tan(Math.PI * this.camera.fov / 360));

            // Position camera to view the entire model
            this.camera.position.set(
                center.x + distance * 0.6,
                center.y + distance * 0.6,
                center.z + distance * 0.8
            );
            this.camera.lookAt(center);
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    toggleWireframe() {
        wireframeMode = !wireframeMode;
        if (currentMesh) {
            currentMesh.traverse((node) => {
                if (node.isMesh && node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            mat.wireframe = wireframeMode;
                        });
                    } else {
                        node.material.wireframe = wireframeMode;
                    }
                }
            });
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().catch((err) => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Initialize viewer when DOM is ready
let viewer;
document.addEventListener('DOMContentLoaded', () => {
    const previewElement = document.getElementById('modelPreview');
    viewer = new ThreeJSViewer(previewElement);

    // Setup control buttons
    const fitBtn = document.getElementById('fitViewBtn');
    const wireframeBtn = document.getElementById('wireframeBtn');
    const resetBtn = document.getElementById('resetViewBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (fitBtn) {
        fitBtn.addEventListener('click', () => {
            viewer.fitToFrame();
        });
    }
    
    if (wireframeBtn) {
        wireframeBtn.addEventListener('click', () => {
            viewer.toggleWireframe();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            viewer.resetView();
        });
    }
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            viewer.toggleFullscreen();
        });
    }
});
