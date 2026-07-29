import { Boxes, Cloud, Database, MonitorSmartphone, Radio, Server } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { StepKind } from "@/lib/journeys"

export const KIND_ICON: Record<StepKind, LucideIcon> = {
  page: MonitorSmartphone,
  api: Server,
  service: Boxes,
  db: Database,
  queue: Radio,
  external: Cloud,
}

/** Ring / text treatment per step kind. Only two hues are used: flow (internal) and external. */
export const KIND_STYLE: Record<StepKind, { chip: string; icon: string; ring: string }> = {
  page: {
    chip: "bg-flow text-flow-foreground",
    icon: "bg-flow text-flow-foreground",
    ring: "border-flow/70",
  },
  api: {
    chip: "bg-flow/15 text-flow border border-flow/30",
    icon: "bg-flow/15 text-flow",
    ring: "border-flow/45",
  },
  service: {
    chip: "bg-muted text-muted-foreground border border-border",
    icon: "bg-muted text-foreground/70",
    ring: "border-border",
  },
  db: {
    chip: "bg-muted text-foreground border border-border",
    icon: "bg-foreground/10 text-foreground",
    ring: "border-foreground/25",
  },
  queue: {
    chip: "bg-muted text-muted-foreground border border-dashed border-border",
    icon: "bg-muted text-muted-foreground",
    ring: "border-dashed border-muted-foreground/50",
  },
  external: {
    chip: "bg-external/15 text-external border border-external/35",
    icon: "bg-external/20 text-external",
    ring: "border-external/60",
  },
}
