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
    
    const nameInput = document.getElementById('formName');
    const name = nameInput.value.trim();
    const email = document.getElementById('formEmail').value;
    const phone = document.getElementById('formPhone').value;
    const website = document.getElementById('formWebsite')?.value || ''; // Honeypot
    
    // Clear any previous error
    const existingError = this.querySelector('.form__error');
    if (existingError) existingError.remove();
    
    // Validate full name (must have first and last name)
    if (!name || !name.includes(' ') || name.split(' ').filter(w => w.length > 0).length < 2) {
      const errorMsg = document.createElement('p');
      errorMsg.className = 'form__error';
      errorMsg.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px; margin-bottom: 0;';
      errorMsg.textContent = 'Please enter your first and last name';
      nameInput.parentNode.appendChild(errorMsg);
      nameInput.focus();
      return;
    }
    
    // Show loading state
    const submitBtn = this.querySelector('.form__submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
      // Submit lead (honeypot field included for spam detection)
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, website })
      });
      
      if (response.ok) {
        // Show success with two action buttons
        this.innerHTML = `
          <div style="text-align: center; padding: 30px;">
            <p style="font-family: var(--font-display); font-size: 20px; color: var(--text-heading); margin-bottom: 10px;">
              Thank you, ${name.split(' ')[0]}!
            </p>
            <p style="color: var(--text-light); margin-bottom: 25px;">
              Your guide is ready. We've also sent a copy to your email.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">
              <a href="/the-invisible-architecture/" target="_blank" 
                 style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px; background: var(--navy); color: white; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; transition: opacity 0.2s;"
                 onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                Read Online
              </a>
              <a href="/api/download/booklet" download="The_Invisible_Architecture.pdf"
                 style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-decoration: none; font-size: 14px; letter-spacing: 0.5px; transition: all 0.2s;"
                 onmouseover="this.style.background='var(--gold)'; this.style.color='var(--navy)'" onmouseout="this.style.background='transparent'; this.style.color='var(--gold)'">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download PDF
              </a>
            </div>
          </div>
        `;
        
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
