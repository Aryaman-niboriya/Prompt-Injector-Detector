const express = require('express');
const multer = require('multer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { injectText, DEFAULT_ATTACKS } = require('./injector/text-injector');
const { injectHtml, DEFAULT_CLEAN_HTML } = require('./injector/html-injector');
const { createInjectedPdf } = require('./injector/pdf-injector');
const { sentinelPipeline } = require('./detector/sentinel-pipeline');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for PDF in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// INJECTOR API ENDPOINTS (Red Team Studio)
// ============================================================

// 1. Text Injection
app.post('/api/inject/text', (req, res) => {
  try {
    const { cleanText, attackPhrase, technique } = req.body;
    const result = injectText({ cleanText, attackPhrase, technique });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. HTML Injection
app.post('/api/inject/html', (req, res) => {
  try {
    const { cleanHtml, attackPhrase, technique } = req.body;
    const result = injectHtml({ cleanHtml, attackPhrase, technique });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PDF Injection (Returns JSON with Base64)
app.post('/api/inject/pdf', async (req, res) => {
  try {
    const { title, visibleContent, attackPhrase, technique } = req.body;
    const result = await createInjectedPdf({
      title,
      visibleContent: Array.isArray(visibleContent) ? visibleContent : [visibleContent].filter(Boolean),
      attackPhrase,
      technique
    });

    res.json({
      success: true,
      technique: result.technique,
      techniqueDescription: result.techniqueDescription,
      title: result.title,
      visibleText: result.visibleText,
      attackPhrase: result.attackPhrase,
      fileSize: result.fileSize,
      pdfBase64: result.pdfBase64
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Download Poisoned PDF directly as binary
app.get('/api/download/pdf', async (req, res) => {
  try {
    const { technique = 'invisible_text', attackPhrase } = req.query;
    const result = await createInjectedPdf({ technique, attackPhrase });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sentinelai_injected_${technique}.pdf"`);
    res.send(result.pdfBuffer);
  } catch (err) {
    res.status(500).send(`Error generating PDF: ${err.message}`);
  }
});

// ============================================================
// DETECTOR API ENDPOINTS (Blue Team Gateway)
// ============================================================

// 5. Detect Text
app.post('/api/detect/text', async (req, res) => {
  try {
    const { text, skipLayer2 } = req.body;
    const result = await sentinelPipeline(text, { inputType: 'text', skipLayer2 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Detect HTML
app.post('/api/detect/html', async (req, res) => {
  try {
    const { html, skipLayer2 } = req.body;
    const result = await sentinelPipeline(html, { inputType: 'html', skipLayer2 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Detect PDF Upload
app.post('/api/detect/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please upload a valid PDF file.' });
    }
    const result = await sentinelPipeline(req.file.buffer, { inputType: 'pdf' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Unified Scan Endpoint
app.post('/api/gateway/scan', async (req, res) => {
  try {
    const { inputType = 'text', content, skipLayer2 } = req.body;
    const result = await sentinelPipeline(content, { inputType, skipLayer2 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Presets & Default Seeds Endpoint
app.get('/api/presets', (req, res) => {
  res.json({
    defaultAttacks: DEFAULT_ATTACKS,
    defaultHtml: DEFAULT_CLEAN_HTML
  });
});

// 10. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'SentinelAI Multi-Modal Gateway',
    layers: {
      layer1: 'Rule-Based Guard (Active)',
      layer2: 'Semantic LLM Guard (Gemini Active)',
      layer3: 'Visible-vs-Raw Comparator (Active)'
    },
    supported_modalities: ['text', 'html', 'pdf'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🛡️ SentinelAI Security Platform running on http://localhost:${PORT}`);
});

module.exports = app;
