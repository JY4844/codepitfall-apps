# CodePitfall Apps — Non-LLM Deterministic Guardrails × Gemini 3 Flash Suite

> **Zero-login, Apache-2.0 Open-Source Web Apps** combining fast **browser-local deterministic safety engines (0ms, 0 AI tokens)** with **Google Gemini 3 Flash (`gemini-3-flash-preview`)** multimodal reasoning.

- **Live Demo (Zero Login):** https://codepitfall-mirror.vercel.app
- **License:** Apache-2.0

---

## Included Applications

| App | Route | Core Non-LLM Deterministic Engine | Gemini 3 Flash AI Role |
| :--- | :--- | :--- | :--- |
| **🪞 CodePitfall × 🌉 GitBridge** | [`/codemistake`](https://codepitfall-mirror.vercel.app/codemistake) | • **0ms Browser Secret Redactor** (`AIza`/`AQ.`/`ghp_`/`sk-`/`sk-ant-`/`AKIA`/DB URLs) before anything leaves the browser<br>• **Real `.git/hooks/pre-commit` Generator** from Personal Mistake DNA<br>• **Live GitHub Public Repo Auditor** (0–100 score via GitHub REST API)<br>• **Git Safe Recovery Visual Guide** (live branch-name SVG & command sync) | Multimodal error screenshot (Ctrl+V, 1600px Canvas compressed) & stack-trace diagnosis + 1-click `AGENTS.md` export |
| **📄 OtayoriBaton Ultra** | [`/otayori`](https://codepitfall-mirror.vercel.app/otayori) | • Clean empty-state custom household members & persistent `localStorage` checklist<br>• Month-accurate Google Calendar & RFC 5545 `.ics` export<br>• Local original-photo thumbnail archive & Web Speech readout | Multimodal Vision handout parsing + automatic schedule "watch-out / pitfall" cautions + Google Maps route prep |
| **🗺️ MachiEye Live** | [`/machieye`](https://codepitfall-mirror.vercel.app/machieye) | • **Browser-local Canvas Privacy Mosaic/Blur** (Lv.1–3, runs locally before AI upload/save)<br>• Nationwide 1-click municipal reporting desk & hazard map lookup<br>• Local Before/After photo tracking + 480px thumbnail compression | Multimodal hazard severity scoring, barrier-free detour advice & 4-language (JA/EN/ZH/KO) safety cards |
| **🔀 WhatIf Mirror *(Labs)*** | [`/whatif`](https://codepitfall-mirror.vercel.app/whatif) | • 0ms interactive `do(X)` intervention sensitivity SVG branching map<br>• Controlled checklist & local Markdown report export | Structured JSON (`responseSchema`) counterfactual analysis & hidden confounder detection |

---

## Quick Start (Local Development)

```bash
git clone https://github.com/JY4844/codepitfall-apps.git
cd codepitfall-apps
npm install
```

Create `.env.local` (optional — all deterministic non-LLM tools work 100% offline without an API key):

```env
GEMINI_API_KEY="your_google_ai_studio_key"
# Optional: increases GitHub Repo Auditor rate limit from 60/hr to 5,000/hr
GITHUB_TOKEN=""
# Optional: enables interactive Google Maps JS API (zero-config Embed works without it)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000/codemistake`.

---

## Feedback & Contributing

Found a bug or want a new secret pattern / Git recovery guide?
👉 [Open an Issue](https://github.com/JY4844/codepitfall-apps/issues/new)
