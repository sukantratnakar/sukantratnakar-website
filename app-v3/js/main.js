/* sukantratnakar.com v3 - Main JavaScript */
/* Created: 2026-03-21 */

// ============================================
// NAVIGATION
// ============================================

// Nav scroll effect
window.addEventListener('scroll', function() {
  const nav = document.getElementById('mainNav');
  if (nav) {
    if (window.scrollY > 60) {
      nav.classList.remove('nav--transparent');
      nav.classList.add('nav--solid');
    } else {
      nav.classList.add('nav--transparent');
      nav.classList.remove('nav--solid');
    }
  }
});

// Mobile menu toggle
function toggleNav() {
  const links = document.getElementById('navLinks');
  if (links) {
    links.classList.toggle('active');
  }
}

// ============================================
// SMOOTH SCROLL
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Close mobile menu if open
      const links = document.getElementById('navLinks');
      if (links && links.classList.contains('active')) {
        links.classList.remove('active');
      }
    }
  });
});

// ============================================
// CLICK TRACKING
// ============================================

function trackClick(source) {
  // Send to tracking endpoint
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'click',
      source: source,
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Silent fail
}

// Track all booking buttons
document.querySelectorAll('[data-track]').forEach(el => {
  el.addEventListener('click', function() {
    trackClick(this.dataset.track);
  });
});

// ============================================
// BROCHURE FORM
// ============================================

const brochureForm = document.getElementById('brochureForm');

if (brochureForm) {
  brochureForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('formName').value;
    const email = document.getElementById('formEmail').value;
    const phone = document.getElementById('formPhone').value;
    
    // Show loading state
    const submitBtn = this.querySelector('.form__submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
      // Submit lead
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });
      
      if (response.ok) {
        // Show success and open brochure
        this.innerHTML = `
          <div style="text-align: center; padding: 30px;">
            <p style="font-family: var(--font-display); font-size: 20px; color: var(--text-heading); margin-bottom: 10px;">
              Thank you, ${name.split(' ')[0]}!
            </p>
            <p style="color: var(--text-light); margin-bottom: 20px;">
              Your guide is opening now. We've also sent a copy to your email.
            </p>
          </div>
        `;
        
        // Open brochure page
        window.open('/the-invisible-architecture/', '_blank');
        
        // Track conversion
        trackClick('brochure-download');
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      // Still open the brochure but show a note
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      
      // Open brochure anyway
      window.open('/the-invisible-architecture/', '_blank');
      
      // Show message
      const note = document.createElement('p');
      note.style.cssText = 'color: var(--gold); font-size: 13px; margin-top: 15px; text-align: center;';
      note.textContent = 'Your guide is opening now.';
      this.appendChild(note);
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('sukantratnakar.com v3 loaded');
});
