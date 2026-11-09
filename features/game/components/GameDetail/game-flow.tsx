"use client";

import { useState, type ReactNode } from "react";
import type {
  GameFlowMarker,
  GameFlowPoint,
  GameFlowView,
} from "@/features/game/game-flow";
import { strings } from "@/lib/strings";
import { Section } from "./sections";
import { TILE_CLASS_NAME } from "./styles";
import { ToggleGroup, type ToggleOption } from "./toggle-group";

const HEADING_ID = "game-flow";
// The SVG stretches to the card's width, so the points only need a fixed box to scale into.
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 200;
const ZERO_LINE_Y = VIEW_HEIGHT / 2;
const AREA_OPACITY = 0.55;

type FlowMode = "lead" | "winProbability";

// The halftime and overtime lines are solid and brighter than the quarter lines, as in the artboards.
const MARKER_CLASS_NAMES: Record<GameFlowMarker, string> = {
  quarter: "stroke-white/8 [stroke-dasharray:3_4]",
  half: "stroke-white/14",
  overtime: "stroke-white/24",
};

const svgXOf = (x: number) => x * VIEW_WIDTH;
const svgYOf = (y: number) => ZERO_LINE_Y - y * ZERO_LINE_Y;
const coordinatesOf = ({ x, y }: GameFlowPoint) =>
  `${svgXOf(x).toFixed(1)},${svgYOf(y).toFixed(1)}`;

function linePathOf(points: GameFlowPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${coordinatesOf(point)}`)
    .join(" ");
}

// The area between the zero line and one side of the margin: the home side above it, the away side below.
function areaPathOf(points: GameFlowPoint[], clampY: (y: number) => number) {
  const lastX = svgXOf(points.at(-1)?.x ?? 0).toFixed(1);
  const edge = points
    .map((point) => `L${coordinatesOf({ x: point.x, y: clampY(point.y) })}`)
    .join(" ");
  return `M0,${ZERO_LINE_Y} ${edge} L${lastX},${ZERO_LINE_Y} Z`;
}

function FlowStat({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 px-2.5 py-2 md:px-3 ${TILE_CLASS_NAME} ${className}`}
    >
      <dt className="text-[9px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="text-xs font-bold md:text-[13px]">{children}</dd>
    </div>
  );
}

function FlowChart({
  gameFlow,
  mode,
}: {
  gameFlow: GameFlowView;
  mode: FlowMode;
}) {
  const series =
    (mode === "winProbability" && gameFlow.winProbability) || gameFlow.lead;
  const { points } = series;
  const latestPoint = points.at(-1);

  return (
    <div className="flex flex-col gap-2">
      {/* The text summary below tells screen readers what the scale labels and the chart show. */}
      <div
        aria-hidden="true"
        className="flex justify-between gap-2 text-[10px] tracking-[0.14em] uppercase md:text-[11px]"
      >
        <span style={{ color: gameFlow.home.color }}>{series.topLabel}</span>
        <span className="text-right text-muted">{series.caption}</span>
      </div>
      <figure className="relative m-0">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="block h-[150px] w-full animate-reveal-flow overflow-hidden rounded-[10px] bg-white/2 motion-reduce:animate-none md:h-[220px]"
        >
          {gameFlow.periods.map(
            ({ label, start, marker }) =>
              marker && (
                <line
                  key={label}
                  x1={svgXOf(start)}
                  x2={svgXOf(start)}
                  y1={0}
                  y2={VIEW_HEIGHT}
                  vectorEffect="non-scaling-stroke"
                  className={MARKER_CLASS_NAMES[marker]}
                />
              ),
          )}
          <path
            d={areaPathOf(points, (y) => Math.max(y, 0))}
            fill={gameFlow.home.color}
            fillOpacity={AREA_OPACITY}
          />
          <path
            d={areaPathOf(points, (y) => Math.min(y, 0))}
            fill={gameFlow.away.color}
            fillOpacity={AREA_OPACITY}
          />
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={ZERO_LINE_Y}
            y2={ZERO_LINE_Y}
            vectorEffect="non-scaling-stroke"
            className="stroke-white/32"
          />
          <path
            d={linePathOf(points)}
            fill="none"
            strokeWidth={1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-foreground"
          />
        </svg>
        {/* Drawn outside the stretched SVG, so the dot stays round at any width. */}
        {gameFlow.isLive && latestPoint && (
          <span
            aria-hidden="true"
            className="absolute size-2.5 -translate-1/2 rounded-full border-2 border-ink bg-foreground"
            style={{
              left: `${latestPoint.x * 100}%`,
              top: `${((1 - latestPoint.y) / 2) * 100}%`,
            }}
          />
        )}
        <figcaption className="sr-only">{gameFlow.summary}</figcaption>
      </figure>
      <div
        aria-hidden="true"
        className="grid text-[10px] tracking-[0.14em] text-muted"
        style={{
          gridTemplateColumns: gameFlow.periods
            .map(({ start, end }) => `${end - start}fr`)
            .join(" "),
        }}
      >
        {gameFlow.periods.map(({ label }) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="text-[10px] tracking-[0.14em] uppercase md:text-[11px]"
        style={{ color: gameFlow.away.color }}
      >
        {series.bottomLabel}
      </span>
    </div>
  );
}

export function GameFlow({ gameFlow }: { gameFlow: GameFlowView | null }) {
  const [mode, setMode] = useState<FlowMode>("lead");
  const { flow } = strings.game;

  const modeOptions: ToggleOption<FlowMode>[] = [
    { value: "lead", label: flow.modes.lead },
    { value: "winProbability", label: flow.modes.winProbability },
  ];
  // A game that loses its win probability between polls falls back to the margin.
  const shownMode = gameFlow?.winProbability ? mode : "lead";

  return (
    <Section
      headingId={HEADING_ID}
      title={flow.title}
      action={
        gameFlow?.winProbability && (
          <ToggleGroup
            label={flow.modeToggle}
            options={modeOptions}
            selectedValue={shownMode}
            onSelect={setMode}
          />
        )
      }
    >
      {gameFlow ? (
        <>
          <FlowChart gameFlow={gameFlow} mode={shownMode} />
          {/* Mobile has room for three tiles, as in the GameDetail artboard; desktop adds the times tied. */}
          <dl className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-2.5">
            <FlowStat label={flow.stats.largestLead}>
              {gameFlow.largestLead.label}
            </FlowStat>
            <FlowStat label={flow.stats.leadChanges}>
              <span className="font-display text-lg leading-none font-normal md:text-xl">
                {gameFlow.leadChanges}
              </span>
            </FlowStat>
            <FlowStat label={flow.stats.timesTied} className="hidden md:flex">
              <span className="font-display text-lg leading-none font-normal md:text-xl">
                {gameFlow.timesTied}
              </span>
            </FlowStat>
            <FlowStat label={flow.stats.bestRun}>
              {gameFlow.bestRun ? (
                <>
                  {gameFlow.bestRun.label}
                  <span className="block text-[10px] font-normal text-muted">
                    {gameFlow.bestRun.spanLabel}
                  </span>
                </>
              ) : (
                flow.noRun
              )}
            </FlowStat>
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted">{flow.empty}</p>
      )}
    </Section>
  );
}
