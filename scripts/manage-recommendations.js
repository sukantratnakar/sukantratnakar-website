#!/usr/bin/env node
/**
 * Dictionary Recommendations Manager
 * Manages the "Recommended" category for SFO/American integration
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../app/dictionary-data.json');
const HTML_FILE = path.join(__dirname, '../app/dictionary.html');

// Initial recommended terms for SFO/American integration
// Categories: Essential phrases, Tech/SFO culture, Casual American, Phrasal verbs
const INITIAL_RECOMMENDATIONS = [
  // === ESSENTIAL AMERICAN GREETINGS & SMALL TALK ===
  "What's up",
  "How's it going",
  "How are you holding up",
  "Good to see you",
  "Take care",
  "Have a good one",
  "Catch you later",
  "My pleasure",
  "No worries",
  "You bet",
  "For sure",
  "Sounds good",
  "I hear you",
  "I feel you",
  "Fair enough",
  "Makes sense",
  "Totally",
  "Absolutely",
  "Definitely",
  
  // === TECH/STARTUP CULTURE (SFO) ===
  "Circle back",
  "Loop you in",
  "Keep me posted",
  "Let's sync",
  "Touch base",
  "Bandwidth",
  "Move the needle",
  "Low-hanging fruit",
  "Deep dive",
  "Pivot",
  "Scale",
  "Iterate",
  "MVP",
  "Disrupt",
  "Value prop",
  "Pain point",
  "Game changer",
  "Double down",
  "Lean in",
  
  // === CASUAL AMERICAN SLANG ===
  "GOAT",
  "Lowkey",
  "Highkey",
  "Vibe",
  "Vibes",
  "Fire",
  "Lit",
  "Slay",
  "Chill",
  "Chill out",
  "Hang out",
  "Grab a bite",
  "My bad",
  "No biggie",
  "Big deal",
  "Not a big deal",
  "Kind of a big deal",
  "Legit",
  "On point",
  "Nailed it",
  "Killed it",
  "Crushed it",
  "I'm down",
  "Down for that",
  "I'm game",
  "Ghosted",
  "Salty",
  "Shook",
  "Flex",
  "Cap",
  "No cap",
  "Bet",
  "Sus",
  "Binge",
  "Binge-watch",
  
  // === ESSENTIAL PHRASAL VERBS ===
  "Figure out",
  "Work out",
  "Sort out",
  "Check out",
  "Point out",
  "Find out",
  "Turn out",
  "Come up with",
  "Get along",
  "Get over",
  "Get through",
  "Look into",
  "Look forward to",
  "Run into",
  "Bring up",
  "Show up",
  "Pick up",
  "Drop off",
  "Put off",
  "Call off",
  "Follow up",
  "Wrap up",
  "End up",
  "Catch up",
  "Keep up",
  "Give up",
  "Back off",
  "Hold on",
  "Hang on",
  "Go ahead",
  "Break down",
  "Break up",
  "Make up",
  "Take off",
  "Set up",
  
  // === EXPRESSIONS FOR SMOOTH CONVERSATION ===
  "At the end of the day",
  "Long story short",
  "To be honest",
  "To be fair",
  "The thing is",
  "Here's the deal",
  "Bottom line",
  "On the same page",
  "In the loop",
  "Out of the loop",
  "Up to speed",
  "Behind the curve",
  "Ahead of the curve",
  "On the fence",
  "Play it by ear",
  "Wing it",
  "Go with the flow",
  "Take it easy",
  "Easy does it",
  "No sweat",
  "Piece of cake",
  "Walk in the park",
  "Hit the ground running",
  "Get the ball rolling",
  "Back to square one",
  "Cut to the chase",
  "Beat around the bush",
  "Spill the beans",
  "Let the cat out",
  "Cost an arm and a leg",
  "Break the ice",
  "Once in a blue moon",
  "Under the weather",
  "A dime a dozen",
  "Hit the nail on the head",
  "Miss the boat",
  "Bite off more than you can chew",
  "The ball is in your court",
];

// NEW terms to add if they don't exist (SFO-specific additions)
const NEW_TERMS = [
  { term: "YOLO", meaning: "You only live once - take risks", category: "American Slang" },
  { term: "FOMO", meaning: "Fear of missing out", category: "American Slang" },
  { term: "Networking", meaning: "Building professional relationships", category: "Business" },
  { term: "Happy hour", meaning: "After-work drinks, usually 4-7pm with discounts", category: "American Slang" },
  { term: "Grab coffee", meaning: "Meet casually (often for networking)", category: "Small Talk" },
  { term: "Let's do lunch", meaning: "Let's meet for lunch (often means 'let's connect')", category: "Small Talk" },
  { term: "Rain check", meaning: "Postpone to another time", category: "Expressions" },
  { term: "Take a rain check", meaning: "Decline now but accept later", category: "Expressions" },
  { term: "On the house", meaning: "Free, paid by the establishment", category: "American Slang" },
  { term: "Split the bill", meaning: "Each person pays their share", category: "American Slang" },
  { term: "Go Dutch", meaning: "Each pays for themselves", category: "Expressions" },
  { term: "Tip", meaning: "Gratuity (15-20% standard in US)", category: "American Slang" },
  { term: "Cash or card", meaning: "Payment method question", category: "General" },
  { term: "Doggy bag", meaning: "Container to take leftovers home", category: "American Slang" },
  { term: "To-go", meaning: "Take out, not eating here", category: "American Slang" },
  { term: "For here or to go", meaning: "Eating in or taking out?", category: "American Slang" },
  { term: "Uber/Lyft", meaning: "Rideshare (verb: 'I'll Uber there')", category: "American Slang" },
  { term: "DoorDash it", meaning: "Order food delivery", category: "American Slang" },
  { term: "Venmo me", meaning: "Send money via Venmo app", category: "American Slang" },
  { term: "Slide into DMs", meaning: "Send a private message", category: "American Slang" },
  { term: "It's giving...", meaning: "It has the vibe/energy of...", category: "American Slang" },
  { term: "Slay", meaning: "Do something excellently", category: "American Slang" },
  { term: "Period", meaning: "End of discussion, emphatic agreement", category: "American Slang" },
  { term: "That's fire", meaning: "That's amazing/cool", category: "American Slang" },
  { term: "Bussin", meaning: "Really good (especially food)", category: "American Slang" },
  { term: "Hits different", meaning: "Feels special/unique", category: "American Slang" },
  { term: "Living rent-free", meaning: "Constantly on someone's mind", category: "American Slang" },
  { term: "Main character energy", meaning: "Acting like the protagonist", category: "American Slang" },
  { term: "Touch grass", meaning: "Go outside, disconnect from online", category: "American Slang" },
  { term: "Ship it", meaning: "Deploy/release (tech) or support a relationship", category: "American Slang" },
  { term: "Cringe", meaning: "Embarrassing, awkward", category: "American Slang" },
  { term: "Based", meaning: "Confident, authentic, unapologetic", category: "American Slang" },
  { term: "W / L", meaning: "Win / Loss (reaction to events)", category: "American Slang" },
  { term: "Big W", meaning: "Big win, success", category: "American Slang" },
  { term: "Take the L", meaning: "Accept the loss", category: "American Slang" },
  { term: "Rizz", meaning: "Charisma, especially romantic", category: "American Slang" },
  { term: "Sigma", meaning: "Independent, lone-wolf type", category: "American Slang" },
  { term: "NPC", meaning: "Someone who follows trends mindlessly", category: "American Slang" },
  { term: "Bay Area", meaning: "San Francisco metropolitan region", category: "Local/Community" },
  { term: "The City", meaning: "San Francisco (locals say this)", category: "Local/Community" },
  { term: "BART", meaning: "Bay Area Rapid Transit (subway)", category: "Local/Community" },
  { term: "Caltrain", meaning: "SF to South Bay commuter rail", category: "Local/Community" },
  { term: "Silicon Valley", meaning: "Tech hub south of SF", category: "Local/Community" },
  { term: "South Bay", meaning: "San Jose area", category: "Local/Community" },
  { term: "East Bay", meaning: "Oakland, Berkeley area", category: "Local/Community" },
  { term: "North Bay", meaning: "Marin, wine country", category: "Local/Community" },
  { term: "The Peninsula", meaning: "Area between SF and San Jose", category: "Local/Community" },
  { term: "Hella", meaning: "Very (NorCal slang)", category: "American Slang" },
  { term: "Hyphy", meaning: "Energetic, wild (Oakland origin)", category: "American Slang" },
  { term: "Karl", meaning: "The SF fog (locals named it)", category: "Local/Community" },
  { term: "Microclimates", meaning: "SF's varied weather zones", category: "Local/Community" },
  { term: "Layer up", meaning: "Wear layers (SF weather advice)", category: "Local/Community" },
  { term: "In-N-Out", meaning: "Popular West Coast burger chain", category: "Local/Community" },
  { term: "Animal style", meaning: "In-N-Out secret menu option", category: "Local/Community" },
  { term: "Mission burrito", meaning: "SF-style large wrapped burrito", category: "Local/Community" },
];

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeForMatch(str) {
  return str.toLowerCase().replace(/[''"`]/g, "'").replace(/[^a-z0-9' ]/g, '').trim();
}

function markRecommendations(data) {
  const normalizedRecs = INITIAL_RECOMMENDATIONS.map(normalizeForMatch);
  let marked = 0;
  
  data.forEach(entry => {
    const normalized = normalizeForMatch(entry.term);
    if (normalizedRecs.some(rec => normalized.includes(rec) || rec.includes(normalized))) {
      entry.recommended = true;
      marked++;
    }
  });
  
  console.log(`Marked ${marked} existing entries as recommended`);
  return data;
}

function addNewTerms(data) {
  const existingNormalized = data.map(e => normalizeForMatch(e.term));
  let added = 0;
  
  NEW_TERMS.forEach(newTerm => {
    const normalized = normalizeForMatch(newTerm.term);
    if (!existingNormalized.some(e => e.includes(normalized) || normalized.includes(e))) {
      data.push({
        term: newTerm.term,
        meaning: newTerm.meaning,
        category: newTerm.category,
        recommended: true
      });
      added++;
    }
  });
  
  console.log(`Added ${added} new recommended terms`);
  return data;
}

function updateHTML(data) {
  let html = fs.readFileSync(HTML_FILE, 'utf8');
  
  // Replace the data array in HTML
  const dataStr = `const data=${JSON.stringify(data)};`;
  html = html.replace(/const data=\[[\s\S]*?\];/, dataStr);
  
  fs.writeFileSync(HTML_FILE, html);
  console.log('Updated dictionary.html with new data');
}

function countRecommended(data) {
  return data.filter(e => e.recommended).length;
}

// Main
const data = loadData();
console.log(`Loaded ${data.length} entries`);

const markedData = markRecommendations(data);
const finalData = addNewTerms(markedData);

console.log(`Total recommended: ${countRecommended(finalData)}`);
console.log(`Total entries: ${finalData.length}`);

saveData(finalData);
updateHTML(finalData);

console.log('\n✅ Done! Recommendations added.');
