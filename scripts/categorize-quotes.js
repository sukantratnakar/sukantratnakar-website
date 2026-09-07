const fs = require('fs');
const path = require('path');

const quotesPath = path.join(__dirname, '../app/data/quotes.json');
const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));

// Keywords for each category
const categories = {
  leadership: ['leader', 'lead', 'vision', 'team', 'manage', 'decision', 'authority', 'influence', 'guide', 'inspire', 'command', 'responsibility', 'accountability', 'delegate', 'empower', 'mentor', 'boss', 'follower'],
  business: ['business', 'profit', 'market', 'customer', 'entrepreneur', 'company', 'corporate', 'revenue', 'invest', 'money', 'economy', 'trade', 'commerce', 'startup', 'venture', 'capital', 'sell', 'buy', 'price', 'value', 'brand', 'product', 'service', 'innovation', 'competition', 'strategy', 'growth', 'scale'],
  growth: ['grow', 'growth', 'learn', 'improve', 'develop', 'evolve', 'progress', 'advance', 'change', 'transform', 'potential', 'skill', 'ability', 'better', 'strength', 'weak', 'challenge', 'overcome', 'journey', 'path', 'goal', 'achieve', 'success', 'failure', 'mistake', 'lesson', 'experience', 'practice', 'master', 'effort', 'hard work', 'discipline', 'habit', 'focus', 'determination', 'perseverance', 'persistence', 'resilience', 'patience', 'courage', 'brave', 'fear'],
  life: ['life', 'live', 'death', 'die', 'birth', 'age', 'time', 'moment', 'day', 'year', 'happiness', 'happy', 'joy', 'sorrow', 'pain', 'suffering', 'love', 'hate', 'relationship', 'family', 'friend', 'human', 'people', 'society', 'world', 'nature', 'earth', 'universe', 'exist', 'purpose', 'meaning', 'soul', 'spirit', 'heart', 'mind', 'body', 'health', 'peace', 'calm', 'stress', 'emotion', 'feel', 'dream', 'hope', 'wish', 'desire', 'passion', 'freedom', 'choice', 'destiny', 'fate'],
  perspective: ['perspective', 'view', 'opinion', 'think', 'thought', 'believe', 'perception', 'understand', 'realize', 'insight', 'wisdom', 'knowledge', 'truth', 'reality', 'illusion', 'see', 'observe', 'notice', 'aware', 'conscious', 'mind', 'idea', 'concept', 'philosophy', 'reflect', 'consider', 'ponder', 'question', 'answer', 'assume', 'judge', 'bias', 'open', 'close', 'narrow', 'broad', 'different', 'same', 'change', 'static', 'fluid', 'relative', 'absolute', 'subjective', 'objective', 'context', 'interpret', 'meaning', 'significance']
};

function categorizeQuote(text) {
  const lowerText = text.toLowerCase();
  const scores = {};
  
  for (const [category, keywords] of Object.entries(categories)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[category]++;
      }
    }
  }
  
  // Find highest scoring category
  let maxScore = 0;
  let bestCategory = 'life'; // default fallback
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  
  return bestCategory;
}

// Categorize all quotes
let categoryCounts = { leadership: 0, business: 0, growth: 0, life: 0, perspective: 0 };

quotes.forEach(quote => {
  const category = categorizeQuote(quote.text);
  quote.category = category;
  categoryCounts[category]++;
});

// Save updated quotes
fs.writeFileSync(quotesPath, JSON.stringify(quotes, null, 2));

console.log('Categorization complete!');
console.log('Category counts:', categoryCounts);
