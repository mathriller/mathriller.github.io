/* global THREE */

class Renderer {
    constructor() {
        this.scenes = {};
        this.cameras = {};
        this.renderers = {};
        this.controls = {};
        this.voxelCache = {}; // Cache for O(1) lookup: sceneId -> Set("x,y,z")
        this.voxelMeshes = {}; // Map "x,y,z" -> Mesh for transparency access

        // Shared geometry and materials for performance
        this.boxGeometry = new THREE.BoxGeometry(100, 100, 100);
        this.edgesGeometry = new THREE.EdgesGeometry(this.boxGeometry); // Edges for outline
        this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

        this.materials = {
            'default': new THREE.MeshLambertMaterial({ color: 0xffcc00 }), // Yellow
            'black': new THREE.MeshLambertMaterial({ color: 0x202020 }),   // Black
            'red': new THREE.MeshLambertMaterial({ color: 0xff4444 }),     // Red
            'blue': new THREE.MeshLambertMaterial({ color: 0x4444ff }),    // Blue
        };

        // Texture loader
        this.textureLoader = new THREE.TextureLoader();
        this.turtleMaterials = {
            'right': this.createTurtleMaterial('res/turtler.png'),
            'left': this.createTurtleMaterial('res/turtlel.png'),
            'up': this.createTurtleMaterial('res/turtleu.png'),
            'down': this.createTurtleMaterial('res/turtled.png')
        };

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createTurtleMaterial(path) {
        const texture = this.textureLoader.load(path);
        return new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    }

    init(elementId, sceneId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Scene
        const scene = new THREE.Scene();
        // scene.background = new THREE.Color(0xffffff); // Removed to allow CSS background to show

        // Camera
        const width = element.clientWidth;
        const height = element.clientHeight;
        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000000); // Increased far plane to 1M
        camera.position.set(500, 500, 500);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Enable alpha
        renderer.setSize(width, height);
        element.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x606060);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1, 0.75, 0.5).normalize();
        scene.add(directionalLight);

        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Store instances
        this.scenes[sceneId] = scene;
        this.cameras[sceneId] = camera;
        this.renderers[sceneId] = renderer;
        this.controls[sceneId] = controls;
        this.voxelCache[sceneId] = new Set();
        this.voxelMeshes[sceneId] = {};

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
    }

    onWindowResize() {
        Object.keys(this.renderers).forEach(sceneId => {
            const element = document.getElementById(sceneId);
            if (element) {
                const width = element.clientWidth;
                const height = element.clientHeight;
                const renderer = this.renderers[sceneId];
                const camera = this.cameras[sceneId];

                if (renderer && camera) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                }
            }
        });
    }

    clear(sceneId) {
        const scene = this.scenes[sceneId];
        if (!scene) return;

        // Remove all meshes except lights
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            // Remove Meshes (voxels) and Lines (edges)
            if (obj.type === 'Mesh' || obj.type === 'LineSegments') {
                scene.remove(obj);
            }
        }

        // Clear cache
        if (this.voxelCache[sceneId]) {
            this.voxelCache[sceneId].clear();
        }
        if (this.voxelMeshes[sceneId]) {
            this.voxelMeshes[sceneId] = {};
        }
    }

    addVoxel(sceneId, x, y, z, config) {
        const scene = this.scenes[sceneId];
        if (!scene) return;

        let material;

        if (config.type === 'turtle') {
            material = this.turtleMaterials[config.orientation] || this.materials['default'];
        } else if (config.color === 'black') {
            material = this.materials['black'];
        } else if (config.color === 'red') {
            material = this.materials['red'];
        } else if (config.color === 'blue') {
            material = this.materials['blue'];
        } else {
            material = this.materials['default'];
        }

        const mesh = new THREE.Mesh(this.boxGeometry, material);
        mesh.position.set(x, y, z);

        // Add edges for better visibility
        // Don't add edges to turtle marker to keep it clean
        if (config.type !== 'turtle') {
            const edges = new THREE.LineSegments(this.edgesGeometry, this.edgeMaterial);
            // Scale edges slightly to prevent z-fighting with faces
            edges.scale.set(1.001, 1.001, 1.001);
            mesh.add(edges);
        }

        scene.add(mesh);

        // Add to cache
        const key = `${x},${y},${z}`;
        if (this.voxelCache[sceneId]) {
            this.voxelCache[sceneId].add(key);
        }
        // Store mesh for later access (transparency)
        if (this.voxelMeshes[sceneId]) {
            this.voxelMeshes[sceneId][key] = mesh;
        }
    }

    addSurfaceTurtle(sceneId, x, y, z, orientation) {
        const scene = this.scenes[sceneId];
        if (!scene) return;

        // 1. Find the existing voxel at this position and make it transparent
        const key = `${x},${y},${z}`;
        if (this.voxelMeshes[sceneId] && this.voxelMeshes[sceneId][key]) {
            const voxelMesh = this.voxelMeshes[sceneId][key];

            // Clone material to avoid affecting other voxels sharing the same material
            const newMaterial = voxelMesh.material.clone();
            newMaterial.transparent = true;
            newMaterial.opacity = 0.5;
            voxelMesh.material = newMaterial;
        }

        // 2. Draw Cone Marker INSIDE the voxel
        // Use a ConeGeometry to represent the turtle (Triangle shape)
        // Radius 25, Height 60, RadialSegments 32 (Slightly smaller radius to fit nicely)
        const geometry = new THREE.ConeGeometry(25, 60, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0x006400 }); // Dark Green
        const mesh = new THREE.Mesh(geometry, material);

        // Position at Center (x, y, z)
        mesh.position.set(x, y, z);

        // Rotate to match orientation
        // Default Cone points +Y (Up)
        switch (orientation) {
            case 'right': // Point +X
                mesh.rotation.z = -Math.PI / 2;
                break;
            case 'left': // Point -X
                mesh.rotation.z = Math.PI / 2;
                break;
            case 'up': // Point +Y (Default)
                // No rotation needed
                break;
            case 'down': // Point -Y
                mesh.rotation.z = Math.PI;
                break;
        }

        scene.add(mesh);
    }

    checkVoxel(sceneId, x, y, z) {
        if (this.voxelCache[sceneId]) {
            return this.voxelCache[sceneId].has(`${x},${y},${z}`);
        }
        return false;
    }

    setCamera(sceneId, minX, maxX, minY, maxY, minZ, maxZ) {
        const camera = this.cameras[sceneId];
        const controls = this.controls[sceneId];
        if (!camera || !controls) return;

        // Calculate center and size
        const centerX = (minX + maxX) * 100 / 2;
        // Turtle Z maps to Three Y
        const centerY = (minZ + maxZ) * 100 / 2;
        // Turtle Y maps to Three Z (inverted? or just Z)
        // In draw(): vz = -pos[1] * 100.
        // So minZ_Three = -maxY_Turtle * 100. maxZ_Three = -minY_Turtle * 100.
        const centerZ = ((-minY - maxY) * 100) / 2;

        controls.target.set(centerX, centerY, centerZ);

        // Zoom out to fit
        const sizeX = (maxX - minX) * 100;
        const sizeY = (maxZ - minZ) * 100; // This is Three Y (Turtle Z)
        const sizeZ = (maxY - minY) * 100; // This is Three Z (Turtle Y)

        // We need to fit all dimensions.
        // Top-Down view sees X and Y (Three coords).
        // So maxDim for FOV calculation depends on X and Y.
        // But if Z is huge (vertical tower), we need to make sure camera is far enough 
        // so it doesn't clip the front of the tower.

        const maxDim = Math.max(sizeX, sizeY);

        // Adjust distance for tighter fit
        // FOV 45 means tan(22.5) ~= 0.414
        // Distance needed ~= (maxDim / 2) / 0.414 ~= maxDim * 1.2
        // We add a small padding
        let distance = Math.max(maxDim * 2.5, 600); // Increased padding and min distance

        // Ensure distance is large enough to see the whole Z range (vertical)
        // Camera is at (centerX, centerY, distance).
        // Objects are between centerZ - sizeZ/2 and centerZ + sizeZ/2.
        // We need distance > centerZ + sizeZ/2 + padding.
        // Actually camera looks at centerZ.
        // So we need camera.z > max_object_z + padding.
        // max_object_z is roughly centerZ + sizeZ/2.

        const maxObjectZ = centerZ + sizeZ / 2;
        if (distance < maxObjectZ + 500) {
            distance = maxObjectZ + 1000;
        }

        // Position camera: Top-Down view (looking from Z axis)
        // This makes the X-Y plane (Turtle X-Z plane) appear flat and straight.
        camera.position.set(centerX, centerY, distance);

        // Update far plane if needed
        if (distance * 2 > camera.far) {
            camera.far = distance * 10;
            camera.updateProjectionMatrix();
        }

        controls.update();
    }
}

// Export instance
window.appRenderer = new Renderer();
