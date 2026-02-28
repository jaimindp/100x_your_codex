# Mermaid + Linear DAG Research

## Goal
Build a website that visualizes Linear issues as an interactive DAG.

## How Mermaid Charts Are Rendered
- Mermaid can render by scanning DOM nodes (`mermaid.run`) or by direct API call (`mermaid.render`).
- `mermaid.render(id, definition)` returns SVG and optional `bindFunctions` for event wiring.
- Interactivity in flowcharts uses `click` directives (callbacks/links/tooltips).
- `securityLevel` affects interactivity:
  - `strict` limits callbacks/HTML features
  - `loose` enables richer click interactions
- Flowchart layout options include Dagre and ELK (ELK is useful for larger DAG-style layouts).

## Is Mermaid Enough for an Interactive Linear Graph?
Mermaid is good for:
- Fast prototype
- Readable graph syntax
- Basic click-based interaction

Mermaid is weaker for:
- Advanced node UX (custom React-like node content/components)
- Rich drag/drop graph editing
- Large-graph app-style interactions and state management

Conclusion: Mermaid works for MVP/read-mostly exploration. For product-level interactivity, a graph UI library is stronger.

## Alternatives That Take DAG/Graph Data and Build Interactive Views

### 1) React Flow (Recommended)
Best fit for app-like interactivity:
- Custom nodes/edges
- Zoom/pan/minimap/controls
- Strong event model
- Works well with layout engines (Dagre/ELK)

### 2) Cytoscape.js
Strong general-purpose graph visualization:
- Powerful graph interactions and styling
- Good for medium/large networks
- More “graph engine” feel

### 3) vis-network
Fast to get started:
- Built-in interaction and hierarchical layouts
- Solid for simple network UIs

## Linear Data Model + Integration Notes
- Linear exposes a GraphQL API at `https://api.linear.app/graphql`.
- Webhooks are available for near-real-time sync updates.
- Issue relationships can be mapped to edges:
  - Parent/sub-issue
  - Blocks/blocked-by
  - Related
  - Duplicate

## Recommended Architecture
For long-term product quality:
1. Frontend: React + React Flow
2. Layout: ELK (fallback Dagre)
3. Backend: service that syncs Linear GraphQL + webhook updates
4. Data model:
   - Node = issue
   - Edge type = parent, blocks, related, duplicate
5. UX:
   - Filters (team, assignee, state, label, priority)
   - Search by identifier/title
   - Side panel with issue details/actions
   - Click-through to Linear issue URL

## Prototype Status in This Workspace
A Mermaid prototype is implemented inside:
- `/Users/jaimin/Documents/Vault/Hacks/Monitor/`

It currently:
- Loads team issues from Linear GraphQL
- Renders parent → sub-issue DAG
- Supports node click to inspect issue details

## Sources
- Mermaid usage/API: https://mermaid.js.org/config/usage.html
- Mermaid flowchart syntax/click/renderer: https://mermaid.js.org/syntax/flowchart.html
- Mermaid source (`run` behavior): https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/src/mermaid.ts
- React Flow custom nodes: https://reactflow.dev/learn/customization/custom-nodes
- React Flow layouting: https://reactflow.dev/learn/layouting/layouting
- Cytoscape.js docs: https://js.cytoscape.org/
- vis-network docs: https://visjs.github.io/vis-network/docs/network/
- Linear GraphQL docs: https://linear.app/developers/graphql
- Linear webhooks: https://linear.app/developers/webhooks
- Linear issue relations docs: https://linear.app/docs/issue-relations
