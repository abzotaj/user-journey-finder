"use client"

import { useMemo, useState } from "react"
import { GitBranch, Workflow } from "lucide-react"
import { JourneyGraph } from "@/components/journey-graph"
import { JourneySidebar } from "@/components/journey-sidebar"
import { StepInspector } from "@/components/step-inspector"
import { KIND_ICON, KIND_STYLE } from "@/components/kind-visuals"
import { KIND_META, journeyRepos, searchJourneys } from "@/lib/journeys"
import type { StepKind } from "@/lib/journeys"

const LEGEND: StepKind[] = ["page", "api", "service", "db", "queue", "external"]

export function JourneyExplorer() {
  const [query, setQuery] = useState("")
  const [repos, setRepos] = useState<string[]>([])
  const [kinds, setKinds] = useState<StepKind[]>([])
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>("registration")
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const results = useMemo(() => searchJourneys(query, { repos, kinds }), [query, repos, kinds])

  const active = results.find((r) => r.journey.id === selectedJourneyId) ?? results[0] ?? null
  const journey = active?.journey ?? null
  const selectedStep = journey?.steps.find((s) => s.id === selectedStepId) ?? null

  function selectJourney(id: string) {
    setSelectedJourneyId(id)
    setSelectedStepId(null)
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-flow text-flow-foreground">
            <Workflow className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col leading-tight">
            <h1 className="text-sm font-semibold">Journey Atlas</h1>
            <p className="text-[11px] text-muted-foreground">
              Cross-repo user journeys and how data flows between them
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {LEGEND.map((kind) => {
            const Icon = KIND_ICON[kind]
            return (
              <li key={kind} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={`flex size-4 items-center justify-center rounded ${KIND_STYLE[kind].icon}`}
                >
                  <Icon className="size-2.5" aria-hidden="true" />
                </span>
                {KIND_META[kind].short}
              </li>
            )
          })}
        </ul>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <JourneySidebar
          query={query}
          onQueryChange={setQuery}
          repos={repos}
          kinds={kinds}
          onToggleRepo={(repo) =>
            setRepos((prev) => (prev.includes(repo) ? prev.filter((r) => r !== repo) : [...prev, repo]))
          }
          onToggleKind={(kind) =>
            setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))
          }
          onClearFilters={() => {
            setRepos([])
            setKinds([])
          }}
          results={results}
          selectedJourneyId={journey?.id ?? null}
          onSelectJourney={selectJourney}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          {journey ? (
            <div className="flex min-h-[70vh] min-w-0 flex-1 flex-col lg:min-h-0">
              <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">{journey.name}</h2>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {journey.domain}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <GitBranch className="size-3" aria-hidden="true" />
                    {journeyRepos(journey).length} repos · {journey.steps.length} steps ·{" "}
                    {journey.edges.length} hops
                  </span>
                </div>
                <p className="max-w-3xl text-pretty text-[13px] leading-relaxed text-muted-foreground">
                  {journey.description}
                </p>
              </div>

              <JourneyGraph
                journey={journey}
                matchedStepIds={active?.matchedStepIds ?? []}
                selectedStepId={selectedStepId}
                onSelectStep={(id) => setSelectedStepId((prev) => (prev === id ? null : id))}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Pick a journey to see how its data flows across repositories.
            </div>
          )}

          {journey && selectedStep ? (
            <StepInspector
              journey={journey}
              step={selectedStep}
              onClose={() => setSelectedStepId(null)}
              onSelectStep={(id) => setSelectedStepId(id)}
            />
          ) : null}
        </section>
      </div>
    </main>
  )
}
