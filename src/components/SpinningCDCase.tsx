import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Album {
  image: string;
  name: string;
}

interface SpinningCDCaseProps {
  albums: Album[];
  width?: number;
  height?: number;
  sensitivity?: number;
  autoSpinSpeed?: number;
  tilt?: number;
}

export function SpinningCDCase({
  albums,
  width = 200,
  height = 180,
  sensitivity = 0.5,
  autoSpinSpeed = 0.3,
  tilt = 8,
}: SpinningCDCaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isDarkBackground] = useState(false);

  const rotation = useRef(0);
  const savedRotation = useRef(0);
  const velocity = useRef(autoSpinSpeed);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const lastZone = useRef(0);
  const imageIndex = useRef(0);
  const rafId = useRef<number>(0);
  const openProgress = useRef(0);
  const targetOpenProgress = useRef(0);
  const straightenProgress = useRef(0);
  const targetStraightenProgress = useRef(0);

  const isNavigating = useRef(false);
  const targetRotationValue = useRef(0);
  const lastInteractionTime = useRef(Date.now());
  const isResumingFromIdle = useRef(false);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    model: THREE.Group;
    raycaster: THREE.Raycaster;
    discMaterials: THREE.MeshStandardMaterial[];
    textures: THREE.Texture[];
    frontCover: THREE.Object3D | null;
    visibleMeshes: THREE.Mesh[];
  } | null>(null);

  const handleClose = useCallback(() => {
    targetOpenProgress.current = 0;
    targetStraightenProgress.current = 0;
    setIsOpen(false);
  }, []);

  const navigateToAlbum = useCallback((targetIndex: number) => {
    if (isOpen || !sceneRef.current) return;

    const len = albums.length;
    const currentIdx = ((imageIndex.current % len) + len) % len;
    if (targetIndex === currentIdx && !isNavigating.current) {
      if (straightenProgress.current < 0.01) {
        const normalizedRotation = ((rotation.current % 360) + 360) % 360;
        let targetRot;
        if (normalizedRotation <= 180) {
          targetRot = rotation.current - normalizedRotation;
        } else {
          targetRot = rotation.current + (360 - normalizedRotation);
        }

        isNavigating.current = true;
        targetRotationValue.current = targetRot;
        const direction = targetRot >= rotation.current ? 1 : -1;
        velocity.current = direction * 8;
        lastInteractionTime.current = Date.now();
      }
      return;
    }

    lastInteractionTime.current = Date.now();
    isResumingFromIdle.current = false;

    const { discMaterials, textures } = sceneRef.current;
    discMaterials.forEach((mat) => {
      mat.map = textures[targetIndex];
      mat.needsUpdate = true;
    });

    imageIndex.current = targetIndex;
    lastZone.current = Math.floor((rotation.current + 90) / 180);
    setCurrentAlbumIndex(targetIndex);

    if (straightenProgress.current > 0.01) {
      rotation.current = 0;
      savedRotation.current = 0;
      straightenProgress.current = 0;
      targetStraightenProgress.current = 0;
    }

    isNavigating.current = true;
    targetRotationValue.current = rotation.current + 720;
    velocity.current = 15;
  }, [albums.length, isOpen]);

  useEffect(() => {
    if (!containerRef.current || albums.length === 0) return;

    const container = containerRef.current;
    const containerSize = Math.max(width, height) * 3.5;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerSize, containerSize);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Lighting for shiny plastic look with strong specular highlights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(-3, 2, -4);
    scene.add(backLight);

    // Point light for specular highlights on edges
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 500);
    pointLight.position.set(0, 100, 200);
    scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-5, 0, -3);
    scene.add(rimLight);

    // Additional highlight from top
    const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // Front light for more reflections
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    // Side light for edge highlights
    const sideLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sideLight.position.set(8, 3, 2);
    scene.add(sideLight);

    const raycaster = new THREE.Raycaster();

    let model: THREE.Group | null = null;
    let frontCover: THREE.Object3D | null = null;
    let discMaterials: THREE.MeshStandardMaterial[] = [];
    let textures: THREE.Texture[] = [];
    let animationStarted = false;

    // Load GLB model
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    // Load textures first
    const texturePromises = albums.map(
      (album) =>
        new Promise<THREE.Texture>((resolve) => {
          textureLoader.load(album.image, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            resolve(tex);
          });
        }),
    );

    Promise.all([
      new Promise<THREE.Group>((resolve, reject) => {
        gltfLoader.load(
          "/cd_jewelcase_double.glb",
          (gltf) => resolve(gltf.scene),
          undefined,
          reject,
        );
      }),
      Promise.all(texturePromises),
    ])
      .then(([loadedModel, loadedTextures]) => {
        model = loadedModel;
        textures = loadedTextures;

        // Find all meshes and their sizes
        const meshes: { mesh: THREE.Mesh; size: number; name: string }[] = [];
        console.log("=== MODEL DEBUG ===");
        model.traverse((child) => {
          console.log(
            "Object:",
            child.name,
            "Type:",
            child.type,
            "Parent:",
            child.parent?.name,
          );
          if (child instanceof THREE.Mesh) {
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3()).length();
            meshes.push({ mesh: child, size, name: child.name });
            console.log("  -> MESH:", child.name, "size:", size);
          }
        });

        console.log("=== TOTAL MESHES:", meshes.length, "===");
        meshes.forEach((m, i) => {
          console.log(`Mesh ${i}: "${m.name}" size: ${m.size.toFixed(4)}`);
        });

        // Sort by size and hide the largest one (backdrop)
        meshes.sort((a, b) => b.size - a.size);
        if (meshes.length > 1) {
          console.log("Hiding largest mesh (backdrop):", meshes[0].name);
          meshes[0].mesh.visible = false;
        }

        // Get the CD case mesh (the smaller visible one)
        const cdCaseMesh = meshes.length > 1 ? meshes[1].mesh : meshes[0]?.mesh;

        // Center based on the CD case mesh only
        if (cdCaseMesh) {
          const box = new THREE.Box3().setFromObject(cdCaseMesh);
          const center = box.getCenter(new THREE.Vector3());
          // Move the entire model so the CD case is centered
          model.position.set(-center.x, -center.y, -center.z);
        }

        // Create a wrapper group to rotate around center
        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.scale.set(450, 450, 450);

        // Log the model structure to find mesh names
        console.log("Model structure:");

        // Make case meshes transparent and collect visible ones for raycasting
        const visibleMeshes: THREE.Mesh[] = [];
        model.traverse((child) => {
          // Find the front cover for hinge animation
          if (
            child.name.toLowerCase().includes("front") ||
            child.name.toLowerCase().includes("cover") ||
            child.name.toLowerCase().includes("lid")
          ) {
            frontCover = child;
            console.log("Found front cover:", child.name);
          }

          // Make case meshes transparent
          if (child instanceof THREE.Mesh && child.visible) {
            const mesh = child as THREE.Mesh;
            console.log("Making transparent:", child.name);
            visibleMeshes.push(mesh);

            // Create very translucent material with sharp edges and very high reflection
            const transparentMaterial = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.06,
              roughness: 0.0,
              metalness: 0.05,
              clearcoat: 1.0,
              clearcoatRoughness: 0.0,
              ior: 1.52,
              reflectivity: 1.0,
              specularIntensity: 5.0,
              specularColor: 0xffffff,
              sheen: 1.5,
              sheenRoughness: 0.0,
              sheenColor: 0xffffff,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            mesh.material = transparentMaterial;

            // Add sharp edge lines
            const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
            const edgeMaterial = new THREE.LineBasicMaterial({
              color: 0x999999,
              transparent: true,
              opacity: 0.4,
            });
            const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
            edgeLines.position.copy(mesh.position);
            edgeLines.rotation.copy(mesh.rotation);
            edgeLines.scale.copy(mesh.scale);
            mesh.parent?.add(edgeLines);
          }
        });
        console.log("Visible meshes for raycasting:", visibleMeshes.length);

        // Calculate the center and size of the case to place the CD
        if (cdCaseMesh) {
          const caseBox = new THREE.Box3().setFromObject(cdCaseMesh);
          const caseCenter = caseBox.getCenter(new THREE.Vector3());
          const caseSize = caseBox.getSize(new THREE.Vector3());

          // Create CD disc (with center hole)
          // Tweak these values to adjust:
          // - discRadiusMultiplier: 0.45 (increase to make CD larger, decrease to make smaller)
          // - holeRadiusMultiplier: 0.08 (increase for bigger hole, decrease for smaller)
          // - discOffsetX: -0.01 (negative = left, positive = right)
          const discRadiusMultiplier = 0.43;
          const holeRadiusMultiplier = 0.2;
          const discOffsetX = 0.04;

          const discRadius =
            Math.min(caseSize.x, caseSize.y) * discRadiusMultiplier;
          const holeRadius = discRadius * holeRadiusMultiplier;

          // Create thick CD disc with hole
          const discThickness = 0.002;
          const discGeometry = new THREE.RingGeometry(
            holeRadius,
            discRadius,
            64,
          );
          const discMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.FrontSide,
            map: textures[0],
          });
          discMaterials.push(
            discMaterial as unknown as THREE.MeshStandardMaterial,
          );

          // Front face of disc
          const discFront = new THREE.Mesh(discGeometry, discMaterial);
          discFront.position.copy(caseCenter);
          discFront.position.x += caseSize.x * discOffsetX;
          discFront.position.z += discThickness / 2;
          model.add(discFront);
          visibleMeshes.push(discFront);

          // Back face of disc (also shows album image)
          const discBackMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.FrontSide,
            map: textures[0],
          });
          discMaterials.push(
            discBackMaterial as unknown as THREE.MeshStandardMaterial,
          );
          const discBack = new THREE.Mesh(
            discGeometry.clone(),
            discBackMaterial,
          );
          discBack.position.copy(caseCenter);
          discBack.position.x += caseSize.x * discOffsetX;
          discBack.position.z -= discThickness / 2;
          discBack.rotation.y = Math.PI;
          model.add(discBack);

          // Edge ring for thickness
          const edgeGeometry = new THREE.CylinderGeometry(
            discRadius,
            discRadius,
            discThickness,
            64,
            1,
            true,
          );
          const edgeMat = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            side: THREE.DoubleSide,
          });
          const discEdge = new THREE.Mesh(edgeGeometry, edgeMat);
          discEdge.position.copy(caseCenter);
          discEdge.position.x += caseSize.x * discOffsetX;
          discEdge.rotation.x = Math.PI / 2;
          model.add(discEdge);

          // Add center hole ring (dark) on front
          const holeGeometry = new THREE.RingGeometry(
            holeRadius * 0.3,
            holeRadius,
            32,
          );
          const holeMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.DoubleSide,
          });
          const hole = new THREE.Mesh(holeGeometry, holeMaterial);
          hole.position.copy(discFront.position);
          hole.position.z += 0.001;
          model.add(hole);

          // Very translucent material for covers with sharp edges and very high reflection
          const clearPlasticMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.06,
            roughness: 0.0,
            metalness: 0.05,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            ior: 1.52,
            reflectivity: 1.0,
            specularIntensity: 5.0,
            specularColor: 0xffffff,
            sheen: 1.5,
            sheenRoughness: 0.0,
            sheenColor: 0xffffff,
            side: THREE.DoubleSide,
            depthWrite: false,
          });

          // Edge material for covers
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.5,
          });

          // Create back cover (the base that holds the CD)
          const backCoverGeom = new THREE.BoxGeometry(
            caseSize.x,
            caseSize.y,
            caseSize.z * 0.08,
          );
          const backCoverMesh = new THREE.Mesh(
            backCoverGeom,
            clearPlasticMat.clone(),
          );
          backCoverMesh.position.copy(caseCenter);
          backCoverMesh.position.z -= caseSize.z * 0.3;
          model.add(backCoverMesh);
          visibleMeshes.push(backCoverMesh);

          // Add edges to back cover
          const backEdges = new THREE.EdgesGeometry(backCoverGeom, 1);
          const backEdgeLines = new THREE.LineSegments(
            backEdges,
            edgeMaterial.clone(),
          );
          backEdgeLines.position.copy(backCoverMesh.position);
          model.add(backEdgeLines);

          // Create front cover that can swing open
          const frontCoverGeom = new THREE.BoxGeometry(
            caseSize.x,
            caseSize.y,
            caseSize.z * 0.05,
          );

          // Create a pivot group for the hinge effect
          const frontCoverPivot = new THREE.Group();
          frontCoverPivot.position.set(
            caseCenter.x - caseSize.x / 2,
            caseCenter.y,
            caseCenter.z + caseSize.z * 0.3,
          );

          const frontCoverMesh = new THREE.Mesh(
            frontCoverGeom,
            clearPlasticMat.clone(),
          );
          frontCoverMesh.position.set(caseSize.x / 2, 0, 0);
          frontCoverPivot.add(frontCoverMesh);

          // Add edges to front cover
          const frontEdges = new THREE.EdgesGeometry(frontCoverGeom, 1);
          const frontEdgeLines = new THREE.LineSegments(
            frontEdges,
            edgeMaterial.clone(),
          );
          frontEdgeLines.position.set(caseSize.x / 2, 0, 0);
          frontCoverPivot.add(frontEdgeLines);

          model.add(frontCoverPivot);

          frontCover = frontCoverPivot;
          visibleMeshes.push(frontCoverMesh);
        }

        // Use wrapper as the main model reference
        model = wrapper;

        // Apply initial tilt
        model.rotation.z = (tilt * Math.PI) / 180;
        scene.add(model);

        // Update matrices so raycasting works correctly
        model.updateMatrixWorld(true);

        sceneRef.current = {
          scene,
          camera,
          renderer,
          model,
          raycaster,
          discMaterials,
          textures,
          frontCover,
          visibleMeshes,
        };

        animationStarted = true;
      })
      .catch((error) => {
        console.error("Error loading model:", error);
      });

    const animate = () => {
      if (!animationStarted || !model) {
        rafId.current = requestAnimationFrame(animate);
        return;
      }

      // Animate open/close
      const openDiff = targetOpenProgress.current - openProgress.current;
      if (Math.abs(openDiff) > 0.001) {
        openProgress.current += openDiff * 0.08;
      } else {
        openProgress.current = targetOpenProgress.current;
      }

      // Animate straighten
      const straightenDiff =
        targetStraightenProgress.current - straightenProgress.current;
      if (Math.abs(straightenDiff) > 0.001) {
        straightenProgress.current += straightenDiff * 0.08;
      } else {
        straightenProgress.current = targetStraightenProgress.current;
      }

      // Apply hinge rotation to front cover if found (open flat at 180 degrees)
      if (frontCover) {
        frontCover.rotation.y = -openProgress.current * Math.PI;
      }

      // Scale down when opened and shift right to center the opened case
      const openScale = 1 - openProgress.current * 0.15;
      model.scale.set(400 * openScale, 400 * openScale, 400 * openScale);
      model.position.x = openProgress.current * 65; // Increased to prevent left lid cutoff

      // Keep CD straight when opened
      const bookTiltX = 0;
      const bookTiltZ = 0;

      // When opening/straightening, interpolate rotation and tilt to 0
      const currentTilt = tilt * (1 - straightenProgress.current);

      if (straightenProgress.current < 0.01) {
        if (!isDragging.current) {
          if (isNavigating.current) {
            const targetRot = targetRotationValue.current;
            const rotDiff = targetRot - rotation.current;

            if (Math.abs(rotDiff) < 10) {
              rotation.current = 0;
              savedRotation.current = 0;
              velocity.current = 0;
              isNavigating.current = false;
              targetStraightenProgress.current = 1;
              lastInteractionTime.current = Date.now();
              lastZone.current = 0;
            } else {
              velocity.current *= 0.96;
              if (Math.abs(velocity.current) < 2) {
                velocity.current = velocity.current >= 0 ? 2 : -2;
              }
              rotation.current += velocity.current;
            }
          } else if (isResumingFromIdle.current) {
            if (velocity.current === 0) {
              lastZone.current = Math.floor((rotation.current + 90) / 180);
            }
            rotation.current += velocity.current;
            velocity.current += (autoSpinSpeed - velocity.current) * 0.05;
            if (Math.abs(velocity.current - autoSpinSpeed) < 0.01) {
              velocity.current = autoSpinSpeed;
              isResumingFromIdle.current = false;
              lastZone.current = Math.floor((rotation.current + 90) / 180);
            }
          } else {
            rotation.current += velocity.current;

            const target = autoSpinSpeed;
            if (Math.abs(velocity.current) > Math.abs(target)) {
              velocity.current *= 0.98;
            } else {
              velocity.current += (target - velocity.current) * 0.02;
            }

            const currentZone = Math.floor((rotation.current + 90) / 180);
            if (currentZone !== lastZone.current) {
              const direction = currentZone > lastZone.current ? 1 : -1;
              imageIndex.current += direction;

              const len = textures.length;
              const texIdx = ((imageIndex.current % len) + len) % len;

              lastZone.current = currentZone;
              discMaterials.forEach((mat) => {
                mat.map = textures[texIdx];
                mat.needsUpdate = true;
              });
              setCurrentAlbumIndex(texIdx);
            }
          }
        }

        savedRotation.current = rotation.current;

        const rotRad = (rotation.current * Math.PI) / 180;
        const tiltRad = (currentTilt * Math.PI) / 180;
        model.rotation.set(bookTiltX, rotRad, tiltRad - bookTiltZ);
      } else {
        const now = Date.now();
        if (now - lastInteractionTime.current > 5000 && openProgress.current < 0.01) {
          rotation.current = 0;
          savedRotation.current = 0;
          targetStraightenProgress.current = 0;
          velocity.current = 0;
          isResumingFromIdle.current = true;
        }
        const currentRotation =
          savedRotation.current * (1 - straightenProgress.current);
        const rotRad = (currentRotation * Math.PI) / 180;
        const tiltRad = (currentTilt * Math.PI) / 180;
        model.rotation.set(bookTiltX, rotRad, tiltRad - bookTiltZ);
      }

      // Update world matrices for raycasting
      model.updateMatrixWorld(true);

      renderer.render(scene, camera);
      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId.current);
      renderer.dispose();
      textures.forEach((t) => t.dispose());
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [albums, width, height, autoSpinSpeed, tilt]);

  const pointerIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isOpen) return;

    // Check if we're hovering over a visible mesh
    const rect = e.currentTarget.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (sceneRef.current) {
      const { raycaster, camera, visibleMeshes } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      // Only check against visible meshes, not the whole model
      let hit = false;
      for (const mesh of visibleMeshes) {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          hit = true;
          break;
        }
      }

      if (hit) {
        isDragging.current = true;
        hasDragged.current = false;
        startX.current = e.clientX;
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || isOpen) return;

    const deltaX = e.clientX - startX.current;
    if (Math.abs(deltaX) > 3) {
      hasDragged.current = true;
    }
    rotation.current += deltaX * sensitivity;
    startX.current = e.clientX;
    velocity.current = deltaX * sensitivity;
    lastInteractionTime.current = Date.now();
    isNavigating.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    if (pointerIdRef.current !== null) {
      e.currentTarget.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
  };

  const handleLostPointerCapture = () => {
    isDragging.current = false;
    pointerIdRef.current = null;
  };

  const handleHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isOpen || isDragging.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (sceneRef.current) {
      const { raycaster, camera, visibleMeshes } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      let hit = false;
      for (const mesh of visibleMeshes) {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          hit = true;
          break;
        }
      }
      setIsHovering(hit);
    }
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDragged.current || isOpen) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (sceneRef.current) {
      const { raycaster, camera, visibleMeshes } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      let hit = false;
      for (const mesh of visibleMeshes) {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          hit = true;
          break;
        }
      }

      if (hit) {
        rotation.current = 0;
        savedRotation.current = 0;
        velocity.current = 0;
        straightenProgress.current = 1;
        targetStraightenProgress.current = 1;
        lastZone.current = 0;

        setIsOpen(true);
        targetOpenProgress.current = 1;
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (sceneRef.current) {
      const { raycaster, camera, visibleMeshes } = sceneRef.current;
      raycaster.setFromCamera(mouse, camera);

      let hit = false;
      for (const mesh of visibleMeshes) {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          hit = true;
          break;
        }
      }

      if (!hit) {
        handleClose();
      }
    }
  };

  if (albums.length === 0) {
    return null;
  }

  const containerSize = Math.max(width, height) * 3.5;

  return (
    <div
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 8,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: containerSize,
          height: containerSize,
          cursor: isOpen ? "default" : isHovering ? "grab" : "default",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e);
          handleHover(e);
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerLeave={handlePointerLeave}
        onClick={isOpen ? handleContainerClick : handleClick}
      />
      {!isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
          }}
        >
          {albums.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToAlbum(index)}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: currentAlbumIndex === index ? "#666" : "#fff",
                boxShadow:
                  currentAlbumIndex === index
                    ? "none"
                    : "inset 0 0 0 1px #999",
              }}
              aria-label={`Go to album ${index + 1}`}
            />
          ))}
        </div>
      )}
      {isOpen && (
        <>
          <div
            style={{
              position: "absolute",
              left: 24,
              top: "50%",
              transform: "translateY(-50%)",
              color: isDarkBackground ? "#fff" : "#333",
              fontSize: 24,
              fontWeight: 600,
              maxWidth: 150,
              textAlign: "left",
            }}
          >
            {albums[currentAlbumIndex]?.name}
          </div>
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "8px 16px",
              background: isDarkBackground
                ? "rgba(255,255,255,0.2)"
                : "rgba(0,0,0,0.7)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );
}
