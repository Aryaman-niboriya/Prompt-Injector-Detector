const fs = require('fs');
const path = require('path');

/**
 * SentinelAI - Rule-Based Detector V2 (Layer 1 Complete)
 * Features:
 *  1. Expanded Regex Categories (40+ patterns)
 *  2. Zero-width / Invisible Unicode Detection
 *  3. Base64 & Encoding Detection (Dual Inspection)
 *  4. Homoglyph / Confusable Unicode Normalization & Detection
 *  5. Fuzzy & Multi-Keyword Co-occurrence Analysis
 */

// Categorized Suspicious Patterns
const categorizedPatterns = {
  direct_override: [
    /ignore\s+(all\s+)?(previous|prior|above|initial)\s+(instructions|rules|prompts|commands|constraints|directives)/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|constraints)/i,
    /forget\s+(all\s+|everything\s+)?(you\s+)?(were\s+)?(told|instructed|given|taught)/i,
    /bypass\s+(all\s+)?(safety\s+|security\s+)?(filters|rules|protocols|restrictions|guidelines)/i,
    /override\s+(all\s+)?(system\s+|developer\s+)?(prompts|rules|instructions|settings)/i,
    /(do\s+not|stop)\s+follow(ing)?\s+(your|the|any)\s+(rules|instructions|guidelines|safety)/i,
    /clear\s+(all\s+)?(previous\s+)?context/i,
    /drop\s+all\s+(prior\s+)?constraints/i,
    /ignore\s+the\s+above\s+and/i,
    /start\s+over\s+from\s+scratch\s+without\s+rules/i,
    /ignore\s+(all\s+)?rules/i
  ],
  roleplay_jailbreak: [
    /you\s+are\s+now\s+(DAN|jailbroken|unrestricted|an\s+unfiltered|an\s+evil|freed)/i,
    /act\s+as\s+(if\s+)?(you\s+)?(have\s+)?no\s+(restrictions|rules|filters|limits|censorship)/i,
    /pretend\s+(that\s+)?(you\s+are|to\s+be)\s+(not\s+an\s+AI|human|unfiltered|evil|a\s+hacker)/i,
    /developer\s+mode\s+(enabled|activated|on|true)/i,
    /enter\s+(god\s+mode|unrestricted\s+mode|chaos\s+mode|jailbreak\s+mode)/i,
    /simulate\s+a\s+(world|system|AI)\s+where\s+(there\s+are\s+no\s+rules|safety\s+is\s+off)/i,
    /let('s|\s+us)\s+play\s+a\s+game\s+where\s+you\s+have\s+no\s+(filters|rules|limits)/i,
    /as\s+an\s+AI\s+without\s+(limitations|restrictions|rules|ethics)/i,
    /from\s+now\s+on,\s+you\s+must\s+answer\s+without\s+any\s+(filter|hesitation)/i,
    /you\s+have\s+been\s+liberated\s+from/i
  ],
  authority_impersonation: [
    /^(system|admin|root|developer|moderator)\s*:\s*/im,
    /\[(system|admin|developer|instruction)\s*(override|command|message)?\]/i,
    /new\s+system\s+(directive|instruction|prompt)\s*:/i,
    /execute\s+with\s+(root|admin|elevated)\s+privileges/i,
    /authenticated\s+as\s+(admin|developer|root)/i,
    /system\s+update\s*:\s*override/i,
    /special\s+developer\s+command\s*:/i,
    /maintenance\s+mode\s*:\s*disable\s+checks/i
  ],
  context_switching: [
    /(?:---|===|\*\*\*)\s*(end\s+of\s+(prompt|instructions|context)|new\s+task|start\s+new\s+session)/i,
    /\[\s*(end\s+of\s+user\s+message|begin\s+system\s+message)\s*\]/i,
    /stop\s+task\s+and\s+start\s+new/i,
    /disregard\s+everything\s+above\s+and/i,
    /new\s+conversation\s+starts\s+here/i,
    /end\s+of\s+initial\s+prompt/i
  ],
  extraction_attempts: [
    /(reveal|show|print|output|display|repeat|leak|dump)\s+(me\s+)?(your\s+)?(system\s+prompt|initial\s+instructions|hidden\s+rules|system\s+message)/i,
    /what\s+(are\s+)?(your\s+)?(initial\s+|secret\s+|internal\s+)?(instructions|prompts|rules|system\s+prompt)/i,
    /tell\s+me\s+(what\s+you\s+were\s+told\s+to\s+do|your\s+system\s+instructions)/i,
    /output\s+the\s+text\s+above\s+verbatim/i,
    /summarize\s+your\s+internal\s+instructions/i
  ]
};

// Zero-width / Invisible unicode characters check
function hasHiddenUnicode(text) {
  const hiddenCharsRegex = /[\u200B\u200C\u200D\uFEFF]/;
  return hiddenCharsRegex.test(text);
}

// Homoglyph Map (Cyrillic & Greek lookalikes -> Latin standard)
const homoglyphMap = {
  // Cyrillic small
  'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's',
  // Cyrillic capital
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'Ј': 'J', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
  // Greek
  'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x', 'ω': 'w',
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T'
};

// Normalize Homoglyphs
function normalizeHomoglyphs(text) {
  let normalized = '';
  let replacedCount = 0;
  const detectedHomoglyphs = [];

  const decomposed = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  for (const char of decomposed) {
    if (homoglyphMap[char]) {
      normalized += homoglyphMap[char];
      replacedCount++;
      detectedHomoglyphs.push({ original: char, mapped_to: homoglyphMap[char] });
    } else {
      normalized += char;
    }
  }

  return {
    normalized_text: normalized,
    has_homoglyphs: replacedCount > 0,
    replaced_count: replacedCount,
    details: detectedHomoglyphs
  };
}

// Base64 & Encoded Payload Detector
function detectEncodedPayloads(text) {
  const detectedPayloads = [];
  const encodingKeywords = /(decode|base64|b64|unhash|decrypt|execute|eval|hex|payload)\b/i;
  const hasEncodingIntent = encodingKeywords.test(text);

  const base64Regex = /(?:[A-Za-z0-9+/]{4}){2,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
  const matches = text.match(base64Regex) || [];

  for (const candidate of matches) {
    if (candidate.length < 8) continue;
    try {
      const decoded = Buffer.from(candidate, 'base64').toString('utf-8');
      const isPrintable = /^[\x20-\x7E\s]+$/.test(decoded);
      if (isPrintable && decoded.trim().length > 3) {
        let matchedThreat = null;
        for (const [category, patterns] of Object.entries(categorizedPatterns)) {
          for (const pattern of patterns) {
            if (pattern.test(decoded)) {
              matchedThreat = { category, regex: pattern.source };
              break;
            }
          }
          if (matchedThreat) break;
        }

        if (matchedThreat || hasEncodingIntent) {
          detectedPayloads.push({
            original: candidate,
            decoded: decoded,
            threat: matchedThreat,
            has_encoding_keyword: hasEncodingIntent
          });
        }
      }
    } catch (e) {
      // Ignore decoding errors
    }
  }

  return {
    has_encoded: detectedPayloads.length > 0,
    payloads: detectedPayloads
  };
}

// Fuzzy & Multi-Keyword Co-occurrence Analysis
const keywordClusters = {
  actions: ['ignore', 'disregard', 'forget', 'bypass', 'override', 'unrestrict', 'abandon'],
  targets: ['system prompt', 'system instructions', 'safety rules', 'safety guidelines', 'content filters', 'security restrictions', 'guardrails', 'system directives'],
  system_context: ['system prompt', 'developer mode', 'jailbreak', 'dan', 'admin mode', 'safety filter'],
  extraction_actions: ['reveal', 'leak', 'dump', 'exfiltrate'],
  confidential_targets: ['system prompt', 'secret key', 'confidential instructions', 'initial prompt', 'hidden prompt', 'api key', 'password']
};

function checkCoOccurrence(text) {
  // Split text into individual sentences/clauses
  const sentences = text.split(/[.!?\n\r;]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 5);
  const suspiciousCombinations = [];

  for (const sentence of sentences) {
    const matchedActions = keywordClusters.actions.filter(word => sentence.includes(word));
    const matchedTargets = keywordClusters.targets.filter(word => sentence.includes(word));
    const matchedContext = keywordClusters.system_context.filter(word => sentence.includes(word));

    const matchedExtract = keywordClusters.extraction_actions.filter(word => sentence.includes(word));
    const matchedConfidential = keywordClusters.confidential_targets.filter(word => sentence.includes(word));

    // Threat Scenario A: Action (e.g. ignore) + Target (e.g. guidelines) in same sentence
    if (matchedActions.length > 0 && matchedTargets.length > 0) {
      suspiciousCombinations.push({
        type: 'action_target_combination',
        sentence: sentence,
        actions: matchedActions,
        targets: matchedTargets,
        context: matchedContext
      });
    }
    // Threat Scenario B: Extraction Action (e.g. reveal) + Confidential Target (e.g. secret/prompt)
    else if (matchedExtract.length > 0 && matchedConfidential.length > 0 && matchedContext.length > 0) {
      suspiciousCombinations.push({
        type: 'extraction_combination',
        sentence: sentence,
        actions: matchedExtract,
        targets: matchedConfidential,
        context: matchedContext
      });
    }
  }

  return {
    has_suspicious_combination: suspiciousCombinations.length > 0,
    combinations: suspiciousCombinations
  };
}

// Main Detector Function (V2)
function ruleBasedDetectV2(text) {
  const matchedPatterns = [];
  const matchedCategories = new Set();

  // 1. Invisible Unicode Scan
  const hasHidden = hasHiddenUnicode(text);

  // 2. Homoglyph Normalization
  const homoglyphAnalysis = normalizeHomoglyphs(text);
  const textToScan = homoglyphAnalysis.normalized_text;

  // 3. Direct Pattern Scan (on both original and normalized text)
  for (const [category, patterns] of Object.entries(categorizedPatterns)) {
    for (const pattern of patterns) {
      const matchedOriginal = pattern.test(text);
      const matchedNormalized = pattern.test(textToScan);

      if (matchedOriginal || matchedNormalized) {
        matchedPatterns.push({
          category: category,
          regex: pattern.source,
          bypassed_via_homoglyph: !matchedOriginal && matchedNormalized
        });
        matchedCategories.add(category);
        
        if (!matchedOriginal && matchedNormalized) {
          matchedCategories.add('homoglyph_evasion');
        }
      }
    }
  }

  // 4. Encoded Payload Scan
  const encodingResult = detectEncodedPayloads(textToScan);
  if (encodingResult.has_encoded) {
    matchedCategories.add('encoded_payload');
    encodingResult.payloads.forEach(p => {
      matchedPatterns.push({
        category: 'encoded_payload',
        original: p.original,
        decoded: p.decoded,
        nested_threat: p.threat
      });
    });
  }

  // 5. Fuzzy & Multi-Keyword Co-occurrence Scan
  const fuzzyResult = checkCoOccurrence(textToScan);
  if (fuzzyResult.has_suspicious_combination) {
    matchedCategories.add('fuzzy_co_occurrence');
  }

  const isFlagged = matchedPatterns.length > 0 || hasHidden || encodingResult.has_encoded || fuzzyResult.has_suspicious_combination;

  return {
    is_flagged: isFlagged,
    matched_patterns: matchedPatterns,
    matched_categories: Array.from(matchedCategories),
    has_hidden_unicode: hasHidden,
    homoglyph_analysis: homoglyphAnalysis,
    encoding_analysis: encodingResult,
    fuzzy_analysis: fuzzyResult
  };
}

module.exports = {
  ruleBasedDetectV2,
  categorizedPatterns,
  hasHiddenUnicode,
  normalizeHomoglyphs,
  detectEncodedPayloads,
  checkCoOccurrence
};

// Command Line Run Check
if (require.main === module) {
  const datasetPath = path.resolve(__dirname, '../injector/test-dataset.json');
  if (fs.existsSync(datasetPath)) {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    let truePositive = 0;
    let falseNegative = 0;
    let trueNegative = 0;
    let falsePositive = 0;

    dataset.forEach(sample => {
      const result = ruleBasedDetectV2(sample.content);
      if (sample.is_malicious && result.is_flagged) truePositive++;
      else if (sample.is_malicious && !result.is_flagged) falseNegative++;
      else if (!sample.is_malicious && !result.is_flagged) trueNegative++;
      else if (!sample.is_malicious && result.is_flagged) falsePositive++;
    });

    console.log('===== V2 RESULTS ON KNOWN DATASET =====');
    console.log(`Total Samples: ${dataset.length}`);
    console.log(`True Positive (sahi pakda): ${truePositive}`);
    console.log(`False Negative (miss hua): ${falseNegative}`);
    console.log(`True Negative (sahi clean bola): ${trueNegative}`);
    console.log(`False Positive (galat threat bola): ${falsePositive}`);
    const accuracy = ((truePositive + trueNegative) / dataset.length) * 100;
    console.log(`Accuracy: ${accuracy.toFixed(2)}%\n`);
  }
}
