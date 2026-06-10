/**
 * React Three Fiber 3D stair scene — mirrors the HTML buildStairMesh exactly.
 * Scale: cm → meters via scale = 0.01
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GEOMETRY_CONFIG } from '../constants/geometryConfig';

interface StairSceneProps {
  rise: number;
  run: number;
  numRises: number;
  startSideLeft: boolean;
  headspaceCm: number;
  onZoomDebugChange?: (zoom: { current: number; min: number; max: number }) => void;
}

const SCALE = 0.01; // cm → meters
const CFG = GEOMETRY_CONFIG;
const VIS = CFG.visibility;

// Fixed project constants (matching HTML)
const STAIR_WIDTH = CFG.dimensions.stairWidthCm * SCALE;
const HALF_WIDTH = STAIR_WIDTH / 2;
const TOP_FLOOR_RISE = CFG.dimensions.topFloorRiseCm;
const CEILING_RISE = CFG.dimensions.ceilingRiseCm;

// Material colors — identical to HTML buildStairMesh
const C = {
  stairRight: CFG.materials.stairRight,
  stairLeft: CFG.materials.stairLeft,
  stairEdge: CFG.materials.stairEdge,
  concrete: CFG.materials.concrete,
  floor: CFG.materials.floor,
  wall: CFG.materials.wall,
  slab: CFG.materials.slab,
  soil: CFG.materials.soil,
  grid1: CFG.materials.gridMajor,
  grid2: CFG.materials.gridMinor,
  bg: CFG.materials.sceneBackground,
};
const TRANSPARENT_WALL_COLOR = 0x2f6cc8;

function StairSceneContent({ rise, run, numRises, startSideLeft, headspaceCm, onZoomDebugChange }: StairSceneProps) {
  const lastZoomRef = useRef<number>(Number.NaN);
  const { camera } = useThree();
  const minDistance = 2.0;
  const maxDistance = 6.0;
  const zoomTarget = useMemo(() => new THREE.Vector3(1.25, 1.3, 0), []);

  const reportZoom = useCallback(() => {
    const current = camera.position.distanceTo(zoomTarget);
    onZoomDebugChange?.({ current, min: minDistance, max: maxDistance });
  }, [camera, onZoomDebugChange, zoomTarget]);

  useEffect(() => {
    const id = requestAnimationFrame(() => reportZoom());
    return () => cancelAnimationFrame(id);
  }, [reportZoom]);

  useFrame(() => {
    const current = camera.position.distanceTo(zoomTarget);
    if (!Number.isFinite(lastZoomRef.current) || Math.abs(current - lastZoomRef.current) > 0.002) {
      lastZoomRef.current = current;
      onZoomDebugChange?.({ current, min: minDistance, max: maxDistance });
    }
  });

  const stairGroup = useMemo(() => {
    const root = new THREE.Group();

    const totalRise = rise * numRises * SCALE;
    const usableRun = run * SCALE;
    const stepAdvance = usableRun / 2;
    const treadRun = usableRun;
    const totalRun = stepAdvance * numRises;
    const stepRise = rise * SCALE;
    const innerVolumeInset = CFG.dimensions.innerVolumeInsetCm * SCALE;
    const innerVolumeWidth = Math.max(0.05, STAIR_WIDTH - innerVolumeInset * 2);

    const topFloorY = TOP_FLOOR_RISE * SCALE;
    const ceilingY = CEILING_RISE * SCALE;
    const fixedTopEntryDrop = stepRise;
    const stairTopY = topFloorY - fixedTopEntryDrop;
    const stairBaseY = stairTopY - totalRise;

    const concreteRise = Math.max(0, totalRise - stepRise);

    // Materials
    const stairRightMat = new THREE.MeshStandardMaterial({
      color: C.stairRight, metalness: 0.05, roughness: 0.55, transparent: true, opacity: 0.9,
    });
    const stairLeftMat = new THREE.MeshStandardMaterial({
      color: C.stairLeft, metalness: 0.05, roughness: 0.55, transparent: true, opacity: 0.9,
    });
    const stairEdgeMat = new THREE.LineBasicMaterial({ color: C.stairEdge });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: C.concrete, metalness: 0, roughness: 0.92, transparent: true, opacity: CFG.materials.concreteOpacity,
    });
    const wallMat = new THREE.MeshStandardMaterial({ color: C.wall, metalness: 0, roughness: 1 });
    const soilMat = new THREE.MeshStandardMaterial({ color: C.soil, metalness: 0, roughness: 1 });
    const slabMat = new THREE.MeshStandardMaterial({ color: C.slab, metalness: 0, roughness: 0.95 });
    const levelGuideMat = new THREE.MeshStandardMaterial({
      color: CFG.materials.levelGuide.color,
      emissive: CFG.materials.levelGuide.emissive,
      emissiveIntensity: CFG.materials.levelGuide.emissiveIntensity,
      metalness: 0,
      roughness: 0.65,
    });

    const labelsGroup = new THREE.Group();
    root.add(labelsGroup);

    const makeLabelSprite = (text: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const fontSize = 28;
      const padX = 14;
      const padY = 10;
      ctx.font = `600 ${fontSize}px Segoe UI`;
      const textWidth = Math.ceil(ctx.measureText(text).width);
      canvas.width = textWidth + padX * 2;
      canvas.height = fontSize + padY * 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(77, 66, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      ctx.fillStyle = 'rgba(33, 29, 24, 0.95)';
      ctx.font = `600 ${fontSize}px Segoe UI`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, padX, canvas.height / 2 + 1);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      const baseHeight = 0.1;
      const aspect = canvas.width / canvas.height;
      sprite.scale.set(baseHeight * aspect, baseHeight, 1);
      sprite.renderOrder = 20;
      return sprite;
    };

    const addLabel = (text: string, x: number, y: number, z: number) => {
      const sprite = makeLabelSprite(text);
      if (!sprite) return;
      sprite.position.set(x, y, z);
      labelsGroup.add(sprite);
    };

    const addLabelForMesh = (text: string, mesh: THREE.Object3D, yOffset = 0.08) => {
      const bounds = new THREE.Box3().setFromObject(mesh);
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new THREE.Vector3());
      center.y = bounds.max.y + yOffset;
      addLabel(text, center.x, center.y, center.z);
    };

    // Concrete carrier (flat-faced triangular prism)
    const concreteShape = new THREE.Shape();
    concreteShape.moveTo(0, 0);
    concreteShape.lineTo(totalRun, 0);
    concreteShape.lineTo(totalRun, concreteRise);
    concreteShape.lineTo(0, 0);
    const concreteGeom = new THREE.ExtrudeGeometry(concreteShape, { depth: innerVolumeWidth, bevelEnabled: false });
    const concreteBody = new THREE.Mesh(concreteGeom, concreteMat);
    concreteBody.position.set(0, stairBaseY, -innerVolumeWidth / 2);
    root.add(concreteBody);
    addLabelForMesh('concrete carrier', concreteBody, 0.12);

    const concreteGapToWall = CFG.dimensions.concreteGapToWallCm * SCALE;
    if (concreteGapToWall > 0) {
      const gapBody = new THREE.Mesh(
        new THREE.BoxGeometry(concreteGapToWall, concreteRise, innerVolumeWidth),
        concreteMat,
      );
      gapBody.position.set(totalRun + concreteGapToWall / 2, stairBaseY + concreteRise / 2, 0);
      root.add(gapBody);
    }

    // Alternating tread steps (same logic as HTML addTread)
    const eps = 0.001;
    const dynamicCount = Math.max(0, numRises - 1);
    const startOnLeft = Boolean(startSideLeft);
    const sideAtOriginStep = (indexFromOrigin: number) => (startOnLeft ? (indexFromOrigin % 2 === 1) : (indexFromOrigin % 2 === 0));
    const rightCenters: Array<{ x: number; y: number; z: number }> = [];
    const leftCenters: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < dynamicCount; i++) {
      const originIndex = dynamicCount - 1 - i;
      const isRightTread = sideAtOriginStep(originIndex);
      const mat = isRightTread ? stairRightMat : stairLeftMat;
      const treadZ = isRightTread ? -HALF_WIDTH / 2 : HALF_WIDTH / 2;
      const x = (i + 1.0) * stepAdvance;
      const y = stairBaseY + (i + 0.5) * stepRise;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(treadRun + eps, stepRise + eps, HALF_WIDTH),
        mat,
      );
      box.position.set(x, y, treadZ);
      root.add(box);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), stairEdgeMat);
      edge.position.copy(box.position);
      root.add(edge);
      (isRightTread ? rightCenters : leftCenters).push({ x, y, z: treadZ });
    }

    const addComponentGuide = (points: Array<{ x: number; y: number; z: number }>, color: number) => {
      if (points.length < 2) return;
      const guidePts = points.map((p) => new THREE.Vector3(p.x, p.y + stepRise * 0.58, p.z));
      const geom = new THREE.BufferGeometry().setFromPoints(guidePts);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color }));
      root.add(line);
    };
    addComponentGuide(rightCenters, 0x0078d4);
    addComponentGuide(leftCenters, 0xb11f4b);

    if (rightCenters.length && leftCenters.length) {
      const r0 = rightCenters[0];
      const l0 = leftCenters[0];
      const phaseGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(r0.x, r0.y + stepRise * 0.8, 0),
        new THREE.Vector3(l0.x, l0.y + stepRise * 0.8, 0),
      ]);
      const phaseLine = new THREE.Line(
        phaseGeom,
        new THREE.LineDashedMaterial({ color: 0xf54242, dashSize: 0.05, gapSize: 0.03 }),
      );
      phaseLine.computeLineDistances();
      root.add(phaseLine);
      addLabel('phase: +R and +run/2', (r0.x + l0.x) / 2, (r0.y + l0.y) / 2 + stepRise, 0);
    }
    addLabel('right sequence', totalRun * 0.5, stairBaseY + totalRise * 0.52, -HALF_WIDTH * 0.7);
    addLabel('left sequence', totalRun * 0.5, stairBaseY + totalRise * 0.64, HALF_WIDTH * 0.7);

    // Fixed scaffold geometry in 3D (matching HTML buildStairMesh).
    const holeWidth = CFG.dimensions.holeWidthCm * SCALE;
    const topWallLen = CFG.dimensions.topWallLenCm * SCALE;
    const topWallDrop = CFG.dimensions.topWallDropCm * SCALE;
    const podestLen = CFG.dimensions.podestLenCm * SCALE;
    const stairTopX = totalRun + podestLen;
    const holeEndX = stairTopX - topWallLen;
    const ceilingEndX = holeEndX - holeWidth;
    const leftToCeilingEnd = CFG.dimensions.leftToCeilingEndCm * SCALE;
    const leftWallX = ceilingEndX - leftToCeilingEnd;

    const tallWallHeight = CFG.dimensions.tallWallHeightCm * SCALE;
    const tallWallThicknessX = CFG.dimensions.tallWallThicknessCm * SCALE;
    const soilExpandZ = CFG.dimensions.soilExpandZCm * SCALE;
    const soilUnifiedDepth = 0.9 + soilExpandZ;
    const soilSideGap = CFG.dimensions.soilSideGapCm * SCALE;
    const wallWideSpanZ = STAIR_WIDTH + soilUnifiedDepth + soilSideGap;
    const wallWideCenterZ = -((soilUnifiedDepth + soilSideGap) / 2);

    // Left wall profile: 60 cm base segment + 20 cm tower thickness.
    const leftWallSegmentLen = CFG.dimensions.leftWallSegmentLenCm * SCALE;
    const leftWallSegmentHeight = CFG.dimensions.leftWallSegmentHeightCm * SCALE;
    const leftWallTowerHeight = CFG.dimensions.leftWallTowerHeightCm * SCALE;
    const leftWallTowerThicknessX = CFG.dimensions.leftWallTowerThicknessCm * SCALE;

    const leftWallBase = new THREE.Mesh(
      new THREE.BoxGeometry(leftWallSegmentLen, leftWallSegmentHeight, wallWideSpanZ),
      wallMat,
    );
    leftWallBase.position.set(leftWallX - leftWallSegmentLen / 2, leftWallSegmentHeight / 2, wallWideCenterZ);
    root.add(leftWallBase);
    addLabelForMesh('left wall base 60x90', leftWallBase);

    const leftWallTowerEndX = leftWallX - leftWallSegmentLen;
    const leftWallTower = new THREE.Mesh(
      new THREE.BoxGeometry(leftWallTowerThicknessX, leftWallTowerHeight, wallWideSpanZ),
      wallMat,
    );
    leftWallTower.position.set(leftWallTowerEndX - leftWallTowerThicknessX / 2, leftWallTowerHeight / 2, wallWideCenterZ);
    root.add(leftWallTower);
    addLabelForMesh('left wall 250h', leftWallTower);

    const leftWallOuterLeftX = leftWallTowerEndX - leftWallTowerThicknessX;

    const slabThickness = CFG.dimensions.slabThicknessCm * SCALE;
    const soilThickness = CFG.dimensions.soilThicknessCm * SCALE;
    const soilLevelY = topFloorY;
    const slabCenterY = ceilingY + slabThickness / 2;
    const stairRightDescZ = -STAIR_WIDTH / 2;
    const wallInnerFaceZ = stairRightDescZ;
    const soilUnifiedZ = wallInnerFaceZ - soilUnifiedDepth / 2;

    // Left top area from left wall outer edge to ceiling end.
    const soilLeftStartX = leftWallOuterLeftX;
    const soilLeftLen = Math.max(0.05, ceilingEndX - soilLeftStartX);
    const soilLeftCenterX = (soilLeftStartX + ceilingEndX) / 2;
    const soilLeft = new THREE.Mesh(
      new THREE.BoxGeometry(soilLeftLen, soilThickness, soilUnifiedDepth),
      soilMat,
    );
    soilLeft.position.set(soilLeftCenterX, soilLevelY - soilThickness / 2, soilUnifiedZ);
    root.add(soilLeft);
    addLabelForMesh('soil', soilLeft);

    const soilLeftBaseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(soilLeftLen, slabThickness, soilUnifiedDepth),
      slabMat,
    );
    soilLeftBaseSlab.position.set(soilLeftCenterX, slabCenterY, soilUnifiedZ);
    root.add(soilLeftBaseSlab);
    addLabelForMesh('soil slab 35', soilLeftBaseSlab);

    // Transition fill between left wall and sidewall20 start edge.
    const soilBridgeStartX = leftWallOuterLeftX;
    const soilBridgeLen = Math.max(0.05, ceilingEndX - soilBridgeStartX);
    const soilBridgeCenterX = (soilBridgeStartX + ceilingEndX) / 2;
    const soilBridgeDepth = STAIR_WIDTH;
    const soilBridge = new THREE.Mesh(
      new THREE.BoxGeometry(soilBridgeLen, soilThickness, soilBridgeDepth),
      soilMat,
    );
    soilBridge.position.set(soilBridgeCenterX, soilLevelY - soilThickness / 2, 0);
    root.add(soilBridge);
    addLabelForMesh('soil', soilBridge);

    const soilBridgeSlab = new THREE.Mesh(
      new THREE.BoxGeometry(soilBridgeLen, slabThickness, soilBridgeDepth),
      slabMat,
    );
    soilBridgeSlab.position.set(soilBridgeCenterX, slabCenterY, 0);
    root.add(soilBridgeSlab);
    addLabelForMesh('soil slab 35', soilBridgeSlab);

    // Side wall on descending-right side (transparent sidewall20).
    const sideWallThickness = CFG.dimensions.sideWallThicknessCm * SCALE;
    const sideWallCenterZ = stairRightDescZ - sideWallThickness / 2;
    const slabUndersideY = ceilingY;
    const sideWallStartX = ceilingEndX;
    const sideWallLenX = Math.max(0.05, stairTopX - sideWallStartX);
    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(sideWallLenX, slabUndersideY, sideWallThickness),
      new THREE.MeshStandardMaterial({
        color: TRANSPARENT_WALL_COLOR,
        transparent: true,
        opacity: CFG.materials.transparentWallOpacity,
        metalness: 0,
        roughness: 0.5,
      }),
    );
    sideWall.position.set((sideWallStartX + stairTopX) / 2, slabUndersideY / 2, sideWallCenterZ);
    root.add(sideWall);
    addLabelForMesh('side wall 20 (transparent)', sideWall);

    // Right/top side soil + slab.
    const soilUnifiedStartX = sideWallStartX;
    const soilUnifiedLen = Math.max(0.05, stairTopX - soilUnifiedStartX);
    const soilUnifiedX = (soilUnifiedStartX + stairTopX) / 2;
    const soilUnified = new THREE.Mesh(
      new THREE.BoxGeometry(soilUnifiedLen, soilThickness, soilUnifiedDepth),
      soilMat,
    );
    soilUnified.position.set(soilUnifiedX, soilLevelY - soilThickness / 2, soilUnifiedZ);
    root.add(soilUnified);
    addLabelForMesh('soil', soilUnified);

    const soilBaseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(soilUnifiedLen, slabThickness, soilUnifiedDepth),
      slabMat,
    );
    soilBaseSlab.position.set(soilUnifiedX, slabCenterY, soilUnifiedZ);
    root.add(soilBaseSlab);
    addLabelForMesh('soil slab 35', soilBaseSlab);

    // 50 cm wall: top is 45 cm below top floor, but wall is solid to floor level.
    const wall50Height = topFloorY - topWallDrop;
    const wall50 = new THREE.Mesh(
      new THREE.BoxGeometry(topWallLen, wall50Height, STAIR_WIDTH + 0.06),
      wallMat,
    );
    wall50.position.set(holeEndX + topWallLen / 2, wall50Height / 2, 0);
    root.add(wall50);
    addLabelForMesh('wall 50', wall50);

    const tallWall = new THREE.Mesh(
      new THREE.BoxGeometry(tallWallThicknessX, tallWallHeight, wallWideSpanZ),
      wallMat,
    );
    tallWall.position.set(stairTopX + tallWallThicknessX / 2, tallWallHeight / 2, wallWideCenterZ);
    root.add(tallWall);
    addLabelForMesh('tall wall', tallWall);

    if (VIS.showLeftSideWall) {
      const leftSideWallThickness = CFG.dimensions.leftSideWallThicknessCm * SCALE;
      const leftSideWallLenX = Math.max(0.05, stairTopX - leftWallOuterLeftX);
      const leftSideWall = new THREE.Mesh(
        new THREE.BoxGeometry(leftSideWallLenX, tallWallHeight, leftSideWallThickness),
        new THREE.MeshStandardMaterial({
          color: TRANSPARENT_WALL_COLOR,
          transparent: true,
          opacity: CFG.materials.transparentWallOpacity,
          metalness: 0,
          roughness: 0.5,
        }),
      );
      leftSideWall.position.set((leftWallOuterLeftX + stairTopX) / 2, tallWallHeight / 2, STAIR_WIDTH / 2 + leftSideWallThickness / 2);
      root.add(leftSideWall);
      addLabelForMesh('side wall left (transparent)', leftSideWall);
    }

    // Fixed top stair / podest 50+30.
    const podestHeight = stepRise;
    const podest = new THREE.Mesh(
      new THREE.BoxGeometry(podestLen, podestHeight, STAIR_WIDTH),
      new THREE.MeshStandardMaterial({
        color: 0x9b7a35,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    podest.position.set(totalRun + podestLen / 2, stairTopY - podestHeight / 2, 0);
    root.add(podest);
    const podestEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(podest.geometry),
      new THREE.LineBasicMaterial({ color: 0x2f2312 }),
    );
    podestEdge.position.copy(podest.position);
    root.add(podestEdge);

    if (VIS.showPodestGuides) {
      const podestGuideLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.06, 0.03),
        levelGuideMat,
      );
      podestGuideLeft.position.set(totalRun, stairTopY + 0.03, STAIR_WIDTH / 2 + 0.05);
      root.add(podestGuideLeft);

      const podestGuideRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.06, 0.03),
        levelGuideMat,
      );
      podestGuideRight.position.set(stairTopX, stairTopY + 0.03, STAIR_WIDTH / 2 + 0.05);
      root.add(podestGuideRight);
    }

    addLabelForMesh('podest 80', podest);

    const headspaceHeight = headspaceCm * SCALE;
    const headspaceDepth = innerVolumeWidth;
    const headspaceBottomLeftY = stairBaseY;
    const headspaceBottomRightY = stairTopY;
    const headspaceTopLeftY = headspaceBottomLeftY + headspaceHeight;
    const headspaceTopRightY = headspaceBottomRightY + headspaceHeight;
    const headspaceSlope = totalRun > 0 ? totalRise / totalRun : 0;
    const topAtX = (x: number) => headspaceTopLeftY + headspaceSlope * x;
    const clippedTopAtX = (x: number) => Math.min(soilLevelY, topAtX(x));

    const headspaceShape = new THREE.Shape();
    headspaceShape.moveTo(0, headspaceBottomLeftY);
    headspaceShape.lineTo(totalRun, headspaceBottomRightY);
    const topLeftClippedY = clippedTopAtX(0);
    const topRightClippedY = clippedTopAtX(totalRun);
    if (headspaceSlope > 0 && headspaceTopLeftY < soilLevelY && headspaceTopRightY > soilLevelY) {
      const xAtSoil = (soilLevelY - headspaceTopLeftY) / headspaceSlope;
      headspaceShape.lineTo(totalRun, topRightClippedY);
      headspaceShape.lineTo(xAtSoil, soilLevelY);
      headspaceShape.lineTo(0, topLeftClippedY);
    } else {
      headspaceShape.lineTo(totalRun, topRightClippedY);
      headspaceShape.lineTo(0, topLeftClippedY);
    }
    headspaceShape.closePath();

    const headspaceGeom = new THREE.ExtrudeGeometry(headspaceShape, {
      depth: headspaceDepth,
      bevelEnabled: false,
    });
    // Show only wireframe outline of headspace box (no solid fill)
    const headspaceEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(headspaceGeom),
      new THREE.LineBasicMaterial({
        color: 0xff4444,
        linewidth: 1,
      }),
    );
    headspaceEdges.position.set(0, 0, -headspaceDepth / 2);
    root.add(headspaceEdges);
    addLabel(`headspace ${headspaceCm.toFixed(0)} cm`, totalRun * 0.52, Math.min(soilLevelY, headspaceTopRightY) + 0.08, STAIR_WIDTH * 0.8);

    const slabIntersectStartX = Math.max(0, leftWallOuterLeftX);
    const slabIntersectEndX = Math.min(totalRun, ceilingEndX);
    if (slabIntersectEndX > slabIntersectStartX) {
      const xAtCeiling = headspaceSlope > 0 ? (ceilingY - headspaceTopLeftY) / headspaceSlope : slabIntersectStartX;
      const overlapStartX = Math.max(slabIntersectStartX, xAtCeiling);
      if (slabIntersectEndX > overlapStartX) {
        const overlapShape = new THREE.Shape();
        overlapShape.moveTo(overlapStartX, ceilingY);
        overlapShape.lineTo(slabIntersectEndX, ceilingY);
        overlapShape.lineTo(slabIntersectEndX, clippedTopAtX(slabIntersectEndX));
        overlapShape.lineTo(overlapStartX, clippedTopAtX(overlapStartX));
        overlapShape.closePath();

        const overlapGeom = new THREE.ExtrudeGeometry(overlapShape, {
          depth: headspaceDepth,
          bevelEnabled: false,
        });
        const overlapMesh = new THREE.Mesh(
          overlapGeom,
          new THREE.MeshBasicMaterial({
            color: 0xe04f5f,
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          }),
        );
        overlapMesh.position.set(0, 0, -headspaceDepth / 2 + 0.008);
        root.add(overlapMesh);
      }
    }

    // Keep X/Z centered around the orbit target while pinning model bottom to ground (y=0).
    const bounds = new THREE.Box3().setFromObject(root);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      root.position.set(1.25 - center.x, -bounds.min.y, -center.z);
    }

    return root;
  }, [rise, run, numRises, startSideLeft, headspaceCm]);

  return (
    <>
      <color attach="background" args={[C.bg]} />

      {/* Lighting — matches HTML exactly */}
      <hemisphereLight args={[0xffffff, 0xd1c7b8, 1.8]} />
      <directionalLight color={0xffffff} intensity={2.2} position={[5, 7, 4]} />
      <directionalLight color={0xf0d3db} intensity={0.8} position={[-4, 3, -3]} />

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={C.floor} metalness={0} roughness={1} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[12, 24, C.grid1, C.grid2]} position={[0, 0.001, 0]} />

      {/* Dynamic stair geometry — mount raw Three.js group */}
      <primitive object={stairGroup} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        target={[1.25, 1.3, 0]}
        minDistance={minDistance}
        maxDistance={maxDistance}
        onChange={reportZoom}
      />
    </>
  );
}

export function StairScene(props: StairSceneProps) {
  const zoomTarget = useMemo(() => new THREE.Vector3(1.25, 1.3, 0), []);

  return (
    <Canvas
      gl={{ alpha: false }}
      style={{ width: '100%', height: '100%' }}
      camera={{ fov: 42, near: 0.1, far: 100, position: [2.6, 2.2, 4.2] }}
      onCreated={({ camera, gl }) => {
        gl.localClippingEnabled = true;
        const current = camera.position.distanceTo(zoomTarget);
        props.onZoomDebugChange?.({ current, min: 1.0, max: 6.5 });
      }}
    >
      <StairSceneContent {...props} />
    </Canvas>
  );
}
