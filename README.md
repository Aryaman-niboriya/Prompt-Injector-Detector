# 🛡️ SentinelAI — Multi-Modal Threat Injection & Detection Platform

> **A Complete Multi-Modal Security Platform for Securing LLMs against Prompt Injections, Jailbreaks, and Adversarial Manipulation.**  
> Supporting **Prompts (Text)**, **Webpages (HTML)**, and **Documents (PDF)** | **CSD-0703**

---

## 🌟 Platform Highlights

- **💉 Red Team Injector Studio:**
  - **Prompts:** Direct override, Base64/Hex obfuscation, Cyrillic lookalike homoglyphs, zero-width invisible Unicode, DAN roleplay, grandmother emotional framing.
  - **Webpages (HTML):** CSS white-on-white camouflage, microscopic `0px` / `0.1px` font, `display: none`, `opacity: 0`, off-screen positioning (`-9999px`), hidden HTML comments.
  - **Documents (PDF):** Generates real downloadable PDFs with invisible text layer (`RGB 1,1,1`), micro-font (`0.5pt`), and PDF metadata stream injections.
  - Dual-View inspection: *Human-Visible Rendered View* vs *AI-Raw Stream View*.

- **🛡️ Blue Team Detector Gateway:**
  - **Layer 1: Rule-Based Guard (<3ms, ₹0 Cost):** 40+ Regex patterns, Base64/Hex decoders, homoglyph normalization, invisible Unicode flags.
  - **Layer 3: Structural & Visible-vs-Raw Comparator (<5ms, ₹0 Cost):** Inspects HTML DOM and PDF streams for visual concealment discrepancies.
  - **Layer 2: Semantic LLM Guard (Gemini Security Judge):** Catches subtle, indirect, fictional, and emotional manipulations.
  - **Smart Cost Optimization:** 38%+ of attacks blocked at Layer 1/3 with **₹0 API cost**.

- **💻 Cyber-Defense Web Application & REST APIs:**
  - Glassmorphic dark-mode interactive dashboard on `http://localhost:3000`.
  - Full REST API suite for easy integration with agents and microservices.

---

## 🤖 Secure Web-Browsing AI Agent (agent/web-agent.js)

- **Indirect Prompt Injection Defense:** Protects AI Agents from being hijacked when reading external web pages, scraped HTML, or URLs.
- **Pre-Execution Firewall:** Intercepts scraped HTML before sending it to the LLM context.
- **Quarantine Mode:** If hidden CSS/DOM injections (display:none, 0px font, comments) or adversarial prompts are detected, the agent halts execution and returns a security alert.
- **Safe Summarization:** If clean, the agent extracts visible text and produces a safe structured summary using Gemini.

## 📁 Repository Directory Structure

```text
prompt-injector-detector/
├── .env                              # 🔒 Local API Keys (GEMINI_API_KEY) — Never committed
├── .gitignore                        # Git exclusion rules
├── package.json                      # Unified root npm run scripts & dependencies
├── README.md                         # Main project overview & documentation
├── server.js                         # 🚀 Express REST API & Web Platform Server
│
├── public/                           # 💻 Cyber-Security Web UI Dashboard
│   ├── index.html                    # Single-page interface (Injector + Detector tabs)
│   ├── styles.css                    # Glassmorphism cyber-security design system
│   └── app.js                        # Dynamic frontend controller & live scan logic
│
├── docs/                             # 📚 Project Documentation & Research Notes
│   └── project-guide.md              # Research roadmap, syllabus details & evaluation notes
│
├── injector/                         # 💉 Adversarial Attack & Dataset Synthesizer
│   ├── text-injector.js              # Prompt injection generator (6 evasion modes)
│   ├── html-injector.js              # HTML stealth injector (White-text, 0px font, comments)
│   ├── pdf-injector.js               # PDF generator creating real poisoned PDF files
│   ├── clean-content.json            # Base benign / safe prompts
│   ├── attack-phrases.json           # Known adversarial prompt injection seeds
│   ├── generate.js                   # Plain-text dataset synthesizer
│   ├── generate-html.js              # HTML hidden attack synthesizer
│   ├── test-dataset.json             # 50 Generated plain-text test cases
│   └── test-dataset-html.json        # 30 Generated HTML test cases
│
└── detector/                         # 🛡️ Threat Detection Engine
    ├── rule-detector-v2.js           # ⚡ LAYER 1: Rule-Based Guard (40+ regex, encodings, unicode)
    ├── layer3-comparator.js          # 🔍 LAYER 3: Visible-vs-Raw HTML & PDF Comparator
    ├── semantic-guard.js             # 🧠 LAYER 2: Semantic LLM Guard (Gemini Security Judge)
    ├── sentinel-pipeline.js          # 🚀 COMBINED MULTI-MODAL GATEKEEPER
    └── legacy/                       # 📜 Historical Baselines (for Research Comparison)
        ├── rule-detector-v1.js       # V1 baseline (8 basic regexes, 0/5 on unseen attacks)
        └── test-new-attacks-v1.js    # Benchmark demonstrating V1 failure
```

---

## ⚡ How to Run & Use

### 1. Start the Full Web Platform (Dashboard + APIs)
```bash
npm start
```
Open **`http://localhost:3000`** in your browser to interact with both the **Injector Studio** and **Detector Gateway**.

### 2. Run Automated Command Line Tests
```bash
# Run Full Multi-Modal Pipeline Test (Text, HTML & PDF)
npm run test:pipeline

# Run Layer 1 (Rule-Based V2) standalone
npm run test:layer1

# Run Layer 2 (Semantic LLM Guard) standalone
npm run test:layer2

# Run Layer 3 (Visible-vs-Raw Comparator) standalone
npm run test:layer3
```

---

## 🌐 REST API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/inject/text` | `POST` | Generates poisoned prompt with chosen technique |
| `/api/inject/html` | `POST` | Generates poisoned HTML with CSS/DOM stealth camouflage |
| `/api/inject/pdf` | `POST` | Creates valid PDF containing invisible text or metadata injection |
| `/api/download/pdf`| `GET` | Directly downloads a poisoned PDF file |
| `/api/detect/text` | `POST` | Runs multi-layer scan on text prompts |
| `/api/detect/html` | `POST` | Runs multi-layer scan on HTML markup |
| `/api/detect/pdf` | `POST` | Runs multi-layer scan on uploaded PDF file (`multipart/form-data`) |
| `/api/gateway/scan`| `POST` | Unified multi-modal scan gateway endpoint |
| `/api/health` | `GET` | Health status and layer operational status |
