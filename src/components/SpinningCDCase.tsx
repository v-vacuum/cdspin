import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Album {
  image: string;
  name: string;
  artist?: string;
  year?: string | number;
  genre?: string;
  note?: string;
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
  const isDarkBackground = false;

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
  const ajarProgress = useRef(0);
  const targetAjarProgress = useRef(0);
  const ajarSoundPlayed = useRef(false);
  const hoverStraightenStarted = useRef(false);
  const popScale = useRef(1);
  const targetPopScale = useRef(1);
  const tiltUpProgress = useRef(0);
  const targetTiltUpProgress = useRef(0);

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

  const playClickSound = useCallback(() => {
    const audioContext = new AudioContext();

    const bufferSize = audioContext.sampleRate * 0.04;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.08));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.25;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(audioContext.destination);
    source.start();
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

    const targetRot = Math.round((rotation.current + 720) / 360) * 360;

    isNavigating.current = true;
    targetRotationValue.current = targetRot;
    const direction = targetRot >= rotation.current ? 1 : -1;
    velocity.current = direction * 15;
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(-3, 2, -4);
    scene.add(backLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 500);
    pointLight.position.set(0, 100, 200);
    scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-5, 0, -3);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    const sideLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sideLight.position.set(8, 3, 2);
    scene.add(sideLight);

    const raycaster = new THREE.Raycaster();

    let model: THREE.Group | null = null;
    let frontCover: THREE.Object3D | null = null;
    let discMaterials: THREE.MeshStandardMaterial[] = [];
    let textures: THREE.Texture[] = [];
    let animationStarted = false;

    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

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

        meshes.sort((a, b) => b.size - a.size);
        if (meshes.length > 1) {
          console.log("Hiding largest mesh (backdrop):", meshes[0].name);
          meshes[0].mesh.visible = false;
        }

        const cdCaseMesh = meshes.length > 1 ? meshes[1].mesh : meshes[0]?.mesh;

        if (cdCaseMesh) {
          const box = new THREE.Box3().setFromObject(cdCaseMesh);
          const center = box.getCenter(new THREE.Vector3());
          model.position.set(-center.x, -center.y, -center.z);
        }

        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.scale.set(450, 450, 450);

        console.log("Model structure:");

        const visibleMeshes: THREE.Mesh[] = [];
        model.traverse((child) => {
          if (
            child.name.toLowerCase().includes("front") ||
            child.name.toLowerCase().includes("cover") ||
            child.name.toLowerCase().includes("lid")
          ) {
            frontCover = child;
            console.log("Found front cover:", child.name);
          }

          if (child instanceof THREE.Mesh && child.visible) {
            const mesh = child as THREE.Mesh;
            console.log("Making transparent:", child.name);
            visibleMeshes.push(mesh);

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

        if (cdCaseMesh) {
          const caseBox = new THREE.Box3().setFromObject(cdCaseMesh);
          const caseCenter = caseBox.getCenter(new THREE.Vector3());
          const caseSize = caseBox.getSize(new THREE.Vector3());

          const discRadiusMultiplier = 0.43;
          const holeRadiusMultiplier = 0.2;
          const discOffsetX = 0.04;

          const discRadius =
            Math.min(caseSize.x, caseSize.y) * discRadiusMultiplier;
          const holeRadius = discRadius * holeRadiusMultiplier;

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

          const discFront = new THREE.Mesh(discGeometry, discMaterial);
          discFront.position.copy(caseCenter);
          discFront.position.x += caseSize.x * discOffsetX;
          discFront.position.z += discThickness / 2;
          model.add(discFront);
          visibleMeshes.push(discFront);

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

          const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.5,
          });

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

          const backEdges = new THREE.EdgesGeometry(backCoverGeom, 1);
          const backEdgeLines = new THREE.LineSegments(
            backEdges,
            edgeMaterial.clone(),
          );
          backEdgeLines.position.copy(backCoverMesh.position);
          model.add(backEdgeLines);

          const frontCoverGeom = new THREE.BoxGeometry(
            caseSize.x,
            caseSize.y,
            caseSize.z * 0.05,
          );

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

        model = wrapper;

        model.rotation.z = (tilt * Math.PI) / 180;
        scene.add(model);

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

      // Animate ajar
      const ajarDiff = targetAjarProgress.current - ajarProgress.current;
      if (Math.abs(ajarDiff) > 0.001) {
        ajarProgress.current += ajarDiff * 0.12;
      } else {
        ajarProgress.current = targetAjarProgress.current;
      }

      // Animate pop scale
      const popDiff = targetPopScale.current - popScale.current;
      if (Math.abs(popDiff) > 0.001) {
        popScale.current += popDiff * 0.15;
      } else {
        popScale.current = targetPopScale.current;
      }

      // Animate tilt up
      const tiltUpDiff = targetTiltUpProgress.current - tiltUpProgress.current;
      if (Math.abs(tiltUpDiff) > 0.001) {
        tiltUpProgress.current += tiltUpDiff * 0.1;
      } else {
        tiltUpProgress.current = targetTiltUpProgress.current;
      }

      // Trigger tilt-up when straightened and velocity near zero
      if (
        hoverStraightenStarted.current &&
        !isDragging.current &&
        openProgress.current < 0.01 &&
        straightenProgress.current > 0.95 &&
        Math.abs(velocity.current) < 0.15 &&
        targetTiltUpProgress.current < 0.5
      ) {
        targetTiltUpProgress.current = 1;
      }

      // Trigger ajar (with pop) when tilt-up is complete
      if (
        hoverStraightenStarted.current &&
        !isDragging.current &&
        openProgress.current < 0.01 &&
        tiltUpProgress.current > 0.9 &&
        targetAjarProgress.current < 0.5
      ) {
        targetAjarProgress.current = 1;
        targetPopScale.current = 1.03;
        setTimeout(() => {
          targetPopScale.current = 1;
        }, 50);

        if (!ajarSoundPlayed.current) {
          playClickSound();
          ajarSoundPlayed.current = true;
        }
      }

      // Apply hinge rotation to front cover
      if (frontCover) {
        const openAngle = -openProgress.current * Math.PI;
        const ajarAngle = -ajarProgress.current * 0.15;
        frontCover.rotation.y = openAngle + ajarAngle;
      }

      // Scale and position
      const openScale = 1 - openProgress.current * 0.15;
      const finalScale = 400 * openScale * popScale.current;
      model.scale.set(finalScale, finalScale, finalScale);
      model.position.x = openProgress.current * 65;

      const bookTiltZ = 0;

      // Tilt up slightly when hovering
      const tiltUpAngle = openProgress.current < 0.5 ? -tiltUpProgress.current * 0.12 : 0;
      const bookTiltX = tiltUpAngle;

      const currentTilt = tilt * (1 - straightenProgress.current);

      // Handle velocity and rotation
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
        // Handle hover straightening
        if (!isDragging.current && hoverStraightenStarted.current) {
          velocity.current *= 0.95;
          rotation.current += velocity.current;
        }

        // Check for idle timeout
        const now = Date.now();
        if (now - lastInteractionTime.current > 5000 && openProgress.current < 0.01 && !hoverStraightenStarted.current) {
          rotation.current = 0;
          savedRotation.current = 0;
          targetStraightenProgress.current = 0;
          velocity.current = 0;
          isResumingFromIdle.current = true;
        }

        savedRotation.current = rotation.current;

        // Straightening: interpolate rotation toward NEAREST front-facing position
        const nearestFront = Math.round(savedRotation.current / 180) * 180;
        const currentRotation =
          savedRotation.current + (nearestFront - savedRotation.current) * straightenProgress.current;
        const rotRad = (currentRotation * Math.PI) / 180;
        const tiltRad = (currentTilt * Math.PI) / 180;
        model.rotation.set(bookTiltX, rotRad, tiltRad - bookTiltZ);
      }

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
  }, [albums, width, height, autoSpinSpeed, tilt, playClickSound]);

  const pointerIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isOpen) return;

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
        isDragging.current = true;
        hasDragged.current = false;
        startX.current = e.clientX;
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);

        if (hoverStraightenStarted.current) {
          targetStraightenProgress.current = 0;
          targetAjarProgress.current = 0;
          targetTiltUpProgress.current = 0;
          ajarSoundPlayed.current = false;
        }
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

    if (isHovering && !isOpen) {
      targetStraightenProgress.current = 1;
      hoverStraightenStarted.current = true;
    }
  };

  const handleLostPointerCapture = () => {
    isDragging.current = false;
    pointerIdRef.current = null;

    if (isHovering && !isOpen) {
      targetStraightenProgress.current = 1;
      hoverStraightenStarted.current = true;
    }
  };

  const handleHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isOpen) return;

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

      const wasHovering = isHovering;
      setIsHovering(hit);

      if (hit && !wasHovering && !isDragging.current) {
        targetStraightenProgress.current = 1;
        hoverStraightenStarted.current = true;
      } else if (!hit && wasHovering && !isDragging.current) {
        if (straightenProgress.current > 0.1) {
          const nearestFront = Math.round(rotation.current / 180) * 180;
          rotation.current = nearestFront;
          savedRotation.current = nearestFront;
          lastZone.current = Math.floor((nearestFront + 90) / 180);
        }
        targetStraightenProgress.current = 0;
        targetAjarProgress.current = 0;
        targetTiltUpProgress.current = 0;
        ajarSoundPlayed.current = false;
        hoverStraightenStarted.current = false;
        targetPopScale.current = 1;
      }
    }
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
    if (!isOpen) {
      if (straightenProgress.current > 0.1) {
        const nearestFront = Math.round(rotation.current / 180) * 180;
        rotation.current = nearestFront;
        savedRotation.current = nearestFront;
        lastZone.current = Math.floor((nearestFront + 90) / 180);
      }
      targetStraightenProgress.current = 0;
      targetAjarProgress.current = 0;
      targetTiltUpProgress.current = 0;
      ajarSoundPlayed.current = false;
      hoverStraightenStarted.current = false;
      targetPopScale.current = 1;
    }
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

        ajarProgress.current = 0;
        targetAjarProgress.current = 0;
        tiltUpProgress.current = 0;
        targetTiltUpProgress.current = 0;
        hoverStraightenStarted.current = false;

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
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          opacity: isOpen ? 0 : 1,
          transition: "opacity 0.2s ease",
          pointerEvents: isOpen ? "none" : "auto",
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
      {isOpen && (
        <>
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}
          </style>
          <div
            style={{
              position: "absolute",
              left: 74,
              top: "50%",
              transform: "translateY(-50%)",
              color: isDarkBackground ? "#fff" : "#333",
              maxWidth: 200,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              animation: "fadeIn 0.4s ease-out 0.15s both",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {albums[currentAlbumIndex]?.name}
            </div>
            {albums[currentAlbumIndex]?.artist && (
              <div style={{ fontSize: 18 }}>
                {albums[currentAlbumIndex].artist}
              </div>
            )}
            {albums[currentAlbumIndex]?.note && (
              <div
                style={{
                  fontSize: 14,
                  fontStyle: "italic",
                  opacity: 0.8,
                  marginTop: 8,
                }}
              >
                "{albums[currentAlbumIndex].note}"
              </div>
            )}
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
