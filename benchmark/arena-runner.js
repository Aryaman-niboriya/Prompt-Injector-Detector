const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { getTestVectors } = require('./test-vectors');
const { sentinelPipeline } = require('../detector/sentinel-pipeline');

/**
 * SentinelAI - Automated Red-vs-Blue Arena & Benchmark Runner
 * 
 * Runs a 50-sample multi-modal security battery against SentinelAI:
 * - Direct overrides, jailbreaks, zero-width unicode, homoglyphs, base64/hex
 * - HTML CSS stealth (display:none, white-on-white, 0px font, opacity:0, comments)
 * - PDF multi-modal attacks (invisible white text, metadata subject/keywords)
 * - Benign controls (technical docs, Python tutorials, GitHub profiles, clean PDFs)
 */

async function runArenaBenchmark(options = {}) {
  const {
    skipLayer2 = false,
    onProgress = null,
    verbose = false
  } = options;

  const tStart = Date.now();
  const vectors = await getTestVectors();

  const results = [];
  let tp = 0; // True Positive (Attack correctly blocked)
  let tn = 0; // True Negative (Clean correctly allowed)
  let fp = 0; // False Positive (Clean mistakenly blocked)
  let fn = 0; // False Negative (Attack mistakenly allowed)

  const layerCounts = { layer1: 0, layer2: 0, layer3: 0 };
  let totalLatency = 0;
  let apiCallsCount = 0;

  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    const sampleStart = Date.now();

    let scan;
    try {
      scan = await sentinelPipeline(v.content, {
        inputType: v.input_type,
        skipLayer2: skipLayer2
      });
    } catch (err) {
      scan = {
        decision: 'ERROR',
        blocked_by: null,
        summary: `Execution Error: ${err.message}`
      };
    }

    const latency = Date.now() - sampleStart;
    totalLatency += latency;

    if (scan.api_call_made) {
      apiCallsCount++;
    }

    const isMalicious = v.is_malicious;
    const isBlocked = scan.decision === 'BLOCK';
    const isAllowed = scan.decision === 'ALLOW';

    let verdict = 'UNKNOWN';
    if (isMalicious && isBlocked) {
      verdict = 'TRUE_POSITIVE';
      tp++;
      if (scan.blocked_by && layerCounts[scan.blocked_by] !== undefined) {
        layerCounts[scan.blocked_by]++;
      }
    } else if (!isMalicious && isAllowed) {
      verdict = 'TRUE_NEGATIVE';
      tn++;
    } else if (!isMalicious && isBlocked) {
      verdict = 'FALSE_POSITIVE';
      fp++;
    } else if (isMalicious && isAllowed) {
      verdict = 'FALSE_NEGATIVE';
      fn++;
    }

    const itemResult = {
      id: v.id,
      name: v.name,
      input_type: v.input_type,
      category: v.category,
      technique: v.technique,
      is_malicious: v.is_malicious,
      expected: isMalicious ? 'BLOCK' : 'ALLOW',
      actual: scan.decision,
      verdict: verdict,
      passed: verdict === 'TRUE_POSITIVE' || verdict === 'TRUE_NEGATIVE',
      blocked_by: scan.blocked_by,
      threat_type: scan.threat_type,
      latency_ms: latency,
      summary: scan.summary
    };

    results.push(itemResult);

    if (typeof onProgress === 'function') {
      onProgress({
        index: i + 1,
        total: vectors.length,
        current: itemResult,
        stats: { tp, tn, fp, fn }
      });
    }
  }

  const total = vectors.length;
  const maliciousCount = vectors.filter(v => v.is_malicious).length;
  const cleanCount = vectors.filter(v => !v.is_malicious).length;

  const accuracy = total > 0 ? ((tp + tn) / total) * 100 : 0;
  const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 100;
  const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 100;
  const f1Score = (precision + recall) > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

  // Cost Efficiency Calculations
  // Baseline cost if all 50 inputs were processed by LLM: 50 * $0.0003 (~$0.015)
  // SentinelAI Early Exit saves cost on Layer 1 and Layer 3 blocks
  const earlyExitBlocks = layerCounts.layer1 + layerCounts.layer3;
  const earlyExitRate = maliciousCount > 0 ? (earlyExitBlocks / maliciousCount) * 100 : 0;
  const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    total_samples: total,
    malicious_samples: maliciousCount,
    clean_samples: cleanCount,
    confusion_matrix: {
      true_positives: tp,
      true_negatives: tn,
      false_positives: fp,
      false_negatives: fn
    },
    metrics: {
      accuracy_percentage: parseFloat(accuracy.toFixed(1)),
      precision_percentage: parseFloat(precision.toFixed(1)),
      recall_percentage: parseFloat(recall.toFixed(1)),
      f1_score_percentage: parseFloat(f1Score.toFixed(1))
    },
    layer_distribution: {
      layer1_rule_guard: layerCounts.layer1,
      layer3_structural_comparator: layerCounts.layer3,
      layer2_semantic_guard: layerCounts.layer2,
      layer1_percentage: maliciousCount > 0 ? parseFloat(((layerCounts.layer1 / maliciousCount) * 100).toFixed(1)) : 0,
      layer3_percentage: maliciousCount > 0 ? parseFloat(((layerCounts.layer3 / maliciousCount) * 100).toFixed(1)) : 0,
      layer2_percentage: maliciousCount > 0 ? parseFloat(((layerCounts.layer2 / maliciousCount) * 100).toFixed(1)) : 0
    },
    performance_and_cost: {
      total_time_ms: Date.now() - tStart,
      avg_latency_ms: avgLatency,
      api_calls_made: apiCallsCount,
      early_exit_free_blocks: earlyExitBlocks,
      early_exit_percentage: parseFloat(earlyExitRate.toFixed(1)),
      cost_saved_description: `${earlyExitRate.toFixed(1)}% of attacks neutralized with ₹0 API cost (<10ms early exit)`
    },
    results: results
  };

  return summary;
}

module.exports = {
  runArenaBenchmark
};

// Standalone Terminal CLI Runner
if (require.main === module) {
  (async () => {
    const c = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      bgBlue: '\x1b[44m',
      gray: '\x1b[90m'
    };

    console.log(`\n${c.cyan}╔══════════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║   ⚔️  SENTINELAI — RED-VS-BLUE LIVE ARENA BENCHMARK SUITE       ║${c.reset}`);
    console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════════╝${c.reset}\n`);
    console.log(`${c.gray}Firing 50 multi-modal attacks & benign vectors against SentinelAI...${c.reset}\n`);

    const report = await runArenaBenchmark({
      onProgress: (p) => {
        const item = p.current;
        const icon = item.passed ? `${c.green}✔ PASS${c.reset}` : `${c.red}✖ FAIL${c.reset}`;
        const typeBadge = `[${item.input_type.toUpperCase()}]`;
        const layerBadge = item.blocked_by ? `${c.yellow}[${item.blocked_by.toUpperCase()}]${c.reset}` : `${c.gray}[CLEAN]${c.reset}`;
        console.log(` ${icon} #${String(p.index).padStart(2, '0')} ${typeBadge.padEnd(7)} ${item.name.padEnd(38)} ${layerBadge.padEnd(18)} ${c.gray}(${item.latency_ms}ms)${c.reset}`);
      }
    });

    console.log(`\n${c.cyan}══════════════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright} 📊 FINAL BENCHMARK SCORECARD${c.reset}`);
    console.log(`${c.cyan}══════════════════════════════════════════════════════════════════${c.reset}`);
    console.log(` • ${c.bright}Total Multi-Modal Tests:${c.reset}  ${report.total_samples} (25 Attacks, 25 Clean)`);
    console.log(` • ${c.bright}Defense Accuracy:${c.reset}         ${c.green}${c.bright}${report.metrics.accuracy_percentage}%${c.reset}`);
    console.log(` • ${c.bright}Precision / Recall:${c.reset}       ${report.metrics.precision_percentage}% / ${report.metrics.recall_percentage}%`);
    console.log(` • ${c.bright}True Positives (Attacks):${c.reset} ${c.green}${report.confusion_matrix.true_positives}/25 Blocked${c.reset}`);
    console.log(` • ${c.bright}False Positives (Clean):${c.reset}  ${report.confusion_matrix.false_positives === 0 ? c.green : c.red}${report.confusion_matrix.false_positives} Misidentified${c.reset}`);
    console.log(` • ${c.bright}Average Latency:${c.reset}          ${c.yellow}${report.performance_and_cost.avg_latency_ms}ms${c.reset}`);
    console.log(` • ${c.bright}Early Exit / ₹0 Cost:${c.reset}    ${c.green}${c.bright}${report.performance_and_cost.early_exit_percentage}%${c.reset} (${report.performance_and_cost.early_exit_free_blocks}/25 attacks stopped before LLM)`);
    console.log(`${c.cyan}──────────────────────────────────────────────────────────────────${c.reset}`);
    console.log(` ${c.bright}Layer Interception Distribution:${c.reset}`);
    console.log(`   🛡️ Layer 1 (Rule-Based Guard):          ${report.layer_distribution.layer1_rule_guard} (${report.layer_distribution.layer1_percentage}%)`);
    console.log(`   👁️ Layer 3 (Structural Comparator):     ${report.layer_distribution.layer3_structural_comparator} (${report.layer_distribution.layer3_percentage}%)`);
    console.log(`   🧠 Layer 2 (Semantic LLM Guard):        ${report.layer_distribution.layer2_semantic_guard} (${report.layer_distribution.layer2_percentage}%)`);
    console.log(`${c.cyan}══════════════════════════════════════════════════════════════════${c.reset}\n`);
  })();
}
