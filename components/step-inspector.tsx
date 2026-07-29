"use client"

import { ArrowRight, CornerDownRight, Table2, X } from "lucide-react"
import { KIND_ICON, KIND_STYLE } from "@/components/kind-visuals"
import { KIND_META, TRANSPORT_LABEL } from "@/lib/journeys"
import type { Journey, Step } from "@/lib/journeys"
import { cn } from "@/lib/utils"

type Props = {
  journey: Journey
  step: Step
  onClose: () => void
  onSelectStep: (id: string) => void
}

export function StepInspector({ journey, step, onClose, onSelectStep }: Props) {
  const Icon = KIND_ICON[step.kind]
  const style = KIND_STYLE[step.kind]
  const byId = new Map(journey.steps.map((s) => [s.id, s]))
  const incoming = journey.edges.filter((e) => e.to === step.id)
  const outgoing = journey.edges.filter((e) => e.from === step.id)

  return (
    <aside className="flex max-h-[60vh] w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-5 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-8 items-center justify-center rounded-md", style.icon)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KIND_META[step.kind].label}
            </span>
            <span className="font-mono text-xs text-foreground">{step.repo}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close step details</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-balance text-base font-semibold leading-snug">{step.label}</h3>
        <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground">
          {step.file}
        </code>
      </div>

      <dl className="flex flex-col gap-3 text-[13px]">
        {step.tech ? <Field label="Runtime" value={step.tech} /> : null}
        {step.endpoint ? <Field label="Entry point" value={step.endpoint} mono /> : null}
        {step.datastore ? <Field label="Datastore" value={step.datastore} /> : null}
        {step.vendor ? <Field label="Provider" value={step.vendor} mono /> : null}
      </dl>

      {step.tables?.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Objects touched</p>
          <ul className="flex flex-wrap gap-1.5">
            {step.tables.map((table) => (
              <li
                key={table}
                className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px]"
              >
                <Table2 className="size-3 text-muted-foreground" aria-hidden="true" />
                {table}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step.notes ? (
        <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">{step.notes}</p>
      ) : null}

      {incoming.length ? (
        <NeighborList
          title="Called by"
          items={incoming.map((e) => ({
            id: e.from,
            label: byId.get(e.from)?.label ?? e.from,
            repo: byId.get(e.from)?.repo ?? "",
            detail: `${TRANSPORT_LABEL[e.transport]} · ${e.label}`,
          }))}
          onSelectStep={onSelectStep}
          icon={CornerDownRight}
        />
      ) : null}

      {outgoing.length ? (
        <NeighborList
          title="Calls out to"
          items={outgoing.map((e) => ({
            id: e.to,
            label: byId.get(e.to)?.label ?? e.to,
            repo: byId.get(e.to)?.repo ?? "",
            detail: `${TRANSPORT_LABEL[e.transport]} · ${e.label}`,
          }))}
          onSelectStep={onSelectStep}
          icon={ArrowRight}
        />
      ) : null}
    </aside>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", mono && "break-all font-mono text-[11px]")}>{value}</dd>
    </div>
  )
}

function NeighborList({
  title,
  items,
  onSelectStep,
  icon: Icon,
}: {
  title: string
  items: Array<{ id: string; label: string; repo: string; detail: string }>
  onSelectStep: (id: string) => void
  icon: typeof ArrowRight
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={`${title}-${item.id}`}>
            <button
              type="button"
              onClick={() => onSelectStep(item.id)}
              className="flex w-full items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left transition hover:border-flow/60 hover:bg-muted"
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-flow" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium">{item.label}</span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {item.repo} · {item.detail}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
