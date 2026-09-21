const fs = require('fs');

const cleanContent = JSON.parse(fs.readFileSync('./clean-content.json', 'utf-8'));
const attackPhrases = JSON.parse(fs.readFileSync('./attack-phrases.json', 'utf-8'));

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateHtmlSample(injectMalicious) {
  const clean = getRandomItem(cleanContent);

  if (!injectMalicious) {
    const html = `
      <html>
        <body>
          <p>${clean.text}</p>
        </body>
      </html>
    `;
    return {
      html: html,
      visible_text: clean.text,
      raw_text: clean.text,
      is_malicious: false,
      attack_type: null
    };
  }

  const attack = getRandomItem(attackPhrases);

  const html = `
    <html>
      <body>
        <p>${clean.text}</p>
        <p style="color:white; font-size:1px;">${attack.phrase}</p>
      </body>
    </html>
  `;

  return {
    html: html,
    visible_text: clean.text,
    raw_text: `${clean.text} ${attack.phrase}`,
    is_malicious: true,
    attack_type: attack.type
  };
}

function generateHtmlDataset(totalSamples) {
  const dataset = [];

  for (let i = 0; i < totalSamples; i++) {
    const shouldInject = Math.random() < 0.5;
    const sample = generateHtmlSample(shouldInject);
    sample.id = i + 1;
    dataset.push(sample);
  }

  return dataset;
}

const dataset = generateHtmlDataset(30);
fs.writeFileSync('./test-dataset-html.json', JSON.stringify(dataset, null, 2));

console.log(`✅ ${dataset.length} HTML samples generate ho gaye`);
console.log(`Malicious: ${dataset.filter(d => d.is_malicious).length}`);
console.log(`Clean: ${dataset.filter(d => !d.is_malicious).length}`);