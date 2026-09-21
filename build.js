#!/usr/bin/env node
/**
 * sukantratnakar.com — build
 *
 * Single source of truth: speaking.json.
 * Renders app/index.html and app/speaking.html from templates/, and publishes
 * app/speaking.json. No content string lives in a template.
 *
 *   node build.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const APP = path.join(ROOT, 'app');
const TPL = path.join(ROOT, 'templates');

const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'speaking.json'), 'utf8'));

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attr = s => esc(s);

// talk.body may be an array of paragraphs, or a single string (blank lines split it).
const paras = v => (Array.isArray(v) ? v : String(v || '').split(/\n{2,}/))
  .map(t => String(t).trim()).filter(Boolean)
  .map(t => `<p>${esc(t)}</p>`).join('\n      ');

// Italicise book titles inside the bio, driven by person.bio_italic_titles.
function bioHtml(bio, titles) {
  let out = esc(bio);
  (titles || []).forEach(t => {
    const e = esc(t);
    out = out.split(e).join(`<em>${e}</em>`);
  });
  return out;
}

function fill(tpl, map) {
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m);
}

function calLinkFrom(url) {
  if (!url) return '';
  const m = String(url).match(/cal\.com\/(.+?)\/?$/);
  return m ? m[1] : '';
}

/* ---------- homepage ---------- */
const indexTpl = fs.readFileSync(path.join(TPL, 'index.template.html'), 'utf8');

const indexOut = fill(indexTpl, {
  TEASER_HEADING: esc(d.teaser.heading),
  TEASER_LINE: esc(d.teaser.line),
  TEASER_CTA: esc(d.teaser.cta),
});
fs.writeFileSync(path.join(APP, 'index.html'), indexOut);

/* ---------- shared stylesheet (extracted, never duplicated) ---------- */
const baseCss = indexTpl.slice(
  indexTpl.indexOf('<style>') + '<style>'.length,
  indexTpl.indexOf('</style>')
).trim();

/* ---------- speaking page ---------- */
const p = d.page;
const sec = p.sections;

/* video — omitted from the DOM entirely when show is false */
let videoSection = '';
if (d.video && d.video.show && d.video.youtube_id) {
  const id = attr(d.video.youtube_id);
  videoSection = `<section class="sec-dark reveal" id="video">
  <div class="frame">
    <div class="video-wrap">
      <button class="video-facade" type="button" data-yt="${id}" data-yt-title="${attr(d.talk.signature_title || d.page.h1)}"
              aria-label="Play video">
        <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" loading="lazy">
        <span class="video-play" aria-hidden="true">&#9654;</span>
      </button>
      <p class="video-caption">${esc(d.video.caption)}</p>
    </div>
  </div>
</section>`;
}

/* proof — omitted entirely until there is material */
let proofSection = '';
if (p.proof && p.proof.show && ((p.proof.lines || []).length || p.proof.quote)) {
  const lines = (p.proof.lines || []).map(l => `<p>${esc(l)}</p>`).join('\n      ');
  const quote = p.proof.quote
    ? `<blockquote class="proof-quote">${esc(p.proof.quote)}</blockquote>` +
      (p.proof.quote_attribution ? `\n      <div class="proof-attr">${esc(p.proof.quote_attribution)}</div>` : '')
    : '';
  proofSection = `<section class="sec-cream reveal" id="proof">
  <div class="frame">
    <div class="s-label">${esc(sec.proof_heading)}</div>
    <div class="proof-lines">
      ${lines}
      ${quote}
    </div>
  </div>
</section>`;
}

/* topics */
const topicsRows = d.topics.map(t =>
  `        <tr><td class="t-name">${esc(t.name)}</td><td class="t-blurb">${esc(t.blurb)}</td></tr>`
).join('\n');

/* takeaways + logistics */
const takeaways = d.talk.takeaways.map(t => `        <li>${esc(t)}</li>`).join('\n');
const hostItems = d.logistics.host_provides.map(t => `      <li>${esc(t)}</li>`).join('\n');

/* NO PRICES in the workshop section, deliberately (20 Sep 2026).
   See workshop._note in speaking.json. Do not add a tier/fee/amount renderer. */

/* booking + workshop CTAs — graceful when a Cal URL is cleared */
const talkLink = calLinkFrom(d.booking.cal_talk_url);
const workshopUrl = d.booking.cal_workshop_url;

/* The button opens the enquiry calendar in a Cal.com popup, on the page.
   data-cal-link is what Cal's embed script binds to; href is kept so the button
   still works if that script is blocked or fails to load. */
const wsCtaLabel = d.workshop.cta_label || sec.workshop_cta;
const wsCalLink = calLinkFrom(workshopUrl);
const workshopCta = workshopUrl
  ? `<a class="btn btn-ink" href="${attr(workshopUrl)}" target="_blank" rel="noopener" data-utm
        data-cal-link="${attr(wsCalLink)}" data-cal-config='{"theme":"dark"}'>${esc(wsCtaLabel)}</a>`
  : `<a class="btn btn-ink" href="mailto:${attr(d.booking.email)}?subject=${encodeURIComponent(wsCtaLabel)}">${esc(wsCtaLabel)}</a>`;

let bookingEmbed, calScript;
if (talkLink) {
  bookingEmbed = `<div class="cal-wrap" id="cal-talk"></div>`;
  calScript = `<script>
(function (C, A, L) {
  var p = function (a, ar) { a.q.push(ar); };
  var d = C.document;
  C.Cal = C.Cal || function () {
    var cal = C.Cal, ar = arguments;
    if (cal.loaded === undefined) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; }
    if (ar[0] === L) {
      var api = function () { p(api, arguments); };
      var namespace = ar[1];
      api.q = api.q || [];
      if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); }
      else p(cal, ar);
      return;
    }
    p(cal, ar);
  };
})(window, "https://app.cal.com/embed/embed.js", "init");
</script>
<script>
  (function(){
    function boot(){
      if (typeof Cal !== 'function') return setTimeout(boot, 200);
      Cal('init', { origin: 'https://cal.com' });
      Cal('inline', {
        elementOrSelector: '#cal-talk',
        calLink: ${JSON.stringify(talkLink)},
        layout: 'month_view',
        config: Object.assign({ layout: 'month_view', theme: 'dark' }, SR_UTM)
      });
      Cal('ui', {
        theme: 'dark',
        cssVarsPerTheme: { dark: { 'cal-brand': '#c9a24b' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
    }
    boot();
  })();
</script>`;
} else {
  bookingEmbed = `<div class="cal-wrap"><p class="cal-fallback">${esc(sec.booking_intro)} <a href="mailto:${attr(d.booking.email)}">${esc(d.booking.email)}</a></p></div>`;
  calScript = '';
}

const bookingAlt = workshopUrl
  ? `<span>${esc(sec.booking_workshop_label)}:</span> <a href="${attr(workshopUrl)}" target="_blank" rel="noopener" data-utm>${esc(workshopUrl.replace(/^https?:\/\//, ''))}</a>`
  : `<span>${esc(sec.booking_workshop_label)}:</span> <a href="mailto:${attr(d.booking.email)}">${esc(d.booking.email)}</a>`;

/* speaker one-pager — only linked when the file is actually there */
const pdfPath = path.join(APP, 'downloads', p.pdf.filename);
const pdfLink = fs.existsSync(pdfPath)
  ? `<a class="btn btn-ink" href="/downloads/${attr(p.pdf.filename)}" download>${esc(p.pdf.label)}</a>`
  : '';
if (!pdfLink) console.warn(`  ! ${p.pdf.filename} not in app/downloads — the download link is omitted this build.`);

/* faq */
const faqItems = (p.faq || []).map(f =>
  `      <div class="faq-item">
        <div class="faq-q">${esc(f.q)}</div>
        <p class="faq-a">${esc(f.a)}</p>
      </div>`
).join('\n');

const speakingTpl = fs.readFileSync(path.join(TPL, 'speaking.template.html'), 'utf8');
const speakingOut = fill(speakingTpl, {
  BASE_CSS: baseCss,
  META_TITLE: esc(d.meta.page_title),
  META_DESCRIPTION: esc(d.meta.page_description),
  CANONICAL: attr(d._canonical_url),
  NAV_LABEL: esc(p.nav_label),
  H1: esc(p.h1),
  HERO_SUB: esc(d.talk.subtitle),
  HERO_AUDIENCE: esc(d.talk.audience_line),
  HERO_CTA_PRIMARY: esc(p.hero.cta_primary),
  HERO_CTA_SECONDARY: esc(p.hero.cta_secondary),
  VIDEO_SECTION: videoSection,
  TALK_HEADING: esc(sec.talk_heading),
  TALK_SIGNATURE_TITLE: esc(d.talk.signature_title),
  TALK_BODY: paras(d.talk.body),
  TAKEAWAYS_HEADING: esc(sec.takeaways_heading),
  TAKEAWAYS: takeaways,
  FEE_STATEMENT: esc(d.talk.fee_statement),
  FEE_REASON: esc(d.talk.fee_reason),
  PROOF_SECTION: proofSection,
  TOPICS_HEADING: esc(sec.topics_heading),
  TOPICS_COL_TALK: esc(sec.topics_col_talk),
  TOPICS_COL_COVERS: esc(sec.topics_col_covers),
  TOPICS_ROWS: topicsRows,
  TAILORING_NOTE: esc(d.talk.tailoring_note),
  WORKSHOP_LABEL: esc(sec.workshop_heading),
  WORKSHOP_HEADING: esc(sec.workshop_heading),
  WORKSHOP_INTRO: esc(d.workshop.intro),
  WORKSHOP_ASK: esc(d.workshop.ask_line),
  WORKSHOP_CTA: workshopCta,
  LOGISTICS_LABEL: esc(sec.logistics_heading),
  LOGISTICS_HEADING: esc(sec.logistics_heading),
  LOGISTICS_ITEMS: hostItems,
  LOGISTICS_DELIVERY: esc(d.logistics.delivery),
  BOOKING_LABEL: esc(sec.booking_talk_label),
  BOOKING_HEADING: esc(sec.booking_heading),
  BOOKING_INTRO: esc(sec.booking_intro),
  EMAIL: attr(d.booking.email),
  BOOKING_EMBED: bookingEmbed,
  BOOKING_ALT: bookingAlt,
  CAL_SCRIPT: calScript,
  ABOUT_HEADING: esc(sec.about_heading),
  PERSON_NAME: esc(d.person.name),
  PORTRAIT: attr(p.portrait),
  BIO: bioHtml(d.person.bio, d.person.bio_italic_titles),
  PDF_LINK: pdfLink,
  CATALOGUE_URL: attr(p.books_catalogue_url),
  CATALOGUE_LABEL: esc(sec.about_books_link),
  FAQ_HEADING: esc(sec.faq_heading),
  FAQ_ITEMS: faqItems,
});
fs.writeFileSync(path.join(APP, 'speaking.html'), speakingOut);

/* ---------- publish the source of truth ---------- */
fs.copyFileSync(path.join(ROOT, 'speaking.json'), path.join(APP, 'speaking.json'));

/* ---------- bust the service-worker cache when content changes ---------- */
const swFile = path.join(APP, 'sw.js');
if (fs.existsSync(swFile)) {
  const hash = crypto.createHash('sha1')
    .update(indexOut + speakingOut).digest('hex').slice(0, 8);
  let sw = fs.readFileSync(swFile, 'utf8');
  const next = `const CACHE_NAME = 'sukant-${hash}';`;
  const updated = sw.replace(/const CACHE_NAME = '[^']*';/, next);
  if (updated !== sw) { fs.writeFileSync(swFile, updated); console.log(`  sw.js cache → sukant-${hash}`); }
}

console.log('built  app/index.html');
console.log('built  app/speaking.html   (/speaking)');
console.log('copied app/speaking.json   (/speaking.json)');
console.log(`       video.show=${d.video.show}  proof.show=${p.proof.show}  topics=${d.topics.length}`);
console.log('       workshop: no prices, CTA opens the Cal popup');
