# SDLC Generated App

Generated end-to-end by the SDLC Agent Pipeline.

This is a **monorepo**: the Coding agent scaffolds `apps/frontend` and
`apps/backend` for the stack the approver **chose at the design gate** — nothing
is pinned here, so the app is built for the selected stack rather than a fixed
one. Each package is independently runnable and separately deployable.

- **Stack decision & build plan:** see the approved **design artifact**. Its
  `stackDecision` records the chosen option; its `monorepoPlan` is the
  machine-readable, per-package build contract (runtime + install/build/test/
  start commands + ports) that CI and Deployment execute.
- **Transparency:** this application is AI-generated (governance disclosure).
