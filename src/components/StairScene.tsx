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
  topPodestRise: number;
  bottomPodestHeight: number;
  run: number;
  numRises: number;
  startSideLeft: boolean;
  headspaceCm: number;
  showLabels?: boolean;
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

function StairSceneContent({ rise, topPodestRise, bottomPodestHeight, run, numRises, startSideLeft, headspaceCm, showLabels = true, onZoomDebugChange }: StairSceneProps) {
  const lastZoomRef = useRef<number>(Number.NaN);
  const didAutoFrameRef = useRef(false);
  const lastPortraitModeRef = useRef<boolean | null>(null);
  const { camera, size } = useThree();
  const zoomTarget = useMemo(() => new THREE.Vector3(1.25, 1.3, 0), []);

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
    const targetRiseToFloor = Math.max(0, TOP_FLOOR_RISE - topPodestRise - bottomPodestHeight) * SCALE;
    const riseResidual = totalRise - targetRiseToFloor;
    // Custom entry rise from floor/soil level down to podest top.
    const customEntryRise = topPodestRise * SCALE;
    // Podest-to-step rise should always match step rise.
    const fixedTopEntryDrop = stepRise;
    const bottomPodestTopY = bottomPodestHeight * SCALE;
    const partialBottomRise = THREE.MathUtils.clamp(-riseResidual, 0, stepRise);
    const hasPartialBottomStep = partialBottomRise > 0.005;
    const underFloorMismatch = riseResidual > 0.005;
    const stairTopY = topFloorY - customEntryRise;
    // Keep stair stack pinned to podest underside even when top podest rise is changed manually.
    const dynamicCount = Math.max(0, numRises - 1);
    const podestBottomY = stairTopY - fixedTopEntryDrop;
    const stairBaseY = podestBottomY - dynamicCount * stepRise;

    const concreteRise = Math.max(0, totalRise - stepRise);

    // Materials
    const stairRightMat = new THREE.MeshStandardMaterial({
      color: C.stairRight, metalness: 0.05, roughness: 0.55, transparent: true, opacity: 0.9,
    });
    const stairLeftMat = new THREE.MeshStandardMaterial({
      color: C.stairLeft, metalness: 0.05, roughness: 0.55, transparent: true, opacity: 0.9,
    });
    const partialStepMat = new THREE.MeshStandardMaterial({
      color: 0xffa24a,
      emissive: 0x3a1f02,
      emissiveIntensity: 0.6,
      metalness: 0.05,
      roughness: 0.6,
      transparent: true,
      opacity: 0.92,
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
    const dimsGroup = new THREE.Group();
    root.add(dimsGroup);

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

    // Dimension text — no background box, just colored text
    const makeDimSprite = (text: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const fontSize = 26;
      const padX = 6;
      const padY = 6;
      ctx.font = `500 ${fontSize}px Segoe UI`;
      const textWidth = Math.ceil(ctx.measureText(text).width);
      canvas.width = textWidth + padX * 2;
      canvas.height = fontSize + padY * 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `500 ${fontSize}px Segoe UI`;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.strokeText(text, padX, canvas.height / 2 + 1);
      ctx.fillStyle = 'rgba(58, 58, 58, 0.98)';
      ctx.fillText(text, padX, canvas.height / 2 + 1);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      const baseHeight = 0.09;
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

    const addDimLabel = (text: string, x: number, y: number, z: number) => {
      const sprite = makeDimSprite(text);
      if (!sprite) return;
      sprite.position.set(x, y, z);
      dimsGroup.add(sprite);
    };

    const addLabelForMesh = (text: string, mesh: THREE.Object3D, yOffset = 0.08) => {
      const bounds = new THREE.Box3().setFromObject(mesh);
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new THREE.Vector3());
      center.y = bounds.max.y + yOffset;
      addLabel(text, center.x, center.y, center.z);
    };

    const measurementColor = 0x3a3a3a;
    const measurementMat = new THREE.LineBasicMaterial({
      color: measurementColor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.98,
    });

    const addHorizontalDimension = (text: string, x1: number, x2: number, y: number, z: number, lift = 0.06) => {
      const dimensionY = y + lift;
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, dimensionY, z),
        new THREE.Vector3(x2, dimensionY, z),
      ]);
      const startTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y, z),
        new THREE.Vector3(x1, dimensionY, z),
      ]);
      const endTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x2, y, z),
        new THREE.Vector3(x2, dimensionY, z),
      ]);
      dimsGroup.add(new THREE.Line(lineGeom, measurementMat));
      dimsGroup.add(new THREE.Line(startTickGeom, measurementMat));
      dimsGroup.add(new THREE.Line(endTickGeom, measurementMat));
      addDimLabel(text, (x1 + x2) / 2, dimensionY + 0.05, z);
    };

    const addVerticalDimension = (text: string, y1: number, y2: number, x: number, z: number, shift = 0.08) => {
      const dimensionX = x + shift;
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(dimensionX, y1, z),
        new THREE.Vector3(dimensionX, y2, z),
      ]);
      const startTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y1, z),
        new THREE.Vector3(dimensionX, y1, z),
      ]);
      const endTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y2, z),
        new THREE.Vector3(dimensionX, y2, z),
      ]);
      dimsGroup.add(new THREE.Line(lineGeom, measurementMat));
      dimsGroup.add(new THREE.Line(startTickGeom, measurementMat));
      dimsGroup.add(new THREE.Line(endTickGeom, measurementMat));
      addDimLabel(text, dimensionX + 0.03, (y1 + y2) / 2, z);
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
    addHorizontalDimension(`stairs run ${(totalRun / SCALE).toFixed(0)} cm`, 0, totalRun, stairBaseY, 0, -0.10);
    addVerticalDimension(`stairs rise ${(totalRise / SCALE).toFixed(1)} cm`, stairBaseY, stairTopY, totalRun, 0, 0.10);

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
      // Cumulative height label on the riser face (no background)
      const riserFaceX = i * stepAdvance; // left (lower) face of this step
      const riserTopY = stairBaseY + (i + 1) * stepRise;
      addDimLabel(`+${((i + 1) * rise).toFixed(1)}`, riserFaceX, riserTopY + 0.012, treadZ);
      (isRightTread ? rightCenters : leftCenters).push({ x, y, z: treadZ });
    }

    if (hasPartialBottomStep) {
      const partialOriginIndex = dynamicCount;
      const partialOnRight = sideAtOriginStep(partialOriginIndex);
      const partialZ = partialOnRight ? -HALF_WIDTH / 2 : HALF_WIDTH / 2;
      const partialStep = new THREE.Mesh(
        new THREE.BoxGeometry(treadRun + eps, partialBottomRise + eps, HALF_WIDTH),
        partialStepMat,
      );
      partialStep.position.set(0, bottomPodestTopY + partialBottomRise / 2, partialZ);
      root.add(partialStep);

      const partialEdge = new THREE.LineSegments(new THREE.EdgesGeometry(partialStep.geometry), stairEdgeMat);
      partialEdge.position.copy(partialStep.position);
      root.add(partialEdge);

      addDimLabel(`partial +${(partialBottomRise / SCALE).toFixed(1)} cm`, 0, bottomPodestTopY + partialBottomRise + 0.03, partialZ);
      (partialOnRight ? rightCenters : leftCenters).unshift({ x: 0, y: bottomPodestTopY + partialBottomRise / 2, z: partialZ });
    }

    // Single-step rise + run callouts — use step near the middle for visibility
    if (dynamicCount >= 2) {
      const annotIdx = Math.floor(dynamicCount / 2);
      const stepBottomY = stairBaseY + annotIdx * stepRise;
      const stepTopY = stepBottomY + stepRise;
      const stepX = (annotIdx + 1.0) * stepAdvance;
      const annotZ = HALF_WIDTH + 0.04; // just outside the stair width
      addVerticalDimension(`rise ${(rise).toFixed(1)} cm`, stepBottomY, stepTopY, stepX - treadRun * 0.5, annotZ, 0.10);
      addHorizontalDimension(`run ${(treadRun / SCALE).toFixed(1)} cm`, stepX - treadRun / 2, stepX + treadRun / 2, stepBottomY, annotZ, -0.08);
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

    // Left wall profile: keep inner/base segment at configured height,
    // but match only the outer part to tall-wall height.
    const leftWallSegmentLen = CFG.dimensions.leftWallSegmentLenCm * SCALE;
    const leftWallSegmentHeight = CFG.dimensions.leftWallSegmentHeightCm * SCALE;
    const leftWallTowerHeight = tallWallHeight;
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

    // Vertical: ceiling height from ground and floor-to-floor — placed outside left wall
    const measureLeftX = leftWallOuterLeftX - 0.18;
    addVerticalDimension(`ceiling ${(ceilingY / SCALE).toFixed(0)} cm`, 0, ceilingY, measureLeftX, wallWideCenterZ, -0.10);
    addVerticalDimension(`floor-floor ${(topFloorY / SCALE).toFixed(0)} cm`, 0, topFloorY, measureLeftX, wallWideCenterZ, -0.22);
    // Vertical: opening clear height (ceiling underside to top floor)
    addVerticalDimension(`opening ${((topFloorY - ceilingY) / SCALE).toFixed(0)} cm`, ceilingY, topFloorY, measureLeftX, wallWideCenterZ, -0.34);

    const slabThickness = CFG.dimensions.slabThicknessCm * SCALE;
    const soilThickness = CFG.dimensions.soilThicknessCm * SCALE;
    const soilLevelY = topFloorY;
    const slabCenterY = ceilingY + slabThickness / 2;
    const stairRightDescZ = -STAIR_WIDTH / 2;
    const wallInnerFaceZ = stairRightDescZ;
    const soilUnifiedZ = wallInnerFaceZ - soilUnifiedDepth / 2;

    // Left top area from outer-part inner edge to ceiling end.
    const soilLeftStartX = leftWallTowerEndX;
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
    addVerticalDimension(`soil ${(soilThickness / SCALE).toFixed(0)} cm`, soilLevelY - soilThickness, soilLevelY, leftWallOuterLeftX - 0.08, soilUnifiedDepth * 0.5, -0.06);
    addVerticalDimension(`slab ${(slabThickness / SCALE).toFixed(0)} cm`, ceilingY, ceilingY + slabThickness, leftWallOuterLeftX - 0.02, soilUnifiedDepth * 0.5, -0.16);

    // Transition fill between outer-part inner edge and sidewall20 start edge.
    const soilBridgeStartX = leftWallTowerEndX;
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

    // Per-step horizontal accumulation from door reference, rendered on transparent right wall.
    const doorRefX = ceilingEndX;
    const wallStepMeasureZ = stairRightDescZ - 0.004;
    const tickHalf = 0.015;
    const addWallStepOffset = (xFace: number, y: number, label: string) => {
      const leaderGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(doorRefX, y, wallStepMeasureZ),
        new THREE.Vector3(xFace, y, wallStepMeasureZ),
      ]);
      const startTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(doorRefX, y - tickHalf, wallStepMeasureZ),
        new THREE.Vector3(doorRefX, y + tickHalf, wallStepMeasureZ),
      ]);
      const endTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xFace, y - tickHalf, wallStepMeasureZ),
        new THREE.Vector3(xFace, y + tickHalf, wallStepMeasureZ),
      ]);
      dimsGroup.add(new THREE.Line(leaderGeom, measurementMat));
      dimsGroup.add(new THREE.Line(startTickGeom, measurementMat));
      dimsGroup.add(new THREE.Line(endTickGeom, measurementMat));
      addDimLabel(label, (doorRefX + xFace) / 2, y + 0.028, wallStepMeasureZ);
    };

    addDimLabel('+0 cm', doorRefX + 0.02, stairBaseY + 0.03, wallStepMeasureZ);
    for (let i = 0; i < dynamicCount; i++) {
      const stepFaceX = i * stepAdvance;
      const fromDoorCm = Math.abs(stepFaceX - doorRefX) / SCALE;
      const y = stairBaseY + (i + 1) * stepRise + 0.01;
      addWallStepOffset(stepFaceX, y, `+${fromDoorCm.toFixed(0)} cm`);
    }
    const topStepFromDoorCm = Math.abs(totalRun - doorRefX) / SCALE;
    addWallStepOffset(totalRun, stairTopY + 0.015, `+${topStepFromDoorCm.toFixed(0)} cm`);

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
    addHorizontalDimension(`opening ${(holeWidth / SCALE).toFixed(0)} cm`, ceilingEndX, holeEndX, topFloorY, STAIR_WIDTH * 0.92, 0.10);
    addHorizontalDimension(`wall ${(topWallLen / SCALE).toFixed(0)} cm`, holeEndX, stairTopX, topFloorY, STAIR_WIDTH * 0.92, 0.20);

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
    if (bottomPodestTopY > 0.001) {
      const bottomPodest = new THREE.Mesh(
        new THREE.BoxGeometry(podestLen, bottomPodestTopY, STAIR_WIDTH),
        new THREE.MeshStandardMaterial({
          color: 0x8a7967,
          roughness: 0.88,
          metalness: 0.03,
        }),
      );
      bottomPodest.position.set(-podestLen / 2, bottomPodestTopY / 2, 0);
      root.add(bottomPodest);
      addLabelForMesh('bottom podest', bottomPodest);
    }

    const podestHeight = fixedTopEntryDrop;
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
    addHorizontalDimension(`podest ${(podestLen / SCALE).toFixed(0)} cm`, totalRun, stairTopX, stairTopY, STAIR_WIDTH * 0.86, 0.08);

    addLabelForMesh('podest 80', podest);

    if (underFloorMismatch) {
      addDimLabel('INVALID: stairs under floor', totalRun * 0.58, topFloorY + 0.14, STAIR_WIDTH * 0.9);
    }
    if (hasPartialBottomStep) {
      addDimLabel('WARNING: partial bottom step', totalRun * 0.24, bottomPodestTopY + 0.16, STAIR_WIDTH * 0.88);
    }

    addVerticalDimension(`entry rise ${(customEntryRise / SCALE).toFixed(1)} cm`, stairTopY, topFloorY, stairTopX, STAIR_WIDTH * 0.86, 0.10);
    if (Math.abs(riseResidual) > 0.005) {
      const deltaCm = riseResidual / SCALE;
      addDimLabel(
        `Δ floor ${deltaCm >= 0 ? '+' : ''}${deltaCm.toFixed(1)} cm`,
        stairTopX + 0.12,
        topFloorY + 0.06,
        STAIR_WIDTH * 0.84,
      );
    }

    const headspaceHeight = headspaceCm * SCALE;
    const headspaceDepth = innerVolumeWidth;
    // Measure from the stair-face line (top of riser / nosing trajectory),
    // while keeping a straight envelope to represent smooth head movement.
    const headspaceBottomLeftY = stairBaseY + stepRise;
    const headspaceBottomRightY = stairTopY + fixedTopEntryDrop;
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

    // Lower-floor continuation of headspace (like a zero-height podest at the bottom).
    // Use an angled transition (not a rectangular block) so motion from floor to first step
    // follows the same linear envelope behavior.
    const lowerFloorLen = podestLen;
    const lowerFloorX = -lowerFloorLen;
    const lowerFloorY = bottomPodestTopY;
    const lowerBottomAtStairY = headspaceBottomLeftY;
    const lowerTopAtFloorY = Math.min(soilLevelY, lowerFloorY + headspaceHeight);
    const lowerTopAtStairY = Math.min(soilLevelY, topLeftClippedY);
    const floorHeadspaceShape = new THREE.Shape();
    floorHeadspaceShape.moveTo(lowerFloorX, lowerFloorY);
    floorHeadspaceShape.lineTo(0, lowerBottomAtStairY);
    floorHeadspaceShape.lineTo(0, lowerTopAtStairY);
    floorHeadspaceShape.lineTo(lowerFloorX, lowerTopAtFloorY);
    floorHeadspaceShape.closePath();

    const floorHeadspaceGeom = new THREE.ExtrudeGeometry(floorHeadspaceShape, {
      depth: headspaceDepth,
      bevelEnabled: false,
    });
    const floorHeadspaceEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(floorHeadspaceGeom),
      new THREE.LineBasicMaterial({ color: 0xff4444 }),
    );
    floorHeadspaceEdges.position.set(0, 0, -headspaceDepth / 2);
    root.add(floorHeadspaceEdges);

    addLabel(`headspace ${headspaceCm.toFixed(0)} cm`, totalRun * 0.52, Math.min(soilLevelY, headspaceTopRightY) + 0.08, STAIR_WIDTH * 0.8);

    // Deck rule: top is at soil level, 4 cm thick, and starts at the
    // first X where deck-bottom satisfies the headspace envelope.
    const deckThickness = 0.04;
    const deckTopY = soilLevelY;
    const deckBottomY = deckTopY - deckThickness;

    // Intersect the horizontal deck bottom with the headspace top line.
    const xAtDeckBottom = headspaceSlope > 0
      ? (deckBottomY - headspaceTopLeftY) / headspaceSlope
      : leftWallOuterLeftX;
    const safeDeckIntersectX = Number.isFinite(xAtDeckBottom) ? xAtDeckBottom : leftWallOuterLeftX;
    const deckLimitX = THREE.MathUtils.clamp(safeDeckIntersectX, leftWallOuterLeftX, totalRun);

    // Deck is only over the opening (hole): from soil edge to max valid point.
    const deckStartX = ceilingEndX;
    const deckEndXByHeadspace = Math.max(deckStartX, deckLimitX);
    const deckLeftX = deckStartX;
    const deckRightX = Math.min(holeEndX, deckEndXByHeadspace);

    const deckSpan = deckRightX - deckLeftX;
    if (deckSpan > 0.001) {
      const deckShape = new THREE.Shape();
      deckShape.moveTo(deckLeftX, deckBottomY);
      deckShape.lineTo(deckRightX, deckBottomY);
      deckShape.lineTo(deckRightX, deckTopY);
      deckShape.lineTo(deckLeftX, deckTopY);
      deckShape.closePath();

      // Extrude across full stair width (Z direction)
      const deckGeom = new THREE.ExtrudeGeometry(deckShape, {
        depth: STAIR_WIDTH,
        bevelEnabled: false,
      });
      const deckMat = new THREE.MeshBasicMaterial({
        color: 0x8B7355, // brown/wood color
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const deckMesh = new THREE.Mesh(deckGeom, deckMat);
      deckMesh.position.z = -STAIR_WIDTH / 2;  // Center it on the stair width
      root.add(deckMesh);

      // Add deck edges
      const deckEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(deckGeom),
        new THREE.LineBasicMaterial({ color: 0x654321, linewidth: 2 }),
      );
      deckEdges.position.z = -STAIR_WIDTH / 2;
      root.add(deckEdges);
    }

    const slabIntersectStartX = Math.max(0, leftWallOuterLeftX);
    const slabIntersectEndX = Math.min(totalRun, ceilingEndX);
    const xAtCeiling = headspaceSlope > 0 ? (ceilingY - headspaceTopLeftY) / headspaceSlope : slabIntersectStartX;
    const deckLengthCm = (deckRightX - deckLeftX) / SCALE;
    if (Number.isFinite(deckLengthCm) && deckLengthCm > 0.1) {
      // Show deck dimensions as separate measurement lines
      addHorizontalDimension(`deck length ${deckLengthCm.toFixed(1)} cm`, deckLeftX, deckRightX, deckBottomY, STAIR_WIDTH * 0.5, 0.06);
      const outerPartInnerX = leftWallTowerEndX;
      const outerPartToDeckCm = (deckRightX - outerPartInnerX) / SCALE;
      if (Number.isFinite(outerPartToDeckCm) && deckRightX > outerPartInnerX) {
        addHorizontalDimension(`outer wall inner to deck end ${outerPartToDeckCm.toFixed(1)} cm`, outerPartInnerX, deckRightX, deckTopY, STAIR_WIDTH * 0.74, 0.16);
      }
    }

    if (slabIntersectEndX > slabIntersectStartX) {
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

    // Overlap visualization for lower-floor headspace continuation against slab.
    const lowerTopSlope = (0 - lowerFloorX) > 1e-9
      ? (lowerTopAtStairY - lowerTopAtFloorY) / (0 - lowerFloorX)
      : 0;
    const lowerTopAtX = (x: number) => lowerTopAtFloorY + lowerTopSlope * (x - lowerFloorX);
    const lowerSlabIntersectStartX = Math.max(leftWallOuterLeftX, lowerFloorX);
    const lowerSlabIntersectEndX = Math.min(0, ceilingEndX);
    if (lowerSlabIntersectEndX > lowerSlabIntersectStartX) {
      const xAtCeilingLower = Math.abs(lowerTopSlope) > 1e-9
        ? lowerFloorX + (ceilingY - lowerTopAtFloorY) / lowerTopSlope
        : lowerSlabIntersectStartX;
      const lowerOverlapStartX = Math.max(lowerSlabIntersectStartX, xAtCeilingLower);
      if (lowerSlabIntersectEndX > lowerOverlapStartX) {
        const lowerOverlapShape = new THREE.Shape();
        lowerOverlapShape.moveTo(lowerOverlapStartX, ceilingY);
        lowerOverlapShape.lineTo(lowerSlabIntersectEndX, ceilingY);
        lowerOverlapShape.lineTo(lowerSlabIntersectEndX, Math.min(soilLevelY, lowerTopAtX(lowerSlabIntersectEndX)));
        lowerOverlapShape.lineTo(lowerOverlapStartX, Math.min(soilLevelY, lowerTopAtX(lowerOverlapStartX)));
        lowerOverlapShape.closePath();

        const lowerOverlapGeom = new THREE.ExtrudeGeometry(lowerOverlapShape, {
          depth: headspaceDepth,
          bevelEnabled: false,
        });
        const lowerOverlapMesh = new THREE.Mesh(
          lowerOverlapGeom,
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
        lowerOverlapMesh.position.set(0, 0, -headspaceDepth / 2 + 0.008);
        root.add(lowerOverlapMesh);
      }
    }

    // Keep X/Z centered around the orbit target while pinning model bottom to ground (y=0).
    const bounds = new THREE.Box3().setFromObject(root);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      if (
        Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z)
        && Number.isFinite(bounds.min.y)
        && Math.abs(center.x) < 50 && Math.abs(center.y) < 50 && Math.abs(center.z) < 50
        && Math.abs(bounds.min.y) < 50
      ) {
        root.position.set(1.25 - center.x, -bounds.min.y, -center.z);
      }
    }

    return { root, labelsGroup };
  }, [rise, topPodestRise, bottomPodestHeight, run, numRises, startSideLeft, headspaceCm]);

  const cameraFit = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(stairGroup.root);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const aspect = size.width / Math.max(1, size.height);
    const isPortraitMobile = size.width <= 900 && aspect < 1;
    const fov = isPortraitMobile ? 50 : 42;
    const fovRad = THREE.MathUtils.degToRad(fov / 2);
    const safeRadius = Number.isFinite(sphere.radius) ? THREE.MathUtils.clamp(sphere.radius, 0.5, 12) : 3;
    const fitDistance = safeRadius / Math.sin(fovRad);
    const initialDistance = fitDistance * (isPortraitMobile ? 1.3 : 1.14);
    const minDistance = Math.max(0.72, fitDistance * (isPortraitMobile ? 0.42 : 0.5));
    const maxDistance = Math.max(minDistance + 0.9, fitDistance * (isPortraitMobile ? 1.7 : 3.0));

    return {
      fov,
      initialDistance,
      minDistance,
      maxDistance,
      isPortraitMobile,
    };
  }, [size.height, size.width, stairGroup]);

  useEffect(() => {
    const portraitModeChanged = lastPortraitModeRef.current !== cameraFit.isPortraitMobile;
    const shouldAutoFrame = !didAutoFrameRef.current || portraitModeChanged;

    if (!shouldAutoFrame) {
      return;
    }

    if ('fov' in camera) {
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      perspectiveCamera.fov = cameraFit.fov;
      perspectiveCamera.updateProjectionMatrix();
    }

    // Portrait phones need a farther and slightly higher framing to avoid a too-close feel.
    const framingDir = cameraFit.isPortraitMobile
      ? new THREE.Vector3(0.82, 0.72, 1.95)
      : new THREE.Vector3(1.05, 0.78, 1.45);
    framingDir.normalize();
    camera.position.copy(zoomTarget).addScaledVector(framingDir, cameraFit.initialDistance);
    camera.lookAt(zoomTarget);

    didAutoFrameRef.current = true;
    lastPortraitModeRef.current = cameraFit.isPortraitMobile;
  }, [camera, cameraFit.fov, cameraFit.initialDistance, cameraFit.isPortraitMobile, zoomTarget]);

  useEffect(() => {
    stairGroup.labelsGroup.visible = showLabels;
  }, [showLabels, stairGroup]);

  const reportZoom = useCallback(() => {
    const current = camera.position.distanceTo(zoomTarget);
    onZoomDebugChange?.({ current, min: cameraFit.minDistance, max: cameraFit.maxDistance });
  }, [camera, cameraFit.maxDistance, cameraFit.minDistance, onZoomDebugChange, zoomTarget]);

  useEffect(() => {
    const id = requestAnimationFrame(() => reportZoom());
    return () => cancelAnimationFrame(id);
  }, [reportZoom]);

  useFrame(() => {
    const current = camera.position.distanceTo(zoomTarget);
    if (!Number.isFinite(lastZoomRef.current) || Math.abs(current - lastZoomRef.current) > 0.002) {
      lastZoomRef.current = current;
      onZoomDebugChange?.({ current, min: cameraFit.minDistance, max: cameraFit.maxDistance });
    }
  });

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
      <primitive object={stairGroup.root} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        enableZoom
        target={[1.25, 1.3, 0]}
        minDistance={cameraFit.minDistance}
        maxDistance={cameraFit.maxDistance}
        zoomSpeed={cameraFit.isPortraitMobile ? 0.72 : 1.0}
        maxPolarAngle={cameraFit.isPortraitMobile ? Math.PI * 0.495 : Math.PI * 0.52}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
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
        gl.domElement.style.touchAction = 'none';
        const current = camera.position.distanceTo(zoomTarget);
        props.onZoomDebugChange?.({ current, min: 1.0, max: 6.5 });
      }}
    >
      <StairSceneContent {...props} />
    </Canvas>
  );
}
