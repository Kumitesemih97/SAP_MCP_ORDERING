# SAP MCP Ordering System

> **Prototype / Demo — not production software.**
> This was built out of pure personal interest to explore what a conversational SAP procurement interface might look like when wired to a local LLM via the Model Context Protocol. Nothing here is affiliated with, endorsed by, or connected to SAP SE or Anthropic.

---

## What is this?

A browser-based chat interface where you describe a purchase order in plain English and an AI agent figures out the rest — material, vendor, quantity validation, delivery date — by calling real SAP-style tools through the official [Model Context Protocol](https://modelcontextprotocol.io/) SDK.

The "SAP backend" is entirely mocked in memory. No SAP system is connected. The point was to prototype the *interaction pattern*, not build production software.

---

## How it works

```
Browser (chat UI)
    │
    ▼
Express server  (server.ts)
    │  POST /api/chat
    ├─► Gemma4 31B via Ollama   ← decides which SAP tool to call
    │       returns {"tool_call": {"name": "...", "args": {...}}}
    │
    ├─► MCP Server  (mcp-server.ts, stdio transport)
    │       executes the tool, returns structured result
    │
    └─► Gemma4 31B again        ← turns tool result into a human reply
```

The model never hallucinates order data — it calls a tool, gets back real numbers (stock levels, prices, vendor info), and then summarises them.

---

## MCP Tools

Six SAP-style tools are exposed over the MCP stdio transport, each in its own file under `src/tools/`:

| Tool | SAP equivalent | What it does |
|---|---|---|
| `create_purchase_order` | ME21N | Validates stock, picks vendor, generates PO |
| `search_materials` | MM60 | Keyword/category search across catalog |
| `search_vendors` | XK03 | Lookup by name or category specialisation |
| `check_material_stock` | MMBE | Stock level + availability status |
| `get_order_status` | ME23N | Retrieve a created PO by number |
| `post_goods_receipt` | MIGO | Mark order delivered, update stock |

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 + TypeScript 5 |
| Server | Express 5 |
| AI model | Gemma4 31B Cloud via [Ollama](https://ollama.ai) |
| MCP | `@modelcontextprotocol/sdk` (stdio transport) |
| Frontend | Vanilla TypeScript, compiled to `public/` |
| Design | Apple HIG × SAP Fiori Horizon hybrid |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.ai/) installed and running
- An Ollama cloud account (free) — required for `gemma4:31b-cloud`

---

## Quick start

```bash
# Clone and enter the directory
git clone <repo-url>
cd SAP_MCP_ORDERING

# Start everything (checks deps, builds TS, starts server)
./start.sh
```

Or manually:

```bash
npm install
npm start        # builds TypeScript then starts the server
```

Open [http://localhost:3000](http://localhost:3000).

### First-time Ollama sign-in

`gemma4:31b-cloud` requires an Ollama account. The startup script will detect this and offer to run `ollama signin` for you, or you can do it manually:

```bash
ollama signin
# Opens a browser URL — complete auth there
```

The app will also show a sign-in banner in the UI if you open it before authenticating.

### Development mode (auto-reload)

```bash
./start.sh dev
```

---

## Project structure

```
├── server.ts              Express server + MCPBridge + OllamaClient
├── mcp-server.ts          MCP server entry point (stdio transport)
├── start.sh               One-command startup script
├── src/
│   ├── app.ts             Browser-side SAPOrderingSystem class
│   ├── main.ts            Browser entry point + AppInitializer
│   ├── data.ts            Mock materials, vendors, helper functions
│   ├── types.ts           All TypeScript interfaces and types
│   └── tools/             MCP tool handlers (one file per tool)
│       ├── order-store.ts
│       ├── create-purchase-order.ts
│       ├── search-materials.ts
│       ├── search-vendors.ts
│       ├── check-material-stock.ts
│       ├── get-order-status.ts
│       └── post-goods-receipt.ts
└── public/                Compiled JS + static assets (git-ignored)
```

---

## Example interactions

```
You:  Order 50 screws M6x20 urgently from Müller Inc.
AI:   Purchase order PO852463 created — 50 PCS Screws M6x20 from
      Müller Inc. Priority: Urgent. Delivery: 9/13/2026.

You:  How many laptop stands do we have in stock?
AI:   There are currently 25 Laptop Stands available (status: low).
      Min order: 1 PCS, price $89.99 each.

You:  What's the status of PO852463?
AI:   PO852463 is in Created status — 50 PCS Screws M6x20 from
      Müller Inc., delivery due 9/13/2026.
```

---

## Limitations (by design — it's a prototype)

- **No real SAP** — all data is in-memory mock data, reset on server restart
- **No persistence** — orders disappear when the server stops
- **No auth** — single user, no session management
- **Gemma4 tool-calling is prompt-based** — Ollama doesn't yet expose native function-calling for this model; the agent uses a structured JSON prompt to decide which tool to invoke
- **8 materials, 5 vendors** — enough to demo the concept

---

## Disclaimer

This project is a personal experiment. It is not affiliated with SAP SE, Anthropic, or any other company. The SAP transaction codes (ME21N, MIGO, etc.) are used for illustrative purposes only. No real business data is processed.

Built out of curiosity. Use freely, modify freely.
