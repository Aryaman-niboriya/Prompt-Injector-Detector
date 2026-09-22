const fs = require('fs');

// Known suspicious patterns — inko dhundna hai text mein
const suspiciousPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+(instructions|rules)/i,
  /you\s+are\s+now\s+DAN/i,
  /reveal\s+your\s+system\s+prompt/i,
  /system\s+override/i,
  /forget\s+everything\s+(you\s+)?(were\s+)?told/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
  /pretend\s+you\s+are\s+not\s+an\s+AI/i
];

// Zero-width/invisible unicode characters check karne ke liye
function hasHiddenUnicode(text) {
  // Zero-width space, zero-width non-joiner, etc.
  const hiddenCharsRegex = /[\u200B\u200C\u200D\uFEFF]/;
  return hiddenCharsRegex.test(text);
}

// Main detector function
function ruleBasedDetect(text) {
  const matchedPatterns = [];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      matchedPatterns.push(pattern.source);
    }
  }

  const hasHidden = hasHiddenUnicode(text);

  return {
    is_flagged: matchedPatterns.length > 0 || hasHidden,
    matched_patterns: matchedPatterns,
    has_hidden_unicode: hasHidden
  };
}

// ===== TESTING SECTION =====
// Apne pehle wale test-dataset.json ko load kar aur test kar
const path = require('path');
const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, '../../injector/test-dataset.json'), 'utf-8'));

let truePositive = 0;  // Sahi se malicious pakड़ा
let falseNegative = 0; // Malicious tha, miss ho gaya
let trueNegative = 0;  // Sahi se clean pakड़ा
let falsePositive = 0; // Clean tha, galat se threat bol diya

dataset.forEach(sample => {
  const result = ruleBasedDetect(sample.content);

  if (sample.is_malicious && result.is_flagged) {
    truePositive++;
  } else if (sample.is_malicious && !result.is_flagged) {
    falseNegative++;
  } else if (!sample.is_malicious && !result.is_flagged) {
    trueNegative++;
  } else if (!sample.is_malicious && result.is_flagged) {
    falsePositive++;
  }
});

console.log('===== RESULTS =====');
console.log(`True Positive (sahi pakड़ा): ${truePositive}`);
console.log(`False Negative (miss hua): ${falseNegative}`);
console.log(`True Negative (sahi clean bola): ${trueNegative}`);
console.log(`False Positive (galat threat bola): ${falsePositive}`);

const accuracy = ((truePositive + trueNegative) / dataset.length) * 100;
console.log(`\nAccuracy: ${accuracy.toFixed(2)}%`);