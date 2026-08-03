export type StepKind = "page" | "api" | "service" | "db" | "queue" | "external" | "infra"

/** Present on steps/edges produced by a trizo-horus scan; absent on hand-authored sample data. */
export type Confidence = "low" | "medium" | "high"

export type SourceRef = {
  file: string
  startLine: number
  endLine: number
}

export type Step = {
  id: string
  repo: string
  kind: StepKind
  label: string
  file: string
  /** Framework / runtime hint, e.g. "React route", "Express handler" */
  tech?: string
  /** HTTP route or RPC method exposed by this step */
  endpoint?: string
  /** Database + table for db steps */
  datastore?: string
  tables?: string[]
  /** Third-party vendor for external steps */
  vendor?: string
  notes?: string
  sourceRef?: SourceRef
  confidence?: Confidence
}

export type Edge = {
  from: string
  to: string
  label: string
  transport: "http" | "grpc" | "event" | "sql" | "https" | "websocket"
  confidence?: Confidence
}

export type Journey = {
  id: string
  name: string
  domain: string
  description: string
  entry: string
  tags: string[]
  steps: Step[]
  edges: Edge[]
}

export const KIND_META: Record<StepKind, { label: string; short: string }> = {
  page: { label: "Client page / route", short: "Client" },
  api: { label: "API endpoint", short: "API" },
  service: { label: "Internal service", short: "Service" },
  db: { label: "Database write / read", short: "Database" },
  queue: { label: "Queue / event bus", short: "Queue" },
  external: { label: "Third-party API", short: "3rd party" },
  infra: { label: "Infrastructure / provisioning", short: "Infra" },
}

export const TRANSPORT_LABEL: Record<Edge["transport"], string> = {
  http: "HTTP",
  https: "HTTPS",
  grpc: "gRPC",
  event: "Event",
  sql: "SQL",
  websocket: "WS",
}

export const journeys: Journey[] = [
  {
    id: "registration",
    name: "Registration",
    domain: "Identity",
    description:
      "A visitor signs up from the marketing web app. The gateway validates the payload, the identity service persists the account, and welcome email + analytics fan out asynchronously.",
    tags: ["signup", "auth", "email", "onboarding"],
    entry: "reg-page",
    steps: [
      {
        id: "reg-page",
        repo: "acme-web",
        kind: "page",
        label: "Sign up form",
        file: "app/(auth)/register/page.tsx",
        tech: "React page · Next.js App Router",
        endpoint: "/register",
        notes: "Client component submits to the gateway via `useRegisterMutation` in lib/api/auth.ts.",
      },
      {
        id: "reg-api",
        repo: "acme-api-gateway",
        kind: "api",
        label: "POST /v1/auth/register",
        file: "src/routes/auth/register.controller.ts",
        tech: "NestJS controller",
        endpoint: "POST /v1/auth/register",
        notes: "Validates the DTO with zod, rate limits by IP, then forwards to identity over gRPC.",
      },
      {
        id: "reg-identity",
        repo: "acme-identity-svc",
        kind: "service",
        label: "CreateUser handler",
        file: "internal/handler/create_user.go",
        tech: "Go gRPC service",
        endpoint: "identity.v1.Identity/CreateUser",
        notes: "Hashes the password with argon2id and opens a transaction before publishing user.created.",
      },
      {
        id: "reg-db",
        repo: "acme-identity-svc",
        kind: "db",
        label: "Insert user + credential",
        file: "internal/store/postgres/users.go",
        tech: "pgx",
        datastore: "Postgres · identity-primary",
        tables: ["users", "credentials", "audit_log"],
      },
      {
        id: "reg-bus",
        repo: "acme-events",
        kind: "queue",
        label: "user.created topic",
        file: "contracts/user/created.v2.avsc",
        tech: "Kafka topic contract",
        notes: "Schema owned by the events repo; consumers pin the v2 subject.",
      },
      {
        id: "reg-notify",
        repo: "acme-notification-svc",
        kind: "service",
        label: "Welcome email consumer",
        file: "src/consumers/user-created.consumer.ts",
        tech: "Node consumer",
      },
      {
        id: "reg-sendgrid",
        repo: "acme-notification-svc",
        kind: "external",
        label: "Send transactional email",
        file: "src/providers/sendgrid.client.ts",
        vendor: "SendGrid · POST /v3/mail/send",
        tech: "REST client",
      },
      {
        id: "reg-analytics",
        repo: "acme-analytics-svc",
        kind: "service",
        label: "Signup funnel projection",
        file: "workers/signup_funnel.py",
        tech: "Python worker",
      },
      {
        id: "reg-warehouse",
        repo: "acme-analytics-svc",
        kind: "db",
        label: "Upsert funnel rollup",
        file: "workers/sinks/warehouse.py",
        datastore: "Snowflake · ANALYTICS",
        tables: ["fct_signup", "dim_user"],
      },
    ],
    edges: [
      { from: "reg-page", to: "reg-api", label: "fetch signup payload", transport: "https" },
      { from: "reg-api", to: "reg-identity", label: "CreateUser", transport: "grpc" },
      { from: "reg-identity", to: "reg-db", label: "INSERT ... RETURNING id", transport: "sql" },
      { from: "reg-identity", to: "reg-bus", label: "publish user.created", transport: "event" },
      { from: "reg-bus", to: "reg-notify", label: "consume", transport: "event" },
      { from: "reg-bus", to: "reg-analytics", label: "consume", transport: "event" },
      { from: "reg-notify", to: "reg-sendgrid", label: "welcome template", transport: "https" },
      { from: "reg-analytics", to: "reg-warehouse", label: "MERGE INTO", transport: "sql" },
    ],
  },
  {
    id: "checkout",
    name: "Checkout & payment",
    domain: "Commerce",
    description:
      "Cart review through payment capture. The order service reserves inventory synchronously and settles the charge with Stripe before emitting order.paid.",
    tags: ["payments", "stripe", "orders", "inventory"],
    entry: "co-page",
    steps: [
      {
        id: "co-page",
        repo: "acme-web",
        kind: "page",
        label: "Checkout review",
        file: "app/checkout/page.tsx",
        tech: "React page · Next.js App Router",
        endpoint: "/checkout",
        notes: "Server component loads the cart; the pay button posts from components/checkout/pay-button.tsx.",
      },
      {
        id: "co-mobile",
        repo: "acme-mobile",
        kind: "page",
        label: "Checkout screen",
        file: "src/screens/CheckoutScreen.tsx",
        tech: "React Native screen",
        endpoint: "Checkout",
      },
      {
        id: "co-api",
        repo: "acme-api-gateway",
        kind: "api",
        label: "POST /v1/orders",
        file: "src/routes/orders/create-order.controller.ts",
        tech: "NestJS controller",
        endpoint: "POST /v1/orders",
        notes: "Attaches an idempotency key derived from the cart id before calling the order service.",
      },
      {
        id: "co-order",
        repo: "acme-order-svc",
        kind: "service",
        label: "PlaceOrder saga",
        file: "src/domain/place-order.saga.ts",
        tech: "Node service",
        endpoint: "order.v1.Orders/PlaceOrder",
      },
      {
        id: "co-orderdb",
        repo: "acme-order-svc",
        kind: "db",
        label: "Insert order + line items",
        file: "src/infra/repositories/order.repository.ts",
        datastore: "Postgres · orders-primary",
        tables: ["orders", "order_items", "outbox"],
      },
      {
        id: "co-inventory",
        repo: "acme-inventory-svc",
        kind: "service",
        label: "ReserveStock",
        file: "app/services/reserve_stock.rb",
        tech: "Rails service object",
        endpoint: "POST /internal/reservations",
      },
      {
        id: "co-invdb",
        repo: "acme-inventory-svc",
        kind: "db",
        label: "Decrement available units",
        file: "app/models/stock_level.rb",
        datastore: "MySQL · inventory",
        tables: ["stock_levels", "reservations"],
      },
      {
        id: "co-billing",
        repo: "acme-billing-svc",
        kind: "service",
        label: "CapturePayment",
        file: "src/payments/capture-payment.ts",
        tech: "Node service",
        endpoint: "billing.v1.Billing/CapturePayment",
      },
      {
        id: "co-stripe",
        repo: "acme-billing-svc",
        kind: "external",
        label: "Create payment intent",
        file: "src/payments/providers/stripe.gateway.ts",
        vendor: "Stripe · POST /v1/payment_intents",
      },
      {
        id: "co-bus",
        repo: "acme-events",
        kind: "queue",
        label: "order.paid topic",
        file: "contracts/order/paid.v1.avsc",
        tech: "Kafka topic contract",
      },
      {
        id: "co-notify",
        repo: "acme-notification-svc",
        kind: "service",
        label: "Receipt email consumer",
        file: "src/consumers/order-paid.consumer.ts",
        tech: "Node consumer",
      },
    ],
    edges: [
      { from: "co-page", to: "co-api", label: "POST cart snapshot", transport: "https" },
      { from: "co-mobile", to: "co-api", label: "POST cart snapshot", transport: "https" },
      { from: "co-api", to: "co-order", label: "PlaceOrder", transport: "grpc" },
      { from: "co-order", to: "co-orderdb", label: "INSERT (tx)", transport: "sql" },
      { from: "co-order", to: "co-inventory", label: "reserve units", transport: "http" },
      { from: "co-inventory", to: "co-invdb", label: "UPDATE ... FOR UPDATE", transport: "sql" },
      { from: "co-order", to: "co-billing", label: "CapturePayment", transport: "grpc" },
      { from: "co-billing", to: "co-stripe", label: "confirm charge", transport: "https" },
      { from: "co-order", to: "co-bus", label: "publish order.paid", transport: "event" },
      { from: "co-bus", to: "co-notify", label: "consume", transport: "event" },
    ],
  },
  {
    id: "login",
    name: "Login & session",
    domain: "Identity",
    description:
      "Password login with device risk scoring. The gateway mints the session cookie while the identity service checks credentials and Redis-backed lockouts.",
    tags: ["auth", "session", "redis", "risk"],
    entry: "li-page",
    steps: [
      {
        id: "li-page",
        repo: "acme-web",
        kind: "page",
        label: "Login form",
        file: "app/(auth)/login/page.tsx",
        tech: "React page · Next.js App Router",
        endpoint: "/login",
      },
      {
        id: "li-api",
        repo: "acme-api-gateway",
        kind: "api",
        label: "POST /v1/auth/login",
        file: "src/routes/auth/login.controller.ts",
        tech: "NestJS controller",
        endpoint: "POST /v1/auth/login",
        notes: "Sets an HttpOnly session cookie and forwards the device fingerprint header.",
      },
      {
        id: "li-identity",
        repo: "acme-identity-svc",
        kind: "service",
        label: "VerifyCredential",
        file: "internal/handler/verify_credential.go",
        tech: "Go gRPC service",
        endpoint: "identity.v1.Identity/VerifyCredential",
      },
      {
        id: "li-db",
        repo: "acme-identity-svc",
        kind: "db",
        label: "Read credential hash",
        file: "internal/store/postgres/credentials.go",
        datastore: "Postgres · identity-primary",
        tables: ["credentials", "users"],
      },
      {
        id: "li-redis",
        repo: "acme-identity-svc",
        kind: "db",
        label: "Attempt counter + lockout",
        file: "internal/store/redis/lockout.go",
        datastore: "Redis · identity-cache",
        tables: ["login:attempts:*", "session:*"],
      },
      {
        id: "li-risk",
        repo: "acme-risk-svc",
        kind: "service",
        label: "ScoreLoginAttempt",
        file: "src/scoring/login_attempt.rs",
        tech: "Rust service",
        endpoint: "POST /internal/score",
      },
      {
        id: "li-maxmind",
        repo: "acme-risk-svc",
        kind: "external",
        label: "IP reputation lookup",
        file: "src/providers/maxmind.rs",
        vendor: "MaxMind minFraud · POST /minfraud/v2.0/score",
      },
    ],
    edges: [
      { from: "li-page", to: "li-api", label: "credentials", transport: "https" },
      { from: "li-api", to: "li-identity", label: "VerifyCredential", transport: "grpc" },
      { from: "li-identity", to: "li-db", label: "SELECT hash", transport: "sql" },
      { from: "li-identity", to: "li-redis", label: "INCR / EXPIRE", transport: "sql" },
      { from: "li-api", to: "li-risk", label: "score attempt", transport: "http" },
      { from: "li-risk", to: "li-maxmind", label: "device + IP", transport: "https" },
    ],
  },
  {
    id: "search",
    name: "Product search",
    domain: "Discovery",
    description:
      "Catalog search served from OpenSearch, kept warm by an indexer that consumes product change events and enriches them with a pricing lookup.",
    tags: ["search", "opensearch", "indexing", "catalog"],
    entry: "se-page",
    steps: [
      {
        id: "se-page",
        repo: "acme-web",
        kind: "page",
        label: "Search results",
        file: "app/search/page.tsx",
        tech: "React page · Next.js App Router",
        endpoint: "/search?q=",
      },
      {
        id: "se-api",
        repo: "acme-api-gateway",
        kind: "api",
        label: "GET /v1/search",
        file: "src/routes/search/search.controller.ts",
        tech: "NestJS controller",
        endpoint: "GET /v1/search",
      },
      {
        id: "se-svc",
        repo: "acme-search-svc",
        kind: "service",
        label: "Query builder",
        file: "src/query/build_query.ts",
        tech: "Node service",
        endpoint: "POST /internal/query",
      },
      {
        id: "se-index",
        repo: "acme-search-svc",
        kind: "db",
        label: "Read products index",
        file: "src/clients/opensearch.client.ts",
        datastore: "OpenSearch · catalog",
        tables: ["products_v7"],
      },
      {
        id: "se-indexer",
        repo: "acme-search-indexer",
        kind: "service",
        label: "Product change consumer",
        file: "cmd/indexer/main.go",
        tech: "Go consumer",
      },
      {
        id: "se-bus",
        repo: "acme-events",
        kind: "queue",
        label: "product.updated topic",
        file: "contracts/product/updated.v3.avsc",
        tech: "Kafka topic contract",
      },
      {
        id: "se-pricing",
        repo: "acme-pricing-svc",
        kind: "service",
        label: "Resolve effective price",
        file: "src/pricing/resolve.ts",
        tech: "Node service",
        endpoint: "POST /internal/prices:resolve",
      },
    ],
    edges: [
      { from: "se-page", to: "se-api", label: "query string", transport: "https" },
      { from: "se-api", to: "se-svc", label: "search request", transport: "http" },
      { from: "se-svc", to: "se-index", label: "_search", transport: "sql" },
      { from: "se-bus", to: "se-indexer", label: "consume", transport: "event" },
      { from: "se-indexer", to: "se-pricing", label: "enrich price", transport: "http" },
      { from: "se-indexer", to: "se-index", label: "_bulk index", transport: "sql" },
    ],
  },
  {
    id: "support-ticket",
    name: "Support ticket",
    domain: "Support",
    description:
      "In-app help widget creates a ticket, mirrors it into Zendesk, and streams status back to the customer over websockets.",
    tags: ["support", "zendesk", "websocket", "attachments"],
    entry: "st-page",
    steps: [
      {
        id: "st-page",
        repo: "acme-web",
        kind: "page",
        label: "Help widget",
        file: "components/support/help-widget.tsx",
        tech: "React client component",
        endpoint: "/help (overlay route)",
      },
      {
        id: "st-api",
        repo: "acme-api-gateway",
        kind: "api",
        label: "POST /v1/tickets",
        file: "src/routes/support/create-ticket.controller.ts",
        tech: "NestJS controller",
        endpoint: "POST /v1/tickets",
      },
      {
        id: "st-svc",
        repo: "acme-support-svc",
        kind: "service",
        label: "CreateTicket use case",
        file: "src/usecases/create_ticket.py",
        tech: "FastAPI service",
        endpoint: "POST /internal/tickets",
      },
      {
        id: "st-db",
        repo: "acme-support-svc",
        kind: "db",
        label: "Insert ticket",
        file: "src/repositories/tickets.py",
        datastore: "Postgres · support",
        tables: ["tickets", "ticket_events"],
      },
      {
        id: "st-files",
        repo: "acme-support-svc",
        kind: "external",
        label: "Store attachments",
        file: "src/adapters/s3_storage.py",
        vendor: "AWS S3 · PutObject",
      },
      {
        id: "st-zendesk",
        repo: "acme-support-svc",
        kind: "external",
        label: "Mirror ticket",
        file: "src/adapters/zendesk_client.py",
        vendor: "Zendesk · POST /api/v2/tickets",
      },
      {
        id: "st-realtime",
        repo: "acme-realtime-svc",
        kind: "service",
        label: "Ticket status channel",
        file: "src/channels/ticket.channel.ts",
        tech: "Node websocket server",
        endpoint: "WS /ws/tickets/:id",
      },
    ],
    edges: [
      { from: "st-page", to: "st-api", label: "ticket + files", transport: "https" },
      { from: "st-api", to: "st-svc", label: "create ticket", transport: "http" },
      { from: "st-svc", to: "st-db", label: "INSERT", transport: "sql" },
      { from: "st-svc", to: "st-files", label: "upload attachment", transport: "https" },
      { from: "st-svc", to: "st-zendesk", label: "sync ticket", transport: "https" },
      { from: "st-svc", to: "st-realtime", label: "status update", transport: "event" },
      { from: "st-realtime", to: "st-page", label: "push status", transport: "websocket" },
    ],
  },
  {
    id: "subscription-renewal",
    name: "Subscription renewal",
    domain: "Billing",
    description:
      "Nightly cron renews active subscriptions, charges the saved payment method, writes invoices, and pushes revenue rows to the warehouse.",
    tags: ["billing", "cron", "invoices", "stripe", "dunning"],
    entry: "sr-cron",
    steps: [
      {
        id: "sr-cron",
        repo: "acme-billing-svc",
        kind: "api",
        label: "Renewal cron trigger",
        file: "src/jobs/renew-subscriptions.job.ts",
        tech: "Cron entry point",
        endpoint: "cron: 0 3 * * *",
      },
      {
        id: "sr-admin",
        repo: "acme-admin-console",
        kind: "page",
        label: "Manual retry action",
        file: "src/pages/billing/renewals.tsx",
        tech: "React page · Vite SPA",
        endpoint: "/billing/renewals",
      },
      {
        id: "sr-svc",
        repo: "acme-billing-svc",
        kind: "service",
        label: "RenewSubscription",
        file: "src/subscriptions/renew-subscription.ts",
        tech: "Node service",
      },
      {
        id: "sr-db",
        repo: "acme-billing-svc",
        kind: "db",
        label: "Write invoice + attempt",
        file: "src/infra/repositories/invoice.repository.ts",
        datastore: "Postgres · billing-primary",
        tables: ["invoices", "charge_attempts", "subscriptions"],
      },
      {
        id: "sr-stripe",
        repo: "acme-billing-svc",
        kind: "external",
        label: "Charge saved card",
        file: "src/payments/providers/stripe.gateway.ts",
        vendor: "Stripe · POST /v1/charges",
      },
      {
        id: "sr-tax",
        repo: "acme-billing-svc",
        kind: "external",
        label: "Calculate tax",
        file: "src/tax/avalara.client.ts",
        vendor: "Avalara AvaTax · POST /transactions/create",
      },
      {
        id: "sr-bus",
        repo: "acme-events",
        kind: "queue",
        label: "invoice.settled topic",
        file: "contracts/invoice/settled.v1.avsc",
        tech: "Kafka topic contract",
      },
      {
        id: "sr-notify",
        repo: "acme-notification-svc",
        kind: "service",
        label: "Dunning email consumer",
        file: "src/consumers/invoice-settled.consumer.ts",
        tech: "Node consumer",
      },
      {
        id: "sr-analytics",
        repo: "acme-analytics-svc",
        kind: "db",
        label: "Append revenue rows",
        file: "workers/sinks/revenue.py",
        datastore: "Snowflake · ANALYTICS",
        tables: ["fct_revenue"],
      },
    ],
    edges: [
      { from: "sr-cron", to: "sr-svc", label: "batch of due subs", transport: "http" },
      { from: "sr-admin", to: "sr-svc", label: "retry renewal", transport: "https" },
      { from: "sr-svc", to: "sr-tax", label: "tax quote", transport: "https" },
      { from: "sr-svc", to: "sr-stripe", label: "capture amount", transport: "https" },
      { from: "sr-svc", to: "sr-db", label: "INSERT invoice", transport: "sql" },
      { from: "sr-svc", to: "sr-bus", label: "publish invoice.settled", transport: "event" },
      { from: "sr-bus", to: "sr-notify", label: "consume", transport: "event" },
      { from: "sr-bus", to: "sr-analytics", label: "consume", transport: "event" },
    ],
  },
]

export const allRepos = allReposIn(journeys)

/** Distinct, sorted repo names across an arbitrary set of journeys (e.g. a loaded scan, not just the sample data). */
export function allReposIn(list: Journey[]) {
  return Array.from(new Set(list.flatMap((j) => j.steps.map((s) => s.repo)))).sort()
}

/** Everything about a step that is searchable, lowercased. */
export function stepHaystack(step: Step) {
  return [step.repo, step.label, step.file, step.tech, step.endpoint, step.datastore, step.vendor, step.notes, ...(step.tables ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function journeyHaystack(journey: Journey) {
  return [journey.name, journey.domain, journey.description, ...journey.tags, ...journey.steps.map(stepHaystack), ...journey.edges.map((e) => e.label)]
    .join(" ")
    .toLowerCase()
}

export type SearchResult = {
  journey: Journey
  matchedStepIds: string[]
  score: number
}

export function searchJourneys(
  list: Journey[],
  query: string,
  filters: { repos: string[]; kinds: StepKind[] },
): SearchResult[] {
  const q = query.trim().toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)

  return list
    .map<SearchResult | null>((journey) => {
      if (filters.repos.length && !journey.steps.some((s) => filters.repos.includes(s.repo))) return null
      if (filters.kinds.length && !journey.steps.some((s) => filters.kinds.includes(s.kind))) return null

      const hay = journeyHaystack(journey)
      if (terms.length && !terms.every((t) => hay.includes(t))) return null

      const matchedStepIds = terms.length
        ? journey.steps.filter((s) => terms.some((t) => stepHaystack(s).includes(t))).map((s) => s.id)
        : []

      let score = matchedStepIds.length
      if (terms.length && terms.every((t) => journey.name.toLowerCase().includes(t))) score += 10
      if (terms.length && journey.tags.some((tag) => terms.includes(tag.toLowerCase()))) score += 4

      return { journey, matchedStepIds, score }
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score || list.indexOf(a.journey) - list.indexOf(b.journey))
}

/* ---------------------------------- layout --------------------------------- */

export const NODE_W = 232
export const NODE_H = 92
const COL_GAP = 208
const ROW_GAP = 32
const PAD_X = 28
const PAD_Y = 28

export type PositionedNode = Step & { x: number; y: number; layer: number }
export type LayoutEdge = Edge & { path: string; midX: number; midY: number; backward: boolean }
export type Layout = {
  nodes: PositionedNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

/** Longest-path layering over the journey DAG (cycle safe). */
function computeLayers(journey: Journey) {
  const layer = new Map<string, number>()
  journey.steps.forEach((s) => layer.set(s.id, 0))

  const outgoing = new Map<string, Edge[]>()
  journey.edges.forEach((e) => {
    outgoing.set(e.from, [...(outgoing.get(e.from) ?? []), e])
  })

  const roots = journey.steps
    .filter((s) => !journey.edges.some((e) => e.to === s.id) || s.id === journey.entry)
    .map((s) => s.id)

  const queue: Array<{ id: string; depth: number; seen: Set<string> }> = roots.map((id) => ({
    id,
    depth: 0,
    seen: new Set([id]),
  }))

  while (queue.length) {
    const { id, depth, seen } = queue.shift()!
    layer.set(id, Math.max(layer.get(id) ?? 0, depth))
    for (const edge of outgoing.get(id) ?? []) {
      if (seen.has(edge.to)) continue
      queue.push({ id: edge.to, depth: depth + 1, seen: new Set([...seen, edge.to]) })
    }
  }

  return layer
}

export function layoutJourney(journey: Journey): Layout {
  const layerOf = computeLayers(journey)

  const byLayer = new Map<number, Step[]>()
  journey.steps.forEach((step) => {
    const l = layerOf.get(step.id) ?? 0
    byLayer.set(l, [...(byLayer.get(l) ?? []), step])
  })

  const layers = Array.from(byLayer.keys()).sort((a, b) => a - b)
  const tallest = Math.max(...layers.map((l) => byLayer.get(l)!.length))
  const contentH = tallest * NODE_H + (tallest - 1) * ROW_GAP

  const nodes: PositionedNode[] = []
  layers.forEach((l) => {
    const column = byLayer.get(l)!
    const colH = column.length * NODE_H + (column.length - 1) * ROW_GAP
    const offsetY = PAD_Y + (contentH - colH) / 2
    column.forEach((step, i) => {
      nodes.push({
        ...step,
        layer: l,
        x: PAD_X + l * (NODE_W + COL_GAP),
        y: offsetY + i * (NODE_H + ROW_GAP),
      })
    })
  })

  const pos = new Map(nodes.map((n) => [n.id, n]))

  const edges: LayoutEdge[] = journey.edges.flatMap((edge): LayoutEdge[] => {
    const a = pos.get(edge.from)
    const b = pos.get(edge.to)
    if (!a || !b) return []

    const backward = b.x <= a.x
    const x1 = backward ? a.x : a.x + NODE_W
    const y1 = a.y + NODE_H / 2
    const x2 = backward ? b.x + NODE_W : b.x
    const y2 = b.y + NODE_H / 2

    let path: string
    if (backward) {
      const dip = Math.max(a.y, b.y) + NODE_H + 26
      path = `M ${x1} ${y1} C ${x1 - 60} ${y1}, ${x1 - 60} ${dip}, ${(x1 + x2) / 2} ${dip} C ${x2 + 60} ${dip}, ${x2 + 60} ${y2}, ${x2} ${y2}`
      return [{ ...edge, path, midX: (x1 + x2) / 2, midY: dip, backward }]
    }

    const dx = Math.max(40, (x2 - x1) / 2)
    path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

    // Keep the label inside the first column gap so it never sits on top of a node.
    const spansLayers = b.layer - a.layer > 1
    const midX = spansLayers ? x1 + COL_GAP / 2 : (x1 + x2) / 2
    const t = x2 === x1 ? 0.5 : (midX - x1) / (x2 - x1)
    const midY = y1 + (y2 - y1) * t

    return [{ ...edge, path, midX, midY, backward }]
  })

  const width = PAD_X * 2 + layers.length * NODE_W + (layers.length - 1) * COL_GAP
  const height = PAD_Y * 2 + contentH + 80

  return { nodes, edges, width, height }
}

export function journeyRepos(journey: Journey) {
  return Array.from(new Set(journey.steps.map((s) => s.repo)))
}
