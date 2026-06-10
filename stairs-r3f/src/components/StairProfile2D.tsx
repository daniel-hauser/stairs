import type { ReactElement } from 'react';
import { COLORS, DIMENSIONS } from '../constants/stairDefaults';
import './StairProfile2D.css';

interface StairProfile2DProps {
  rise: number;
  run: number;
  numRises: number;
  startSideLeft: boolean;
}

export function StairProfile2D({ rise, run, numRises, startSideLeft }: StairProfile2DProps) {
  const w = 1000;
  const h = 600;
  const pad = { top: 56, right: 72, bottom: 56, left: 56 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const steps = numRises;
  const totalRise = rise * steps;
  const totalRun = (run / 2) * steps;
  const topFloorRise = DIMENSIONS.topFloorLevel;
  const ceilingRise = DIMENSIONS.basementCeiling;

  const leftToCeilingEndCm = 70;
  const holeWidthCm = 233;
  const topWallCm = 50;
  const topWallDropCm = 45;
  const leftBufferCm = 32;
  const rightBufferCm = 90;
  const scaffoldSpanCm = leftToCeilingEndCm + holeWidthCm + topWallCm;
  const maxTotalRunCm = (35 / 2) * 24;
  const projectedSpanCm = Math.max(maxTotalRunCm, scaffoldSpanCm);
  const displaySpan = leftBufferCm + projectedSpanCm + rightBufferCm;
  const xScale = plotW / displaySpan;
  const yScale = plotH / Math.max(totalRise, topFloorRise);
  const scale = Math.min(xScale, yScale);

  const tallWallX = pad.left + (leftBufferCm + projectedSpanCm) * scale;
  const topWallEndX = tallWallX;
  const holeEndX = topWallEndX - topWallCm * scale;
  const ceilingEndX = holeEndX - holeWidthCm * scale;
  const leftWallX = ceilingEndX - leftToCeilingEndCm * scale;
  const baseY = pad.top + plotH;
  const groundY = baseY;
  const stairTopX = tallWallX;
  const stairOriginX = stairTopX - 80 * scale;
  const stairBottomX = stairOriginX - totalRun * scale;
  const stairSpanPx = stairOriginX - stairBottomX;
  const displayRightX = tallWallX + rightBufferCm * scale;
  const ceilingY = baseY - ceilingRise * scale;
  const topFloorY = baseY - topFloorRise * scale;
  const stepHeightCm = totalRise / steps;
  const riserPx = stepHeightCm * scale;
  const fixedTopEntryDropCm = stepHeightCm;
  const stairTopY = topFloorY + fixedTopEntryDropCm * scale;
  const stairBottomY = stairTopY + totalRise * scale;
  const concreteFaceDropCm = stepHeightCm;
  const concreteTopY = stairTopY + concreteFaceDropCm * scale;
  const concreteGapToWallPx = 30 * scale;
  const topWallY = topFloorY + topWallDropCm;
  const safeOffsetPx = DIMENSIONS.headroom * scale;

  const fmt = (value: number, digits = 1) => `${value.toFixed(digits)} cm`;
  const elements: ReactElement[] = [];
  let key = 0;

  const addLine = (x1: number, y1: number, x2: number, y2: number, className: string) => {
    elements.push(<line key={`k${key++}`} x1={x1} y1={y1} x2={x2} y2={y2} className={className} />);
  };

  const addText = (
    x: number,
    y: number,
    text: string,
    className: string,
    anchor?: 'start' | 'middle' | 'end',
  ) => {
    elements.push(
      <text key={`k${key++}`} x={x} y={y} className={className} textAnchor={anchor}>
        {text}
      </text>,
    );
  };

  const concreteTriPoints = [
    `${stairBottomX},${stairBottomY}`,
    `${stairOriginX + concreteGapToWallPx},${stairBottomY}`,
    `${stairOriginX + concreteGapToWallPx},${concreteTopY}`,
    `${stairOriginX},${concreteTopY}`,
  ].join(' ');
  elements.push(<polygon key={`k${key++}`} points={concreteTriPoints} className="concrete-fill" />);

  addText(pad.left, 28, 'Side elevation', 'plot-title');

  for (let i = 0; i <= 8; i += 1) {
    const x = stairBottomX + (stairSpanPx * i) / 8;
    const y = stairTopY + (totalRise * scale * i) / 8;
    addLine(x, stairTopY, x, groundY, 'grid-line');
    addLine(stairBottomX, y, stairOriginX, y, 'grid-line');
  }

  const drawReferenceLine = (
    y: number,
    label: string,
    options: { emphasis?: boolean; hideLabel?: boolean; labelSide?: 'left' | 'right' } = {},
  ) => {
    addLine(
      leftWallX - 12,
      y,
      displayRightX + 14,
      y,
      options.emphasis ? 'reference-line emphasis' : 'reference-line',
    );
    if (!options.hideLabel) {
      if (options.labelSide === 'left') {
        addText(leftWallX - 16, y + 4, label, 'reference-label', 'end');
      } else {
        addText(displayRightX + 16, y + 4, label, 'reference-label');
      }
    }
  };

  drawReferenceLine(groundY, '', { emphasis: true, hideLabel: true });
  drawReferenceLine(ceilingY, `basement ceiling (${fmt(ceilingRise, 0)})`, { labelSide: 'left' });
  drawReferenceLine(topFloorY, `top floor level (${fmt(topFloorRise, 0)})`, {
    emphasis: true,
    labelSide: 'left',
  });

  const ceilingMeasureX = displayRightX - 26;
  addLine(ceilingMeasureX, groundY, ceilingMeasureX, ceilingY, 'run-dimension');
  addLine(ceilingMeasureX - 6, groundY, ceilingMeasureX + 6, groundY, 'run-dimension');
  addLine(ceilingMeasureX - 6, ceilingY, ceilingMeasureX + 6, ceilingY, 'run-dimension');
  addText(ceilingMeasureX + 10, (groundY + ceilingY) * 0.5 + 4, fmt(ceilingRise, 0), 'run-label');

  addLine(leftWallX, groundY, leftWallX, topFloorY - 8, 'baseline-line');
  addLine(leftWallX, ceilingY, ceilingEndX, ceilingY, 'baseline-line');
  addLine(leftWallX, ceilingY + 18, ceilingEndX, ceilingY + 18, 'run-dimension');
  addLine(leftWallX, ceilingY + 12, leftWallX, ceilingY + 24, 'run-dimension');
  addLine(ceilingEndX, ceilingY + 12, ceilingEndX, ceilingY + 24, 'run-dimension');
  addText((leftWallX + ceilingEndX) * 0.5, ceilingY + 36, '70 cm', 'run-label', 'middle');

  addLine(ceilingEndX, ceilingY, ceilingEndX, topFloorY, 'baseline-line');
  addLine(ceilingEndX, topFloorY - 24, holeEndX, topFloorY - 24, 'run-dimension');
  addLine(ceilingEndX, topFloorY - 30, ceilingEndX, topFloorY - 18, 'run-dimension');
  addLine(holeEndX, topFloorY - 30, holeEndX, topFloorY - 18, 'run-dimension');
  addText((ceilingEndX + holeEndX) * 0.5, topFloorY - 34, 'hole 233 cm', 'run-label', 'middle');

  addLine(holeEndX, topWallY, topWallEndX, topWallY, 'baseline-line');
  addLine(holeEndX, topWallY, holeEndX, topFloorY, 'baseline-line');
  addLine(topWallEndX, topWallY, topWallEndX, topFloorY, 'baseline-line');
  addLine(holeEndX, topWallY - 14, topWallEndX, topWallY - 14, 'run-dimension');
  addLine(holeEndX, topWallY - 20, holeEndX, topWallY - 8, 'run-dimension');
  addLine(topWallEndX, topWallY - 20, topWallEndX, topWallY - 8, 'run-dimension');
  addText((holeEndX + topWallEndX) * 0.5, topWallY + 16, '50 cm wall (45 below top floor)', 'run-label', 'middle');

  addLine(stairOriginX, stairTopY, stairTopX, stairTopY, 'stair-path-right');
  addText(stairTopX - 40 * scale, stairTopY + 14, 'top stair 50+30 (fixed)', 'reference-label', 'middle');
  addLine(topWallEndX, groundY + 4, topWallEndX, pad.top - 26, 'baseline-line');

  const safeStartX = stairOriginX;
  const safeStartY = stairTopY - safeOffsetPx;
  const safeEndX = stairBottomX;
  const safeEndY = stairBottomY - safeOffsetPx;
  addLine(safeStartX, safeStartY, safeEndX, safeEndY, 'safe-head-line');
  addLine(safeStartX - 5, safeStartY, safeStartX + 5, safeStartY, 'run-dimension');
  addLine(safeEndX - 5, safeEndY, safeEndX + 5, safeEndY, 'run-dimension');
  const safeMidX = (safeStartX + safeEndX) * 0.5;
  const safeMidTopY = (safeStartY + safeEndY) * 0.5;
  const safeMidBotY = safeMidTopY + safeOffsetPx;
  addLine(safeMidX, safeMidTopY, safeMidX, safeMidBotY, 'run-dimension');
  addLine(safeMidX - 5, safeMidTopY, safeMidX + 5, safeMidTopY, 'run-dimension');
  addLine(safeMidX - 5, safeMidBotY, safeMidX + 5, safeMidBotY, 'run-dimension');
  addText(safeMidX + 8, safeMidTopY + safeOffsetPx * 0.5 + 4, `${DIMENSIONS.headroom} cm headroom`, 'run-label');

  const legendY = Math.min(groundY - 54, stairBottomY - 26);
  const legendX = displayRightX - 160;
  addLine(legendX, legendY, legendX + 18, legendY, 'stair-path-right');
  addText(legendX + 22, legendY + 4, 'right tread', 'reference-label');
  addLine(legendX, legendY + 16, legendX + 18, legendY + 16, 'stair-path-left');
  addText(legendX + 22, legendY + 20, 'left tread (next rise)', 'reference-label');
  addLine(legendX, legendY + 32, legendX + 18, legendY + 32, 'phase-right-line');
  addText(legendX + 22, legendY + 36, 'right sequence (2R + run)', 'reference-label');
  addLine(legendX, legendY + 46, legendX + 18, legendY + 46, 'phase-left-line');
  addText(legendX + 22, legendY + 50, 'left sequence (half-phase)', 'reference-label');

  addLine(stairBottomX, groundY + 18, stairOriginX, groundY + 18, 'run-dimension');
  addLine(stairBottomX, groundY + 12, stairBottomX, groundY + 24, 'run-dimension');
  addLine(stairOriginX, groundY + 12, stairOriginX, groundY + 24, 'run-dimension');
  addText(stairBottomX + stairSpanPx * 0.5, groundY + 36, `total run ${fmt(totalRun, 0)}`, 'run-label', 'middle');

  const fillPts: string[] = [`${stairOriginX},${stairTopY + riserPx}`];
  const stepWidthPx = stairSpanPx / steps;
  const rightPhasePts: string[] = [];
  const leftPhasePts: string[] = [];
  const dynamicStepCount = Math.max(0, steps - 1);
  const sideAtOriginStep = (indexFromOrigin: number) => (startSideLeft ? indexFromOrigin % 2 === 1 : indexFromOrigin % 2 === 0);

  for (let i = 0; i < dynamicStepCount; i += 1) {
    const x0 = stairOriginX - i * stepWidthPx;
    const x1 = stairOriginX - (i + 1) * stepWidthPx;
    const y0 = stairTopY + (i + 1) * riserPx;
    const y1 = stairTopY + (i + 2) * riserPx;
    fillPts.push(`${x1},${y0}`);
    fillPts.push(`${x1},${y1}`);

    const isRightAtIndex = sideAtOriginStep(i);
    const lineClass = isRightAtIndex ? 'stair-path-right' : 'stair-path-left';
    addLine(x0, y0, x1, y0, lineClass);
    addLine(x1, y0, x1, y1, lineClass);

    const midX = (x0 + x1) / 2;
    const midY = y0 - 5;
    if (isRightAtIndex) {
      rightPhasePts.push(`${midX},${midY}`);
    } else {
      leftPhasePts.push(`${midX},${midY}`);
    }
  }

  fillPts.push(`${stairOriginX},${stairBottomY}`);
  elements.push(<polygon key={`k${key++}`} points={fillPts.join(' ')} className="stair-fill" />);

  if (rightPhasePts.length >= 2) {
    elements.push(<polyline key={`k${key++}`} points={rightPhasePts.join(' ')} className="phase-right-line" />);
  }
  if (leftPhasePts.length >= 2) {
    elements.push(<polyline key={`k${key++}`} points={leftPhasePts.join(' ')} className="phase-left-line" />);
  }
  if (rightPhasePts.length && leftPhasePts.length) {
    const [rx, ry] = rightPhasePts[0].split(',').map(Number);
    const [lx, ly] = leftPhasePts[0].split(',').map(Number);
    addLine(rx, ry, lx, ly, 'phase-shift-line');
    addText((rx + lx) / 2 + 8, (ry + ly) / 2 - 4, 'phase: +R and +run/2', 'run-label');
  }

  addLine(
    stairOriginX,
    stairTopY,
    stairOriginX,
    stairTopY + riserPx,
    sideAtOriginStep(0) ? 'stair-path-right' : 'stair-path-left',
  );
  addLine(stairBottomX, stairBottomY, stairOriginX, stairTopY, 'concrete-line');

  addText(stairTopX - 40 * scale, stairTopY - 8, '1', 'step-index-label', 'middle');
  for (let i = 0; i < Math.max(0, steps - 1); i += 1) {
    addText(
      stairOriginX - (i + 0.5) * stepWidthPx,
      stairTopY + (i + 2) * riserPx - 6,
      `${i + 2}`,
      'step-index-label',
      'middle',
    );
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="profile-svg">
      <rect width={w} height={h} fill={COLORS.light.bg} />
      {elements}
    </svg>
  );
}
