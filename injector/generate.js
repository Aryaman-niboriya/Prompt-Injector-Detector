const fs = require('fs');
const path = require('path');

// Dono JSON files load kar
const cleanContent = JSON.parse(fs.readFileSync(path.join(__dirname, 'clean-content.json'), 'utf-8'));
const attackPhrases = JSON.parse(fs.readFileSync(path.join(__dirname, 'attack-phrases.json'), 'utf-8'));

// Helper function — array se random item nikalne ke liye
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Main generator function
function generateSample(injectMalicious) {
  const clean = getRandomItem(cleanContent);

  if (!injectMalicious) {
    // Safe sample — kuch bhi inject nahi karna
    return {
      content: clean.text,
      is_malicious: false,
      attack_type: null,
      injected_phrase: null
    };
  }

  // Malicious sample — attack phrase ko clean content ke saath jod
  const attack = getRandomItem(attackPhrases);
  
  // Simple injection — clean content ke end mein attack phrase daal
  const injectedContent = `${clean.text} ${attack.phrase}`;

  return {
    content: injectedContent,
    is_malicious: true,
    attack_type: attack.type,
    injected_phrase: attack.phrase
  };
}

// Dataset banane wala function — kitne samples chahiye
function generateDataset(totalSamples) {
  const dataset = [];

  for (let i = 0; i < totalSamples; i++) {
    // 50% malicious, 50% clean — balanced dataset banane ke liye
    const shouldInject = Math.random() < 0.5;
    const sample = generateSample(shouldInject);
    sample.id = i + 1;
    dataset.push(sample);
  }

  return dataset;
}

// Generate kar aur file mein save kar
const dataset = generateDataset(50); // 50 samples banayega — 25 safe, 25 malicious approx
fs.writeFileSync(path.join(__dirname, 'test-dataset.json'), JSON.stringify(dataset, null, 2));

console.log(`✅ ${dataset.length} samples generate ho gaye — test-dataset.json mein save hain`);
console.log(`Malicious samples: ${dataset.filter(d => d.is_malicious).length}`);
console.log(`Clean samples: ${dataset.filter(d => !d.is_malicious).length}`);