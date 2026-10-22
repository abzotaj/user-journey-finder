"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { KIND_ICON, KIND_STYLE } from "@/components/kind-visuals";
import { KIND_META, NODE_H, NODE_W, TRANSPORT_LABEL, layoutJourney } from "@/lib/journeys";
import type { Journey } from "@/lib/journeys";
import { cn } from "@/lib/utils";

type Props = {
  journey: Journey;
  matchedStepIds: string[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
};

export function JourneyGraph({ journey, matchedStepIds, selectedStepId, onSelectStep }: Props) {
  const layout = useMemo(() => layoutJourney(journey), [journey]);
  const [scale, setScale] = useState(1);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const fit = () => {
    const el = viewportRef.current;
    if (!el) return;
    const available = el.clientWidth - 32;
    setScale(Math.min(1, Math.max(0.5, Number((available / layout.width).toFixed(2)))));
  };

  // Fit the diagram to the viewport whenever a different journey is opened.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const available = el.clientWidth - 32;
    setScale(Math.min(1, Math.max(0.5, Number((available / layout.width).toFixed(2)))));
  }, [layout.width]);

  useEffect(() => {
    if (!selectedStepId) return;
    nodeRefs.current[selectedStepId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedStepId]);

  const connected = useMemo(() => {
    if (!selectedStepId) return null;
    const ids = new Set<string>([selectedStepId]);
    journey.edges.forEach((e) => {
      if (e.from === selectedStepId) ids.add(e.to);
      if (e.to === selectedStepId) ids.add(e.from);
    });
    return ids;
  }, [journey.edges, selectedStepId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur">
        <ZoomButton
          label="Zoom out"
          onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </ZoomButton>
        <span className="w-10 text-center font-mono text-[11px] text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <ZoomButton
          label="Zoom in"
          onClick={() => setScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(2))))}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </ZoomButton>
        <ZoomButton label="Fit to width" onClick={fit}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </ZoomButton>
      </div>

      <div ref={viewportRef} className="flex flex-1 overflow-auto p-4">
        <div
          className="relative m-auto"
          style={{ width: layout.width * scale, height: layout.height * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
          >
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-flow" />
                </marker>
              </defs>

              {layout.edges.map((edge, i) => {
                const active =
                  !!selectedStepId && (edge.from === selectedStepId || edge.to === selectedStepId);
                const dimmed = !!selectedStepId && !active;
                return (
                  <g key={`${edge.from}-${edge.to}-${i}`} className={cn(dimmed && "opacity-25")}>
                    <path
                      d={edge.path}
                      fill="none"
                      strokeWidth={active ? 2 : 1.5}
                      strokeDasharray={edge.transport === "event" ? "5 5" : undefined}
                      markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
                      className={active ? "stroke-flow" : "stroke-border"}
                    />
                  </g>
                );
              })}
            </svg>

            {layout.nodes.map((node) => {
              const Icon = KIND_ICON[node.kind];
              const style = KIND_STYLE[node.kind];
              const isSelected = node.id === selectedStepId;
              const isMatch = matchedStepIds.includes(node.id);
              const dimmed = !!connected && !connected.has(node.id);

              return (
                <button
                  key={node.id}
                  ref={(el) => {
                    nodeRefs.current[node.id] = el;
                  }}
                  type="button"
                  onClick={() => onSelectStep(node.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "absolute flex flex-col justify-center gap-1 rounded-lg border bg-card px-3 py-2 text-left transition",
                    "hover:border-flow/70 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    style.ring,
                    isSelected && "border-flow ring-2 ring-flow/35",
                    isMatch && !isSelected && "ring-2 ring-flow/25",
                    dimmed && "opacity-40",
                  )}
                  style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md",
                        style.icon,
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {node.repo}
                    </span>
                  </div>
                  <span className="text-pretty text-[13px] font-medium leading-tight text-card-foreground">
                    {node.label}
                  </span>
                  <span
                    className="truncate font-mono text-[10px] text-muted-foreground"
                    title={node.file}
                  >
                    {node.file}
                  </span>
                  <span className="sr-only">{KIND_META[node.kind].label}</span>
                </button>
              );
            })}

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.edges.map((edge, i) => {
                const active =
                  !!selectedStepId && (edge.from === selectedStepId || edge.to === selectedStepId);
                const dimmed = !!selectedStepId && !active;
                const text = `${TRANSPORT_LABEL[edge.transport]}  ${edge.label}`;
                const w = text.length * 5.9 + 20;
                return (
                  <g
                    key={`label-${edge.from}-${edge.to}-${i}`}
                    transform={`translate(${edge.midX} ${edge.midY})`}
                    className={cn(dimmed && "opacity-25")}
                  >
                    <rect
                      x={-w / 2}
                      y={-10}
                      width={w}
                      height={20}
                      rx={10}
                      className={cn("fill-card stroke-border", active && "stroke-flow/60")}
                      strokeWidth={1}
                    />
                    <text x={0} y={4} textAnchor="middle" className="text-[10px] font-medium">
                      <tspan
                        className={cn("font-mono", active ? "fill-flow" : "fill-muted-foreground")}
                      >
                        {TRANSPORT_LABEL[edge.transport]}
                      </tspan>
                      <tspan
                        dx="6"
                        className={active ? "fill-foreground" : "fill-muted-foreground"}
                      >
                        {edge.label}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
