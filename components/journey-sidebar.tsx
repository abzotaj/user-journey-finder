"use client"

import { Search, X } from "lucide-react"
import { KIND_ICON } from "@/components/kind-visuals"
import { KIND_META, allRepos, journeyRepos } from "@/lib/journeys"
import type { SearchResult, StepKind } from "@/lib/journeys"
import { cn } from "@/lib/utils"

const KIND_ORDER: StepKind[] = ["page", "api", "service", "db", "queue", "external"]

type Props = {
  query: string
  onQueryChange: (value: string) => void
  repos: string[]
  kinds: StepKind[]
  onToggleRepo: (repo: string) => void
  onToggleKind: (kind: StepKind) => void
  onClearFilters: () => void
  results: SearchResult[]
  selectedJourneyId: string | null
  onSelectJourney: (id: string) => void
}

export function JourneySidebar({
  query,
  onQueryChange,
  repos,
  kinds,
  onToggleRepo,
  onToggleKind,
  onClearFilters,
  results,
  selectedJourneyId,
  onSelectJourney,
}: Props) {
  const hasFilters = repos.length > 0 || kinds.length > 0

  return (
    <div className="flex w-full flex-col border-b border-border bg-card lg:w-96 lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Search user journeys</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search journeys, repos, files, endpoints, tables…"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-flow focus:ring-2 focus:ring-flow/25"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : null}
        </label>

        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((kind) => {
            const Icon = KIND_ICON[kind]
            const active = kinds.includes(kind)
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onToggleKind(kind)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition",
                  active
                    ? "border-flow bg-flow text-flow-foreground"
                    : "border-border text-muted-foreground hover:border-flow/50 hover:text-foreground",
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                {KIND_META[kind].short}
              </button>
            )
          })}
        </div>

        <details className="group">
          <summary className="cursor-pointer list-none text-[11px] uppercase tracking-wide text-muted-foreground transition hover:text-foreground">
            Filter by repository {repos.length ? `(${repos.length})` : ""}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allRepos.map((repo) => {
              const active = repos.includes(repo)
              return (
                <button
                  key={repo}
                  type="button"
                  onClick={() => onToggleRepo(repo)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[10px] transition",
                    active
                      ? "border-flow bg-flow/15 text-flow"
                      : "border-border text-muted-foreground hover:border-flow/50 hover:text-foreground",
                  )}
                >
                  {repo}
                </button>
              )
            })}
          </div>
        </details>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {results.length} journey{results.length === 1 ? "" : "s"} matched
          </span>
          {hasFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-md px-1.5 py-0.5 text-flow transition hover:bg-muted"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      <ul className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto p-3 lg:max-h-none lg:flex-1">
        {results.map(({ journey, matchedStepIds }) => {
          const selected = journey.id === selectedJourneyId
          return (
            <li key={journey.id}>
              <button
                type="button"
                onClick={() => onSelectJourney(journey.id)}
                aria-current={selected}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition",
                  selected
                    ? "border-flow bg-flow/10"
                    : "border-border bg-background hover:border-flow/50 hover:bg-muted",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{journey.name}</span>
                  <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {journey.domain}
                  </span>
                </div>
                <p className="line-clamp-2 text-pretty text-[12px] leading-relaxed text-muted-foreground">
                  {journey.description}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {journeyRepos(journey)
                    .slice(0, 3)
                    .map((repo) => (
                      <span
                        key={repo}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {repo}
                      </span>
                    ))}
                  {journeyRepos(journey).length > 3 ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      +{journeyRepos(journey).length - 3} more
                    </span>
                  ) : null}
                </div>
                {matchedStepIds.length ? (
                  <span className="font-mono text-[10px] text-flow">
                    {matchedStepIds.length} matching step{matchedStepIds.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
        {results.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-6 text-center text-[13px] leading-relaxed text-muted-foreground">
            No journeys match that query. Try a repo name, a file path fragment, an endpoint, a table
            or a vendor.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
