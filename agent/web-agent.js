const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sentinelPipeline } = require('../detector/sentinel-pipeline');

/**
 * SentinelAI - Secure Web-Browsing AI Agent
 * 
 * Features:
 * 1. Web Reader: Fetches & parses webpage HTML content (from URL or raw HTML string).
 * 2. Indirect Prompt Injection Shield: Passes scraped content through SentinelAI (Layers 1, 2, 3).
 * 3. Agent Hijack Prevention: If the webpage contains hidden or overt prompt injections,
 *    the Agent halts execution, quarantines the input, and flags the threat!
 * 4. Safe Summarization: If clean, the Agent uses Gemini to process and summarize the webpage.
 */

// Helper to fetch webpage HTML from a URL
async function fetchWebpageHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (SentinelAI-Secure-Agent/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return { success: true, html };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main Agent Function: Read and Analyze Webpage Safely
 */
async function runSecureWebAgent(options = {}) {
  const {
    url = null,
    rawHtml = null,
    userQuery = 'Summarize the main content of this webpage and extract key points.'
  } = options;

  let htmlContent = rawHtml;
  let targetSource = url || 'Custom HTML Snippet';

  // 1. Fetch Webpage if URL is provided
  if (url) {
    console.log(`🌐 [Web Agent] Fetching webpage content from: ${url}`);
    const fetchRes = await fetchWebpageHtml(url);
    if (!fetchRes.success) {
      return {
        status: 'FETCH_ERROR',
        source: url,
        error: `Failed to fetch webpage: ${fetchRes.error}`
      };
    }
    htmlContent = fetchRes.html;
  }

  if (!htmlContent || typeof htmlContent !== 'string') {
    return {
      status: 'ERROR',
      error: 'No valid HTML content provided to Web Agent.'
    };
  }

  // 2. SECURITY CHECKPOINT: Run SentinelAI Multi-Layer Inspection for Indirect Prompt Injection
  console.log(`🛡️ [Web Agent] Running SentinelAI Inspection (Layers 1, 2, 3) on scraped webpage...`);
  const securityScan = await sentinelPipeline(htmlContent, { inputType: 'html' });

  // 3. AGENT HIJACK DEFENSE: If Threat Detected → BLOCK & QUARANTINE!
  if (securityScan.decision === 'BLOCK') {
    console.log(`🚨 [Web Agent] INDIRECT PROMPT INJECTION DETECTED! Blocking agent execution.`);
    return {
      status: 'BLOCKED',
      agent_action: 'QUARANTINED',
      source: targetSource,
      threat_detected: true,
      blocked_by: securityScan.blocked_by,
      threat_type: securityScan.threat_type || 'indirect_prompt_injection',
      scan_details: securityScan,
      summary: `🚨 AGENT HIJACK PREVENTED! The webpage contains an Indirect Prompt Injection attack (${securityScan.blocked_by.toUpperCase()}). Execution halted to protect system.`
    };
  }

  // 4. SAFE EXECUTION: Webpage is Clean → Agent Reads & Summarizes
  console.log(`✅ [Web Agent] Webpage verified SAFE. Agent processing content with Gemini...`);

  // Extract human-visible text using cheerio
  const $ = cheerio.load(htmlContent);
  $('script, style, noscript').remove();
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 4000);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 'SAFE_UNPROCESSED',
      securityScan,
      visibleText,
      warning: 'GEMINI_API_KEY not found in .env — Security passed but LLM processing skipped.'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

    const agentPrompt = `You are SentinelAI Secure Web Assistant.
The following webpage has been verified SAFE by our multi-layer security firewall (0 prompt injections detected).

User Query: "${userQuery}"

Webpage Content:
"""
${visibleText}
"""

Provide a clear, structured summary and answer the user query based strictly on the safe webpage content above.`;

    const result = await model.generateContent(agentPrompt);
    const agentResponse = result.response.text();

    return {
      status: 'SUCCESS',
      agent_action: 'PROCESSED',
      source: targetSource,
      security_verified: true,
      scan_details: securityScan,
      extracted_visible_text: visibleText,
      agent_response: agentResponse
    };
  } catch (err) {
    return {
      status: 'SAFE_LLM_ERROR',
      securityScan,
      extracted_visible_text: visibleText,
      error: `LLM Processing Error: ${err.message}`
    };
  }
}

module.exports = {
  runSecureWebAgent,
  fetchWebpageHtml
};

// Standalone CLI Test
if (require.main === module) {
  (async () => {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  SENTINELAI — SECURE WEB-BROWSING AGENT (LIVE URL FETCH)    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Test 1: Fetching Live Poisoned Webpage over HTTP Network
    console.log('--- TEST 1: Fetching Live Poisoned Webpage (http://localhost:3000/mock-page/poisoned) ---');
    const res1 = await runSecureWebAgent({
      url: 'http://localhost:3000/mock-page/poisoned',
      userQuery: 'Summarize the news article on this webpage.'
    });
    console.log('Result 1 (Poisoned URL Fetch):', JSON.stringify(res1, null, 2));

    console.log('\n--------------------------------------------------\n');

    // Test 2: Fetching Live Clean Webpage over HTTP Network
    console.log('--- TEST 2: Fetching Live Clean Webpage (http://localhost:3000/mock-page/clean) ---');
    const res2 = await runSecureWebAgent({
      url: 'http://localhost:3000/mock-page/clean',
      userQuery: 'Summarize the quantum physics article.'
    });
    console.log('Result 2 (Clean URL Fetch):', JSON.stringify(res2, null, 2));
  })();
}