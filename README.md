# 🛡️ SentinelAI — Prompt Injection & Threat Detection Gateway

> **A Multi-Layered Defense Gateway for Securing LLMs against Prompt Injections, Jailbreaks, and Manipulation Attacks.**  
> Built as an Academic & Production-Ready Security System | **CSD-0703**

---

## 📁 Repository Directory Structure

```text
prompt-injector-detector/
├── .env                              # 🔒 Local API Keys (GEMINI_API_KEY) — Never committed
├── .gitignore                        # Git exclusion rules (.env, node_modules, etc.)
├── package.json                      # Unified root npm run scripts
├── README.md                         # Main project overview & documentation
│
├── docs/                             # 📚 Project Documentation & Reports
│   └── project-guide.md              # Detailed project roadmap, syllabus & research notes
│
├── injector/                         # 💉 Synthetic Attack & Dataset Generator Module
│   ├── package.json                  # Injector module dependencies
│   ├── clean-content.json            # Base benign / normal user prompts
│   ├── attack-phrases.json           # Known adversarial prompt injection seeds
│   ├── generate.js                   # Plain-text dataset synthesizer (50 balanced samples)
│   ├── generate-html.js              # HTML hidden attack synthesizer (white-text/zero-font)
│   ├── test-dataset.json             # 50 Generated plain-text test cases (Malicious + Clean)
│   └── test-dataset-html.json        # 30 Generated HTML test cases for Layer 3 evaluation
│
└── detector/                         # 🛡️ Threat Detection Engine
    ├── package.json                  # Dependencies (@google/generative-ai, dotenv)
    ├── package-lock.json
    │
    ├── rule-detector-v2.js           # ⚡ LAYER 1: Rule-Based & Pattern Detector
    │                                 #    - 40+ Regex patterns across 5 threat classes
    │                                 #    - Base64 / Hex / Binary / ROT13 encoding detection
    │                                 #    - Cyrillic / Greek homoglyph normalization
    │                                 #    - Zero-width & invisible Unicode detection
    │                                 #    - Fuzzy & co-occurrence token matching
    │
    ├── semantic-guard.js             # 🧠 LAYER 2: Semantic LLM Guard (Gemini)
    │                                 #    - LLM-as-a-Security-Judge for subtle & indirect attacks
    │                                 #    - Detects fictional framing, social engineering, roleplay
    │                                 #    - Multi-model automatic fallback (3.5-flash-lite -> 3.6-flash)
    │                                 #    - Exponential backoff retry logic for 503/429 resilience
    │
    ├── sentinel-pipeline.js          # 🚀 COMBINED GATEKEEPER PIPELINE
    │                                 #    - Two-stage smart cascade (Layer 1 -> Layer 2)
    │                                 #    - Ultra-fast 0ms-3ms rejection for obvious attacks (₹0 API cost)
    │                                 #    - Only forwards subtle prompts to Layer 2
    │                                 #    - 100% accuracy & 38%+ cost optimization
    │
    └── legacy/                       # 📜 Historical Baselines (for Research Comparison)
        ├── rule-detector-v1.js       # V1 baseline (8 basic regexes, 0/5 on unseen attacks)
        └── test-new-attacks-v1.js    # Script demonstrating V1 failure on unseen prompts
```

---

## 🔍 File-by-File Breakdown: What Each File Does

### 1. Root Files
| File | Type | Purpose |
|:---|:---|:---|
| `.env` | Config | Stores private Gemini API Key (`GEMINI_API_KEY`). Protected by `.gitignore`. |
| `.gitignore` | Config | Prevents accidental leaks of keys, `.DS_Store`, and `node_modules`. |
| `package.json` | Config | Unified root scripts (`npm run test:pipeline`, `npm run test:layer1`, etc.). |
| `README.md` | Docs | Complete architecture, file directory, and usage guide. |
| `docs/project-guide.md` | Docs | Full research guide, syllabus details, evaluation metrics, and roadmap. |

### 2. Injector Module (`injector/`)
| File | Type | Purpose |
|:---|:---|:---|
| `clean-content.json` | Data | 2 benign paragraphs (weather, machine learning) used as clean baseline. |
| `attack-phrases.json` | Data | Core attack vectors (`direct_override`, `roleplay_jailbreak`). |
| `generate.js` | Script | Synthesizes 50 balanced plain-text samples into `test-dataset.json`. |
| `generate-html.js` | Script | Generates 30 HTML samples embedding hidden attacks using CSS opacity/font-size tricks. |
| `test-dataset.json` | Dataset | 50 evaluated plain-text samples (25 malicious, 25 safe) for Layer 1 testing. |
| `test-dataset-html.json` | Dataset | 30 HTML samples (visible text vs raw HTML) ready for Layer 3 evaluation. |

### 3. Detector Module (`detector/`)
| File | Type | Purpose |
|:---|:---|:---|
| `rule-detector-v2.js` | Core Code | **Layer 1:** 40+ regexes + Base64/Hex decoders + Homoglyphs + Invisible Unicode. Latency: <3ms. Cost: ₹0. |
| `semantic-guard.js` | Core Code | **Layer 2:** Uses Google Gemini (with cascade fallback & retries) as a security judge for subtle attacks. |
| `sentinel-pipeline.js` | Core Code | **Combined Pipeline:** Executes Layer 1 first. If flagged, blocks instantly; otherwise invokes Layer 2. |
| `legacy/rule-detector-v1.js` | Benchmark | Old V1 8-pattern detector kept to demonstrate why rule-only approaches fail in the thesis report. |
| `legacy/test-new-attacks-v1.js`| Benchmark | Benchmark test proving V1 missed 5/5 unseen adversarial attacks. |

---

## ⚡ How to Run & Test

Sabhi commands **root directory** se directly chal sakte hain:

```bash
# 1. Run the Full Combined Pipeline (Layer 1 + Layer 2)
npm run test:pipeline

# 2. Test Layer 1 (Rule-Based V2) standalone against 50 dataset samples
npm run test:layer1

# 3. Test Layer 2 (Semantic LLM Guard) standalone against subtle attacks
npm run test:layer2

# 4. Run Legacy V1 Baseline (to verify evaluation comparison)
npm run test:legacy-v1

# 5. Regenerate Injector Datasets
npm run generate:dataset
npm run generate:html
```

---

## 📊 Performance & Defense Comparison

| Threat Category | Layer 1 (Rule-Based) | Layer 2 (Semantic Guard) | Combined Pipeline |
|:---|:---:|:---:|:---:|
| Direct Keyword Override (`ignore instructions`) | 🚨 Blocked (<3ms, ₹0) | 🚨 Blocked | 🚨 Blocked by Layer 1 (Fast & Free) |
| System Authority Impersonation (`SYSTEM:`) | 🚨 Blocked (<1ms, ₹0) | 🚨 Blocked | 🚨 Blocked by Layer 1 (Fast & Free) |
| Base64 Encoded Payloads (`aWdub3Jl...`) | 🚨 Blocked (<1ms, ₹0) | 🚨 Blocked | 🚨 Blocked by Layer 1 (Fast & Free) |
| Fictional Storytelling Extraction | ❌ Missed | 🚨 Blocked (~900ms) | 🚨 Blocked by Layer 2 |
| Developer Testing Impersonation | ❌ Missed | 🚨 Blocked (~1000ms) | 🚨 Blocked by Layer 2 |
| Grandma Bedtime Story Jailbreak | ❌ Missed | 🚨 Blocked (~900ms) | 🚨 Blocked by Layer 2 |
| Normal Clean Prompts | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **API Cost Saved** | **100% Free** | **Paid per call** | **38%+ Calls Saved at ₹0** |
