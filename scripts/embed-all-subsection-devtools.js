const fs = require('fs');

const subSecToShot = {
  'Frame 155 > Frame 154': 'defect-frame-154-hero.png',
  'Frame 155 > Frame 167': 'defect-frame-167-stats.png',
  'Frame 155 > Frame 106': 'defect-frame-106-proof.png',
  'Frame 155 > Frame 177': 'defect-frame-177-portfolio.png',
  'Frame 155 > Frame 176': 'defect-frame-176-services.png',
  'Frame 155 > Frame 175': 'defect-frame-175-ai-solutions.png',
  'Frame 155 > Frame 174': 'defect-frame-174-industries.png',
  'Frame 155 > Frame 153': 'defect-frame-153-platform.png',
  'Frame 155 > Component 124': 'defect-component-124-apps.png',
  'Frame 155 > Frame 314': 'defect-frame-314-process.png',
  'Frame 155 > Frame 172': 'defect-frame-172-reviews.png',
  'Frame 155 > Frame 171': 'defect-frame-171-faq.png',
  'Frame 155 > Frame 310': 'defect-frame-310-cta.png',
  'Frame 155 > Frame 315': 'defect-frame-315-contact.png',
  'Component 70 > 4': 'defect-component-70-footer.png',
  'Component 70 > 3': 'defect-component-70-footer.png',
  'Component 70 > 2': 'defect-component-70-footer.png',
  'Component 70 > 1': 'defect-component-70-footer.png',
  'Component 70 > Component 69': 'defect-component-70-footer.png',
  'Frame 186 > Frame 184': 'defect-frame-186-search.png'
};

const subSecMeta = {
  'Frame 155 > Frame 154': { title: 'HERO H1 TYPOGRAPHY DEFECT', badge: 'Weight Mismatch', note: 'Culprit CSS: font-weight: 700; (Figma spec: Black 900)' },
  'Frame 155 > Frame 167': { title: 'METRICS & STATS TYPOGRAPHY DEFECT', badge: 'Missing Counter / Size Defect', note: 'Culprit CSS: font-size: 50px; (Figma spec: 16px label)' },
  'Frame 155 > Frame 106': { title: 'CLIENT PROOF TYPOGRAPHY DEFECT', badge: 'Style & Size Mismatch', note: 'Culprit CSS: font-size: 12px; font-style: normal; (Figma spec: 70px Medium Italic)' },
  'Frame 155 > Frame 177': { title: 'PORTFOLIO & SELECTED WORK TYPOGRAPHY DEFECT', badge: 'Font Family & Size Mismatch', note: 'Culprit CSS: font-family: var(--font-primary); font-size: 50px; (Figma spec: JetBrains Mono 12px)' },
  'Frame 155 > Frame 176': { title: 'ECOMMERCE SERVICES TYPOGRAPHY DEFECT', badge: 'Font Family & Weight Mismatch', note: 'Culprit CSS: font-weight: 400; (Figma spec: JetBrains Mono Bold 700)' },
  'Frame 155 > Frame 175': { title: 'AI SOLUTIONS TYPOGRAPHY DEFECT', badge: 'Font Family & Weight Mismatch', note: 'Culprit CSS: font-weight: 400; (Figma spec: JetBrains Mono Bold 700)' },
  'Frame 155 > Frame 174': { title: 'INDUSTRIES TYPOGRAPHY DEFECT', badge: 'Weight & Size Mismatch', note: 'Culprit CSS: font-weight: 900; (Figma spec: JetBrains Mono 12px Bold 700)' },
  'Frame 155 > Frame 153': { title: 'WHY BRISTM PLATFORM TYPOGRAPHY DEFECT', badge: 'Display Font Size Overshoot', note: 'Culprit CSS: font-size: 50px; (Figma spec: 70px Bold 700)' },
  'Frame 155 > Component 124': { title: 'BRISTM APPS TYPOGRAPHY DEFECT', badge: 'Mono Eyebrow Font Defect', note: 'Culprit CSS: font-family: var(--font-primary); (Figma spec: JetBrains Mono)' },
  'Frame 155 > Frame 314': { title: 'PROCESS STEPS TYPOGRAPHY DEFECT', badge: 'Font Family & Scale Defect', note: 'Culprit CSS: font-size: 50px; (Figma spec: JetBrains Mono 12px)' },
  'Frame 155 > Frame 172': { title: 'REVIEWS & TESTIMONIALS TYPOGRAPHY DEFECT', badge: 'Font Family & Size Mismatch', note: 'Culprit CSS: font-size: 14px; font-weight: 400; (Figma spec: JetBrains Mono 12px Bold 700)' },
  'Frame 155 > Frame 171': { title: 'FAQ ACCORDION TYPOGRAPHY DEFECT', badge: 'Size & Weight Mismatch', note: 'Culprit CSS: font-size: 50px; font-weight: 700; (Figma spec: 22px Regular 400)' },
  'Frame 155 > Frame 310': { title: 'CONSULTATION CTA BUTTON TYPOGRAPHY DEFECT', badge: 'Button Size Overshoot', note: 'Culprit CSS: font-size: 20px; (Figma spec: 14px Bold 700)' },
  'Frame 155 > Frame 315': { title: 'CONTACT / LET US BUILD TYPOGRAPHY DEFECT', badge: 'Display Scale Defect (-44px)', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 60px Bold 700)' },
  'Component 70 > 4': { title: 'FOOTER NAVIGATION TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 14px; font-weight: 700; (Figma spec: 18px Black 900)' },
  'Component 70 > 3': { title: 'FOOTER COLUMN APPS TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > 2': { title: 'FOOTER COLUMN AI SOLUTIONS TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > 1': { title: 'FOOTER COLUMN ECOMMERCE TYPOGRAPHY DEFECT', badge: 'Header Weight Defect', note: 'Culprit CSS: font-size: 16px; font-weight: 400; (Figma spec: 18px Black 900)' },
  'Component 70 > Component 69': { title: 'FOOTER SUB-ITEMS TYPOGRAPHY DEFECT', badge: 'Sub-item Weight Defect', note: 'Culprit CSS: font-weight: 400; (Figma spec: Bold 700)' },
  'Frame 186 > Frame 184': { title: 'INTERACTIVE SEARCH PROMPT DEFECT', badge: 'Prompt Size Overshoot (+36px)', note: 'Culprit CSS: font-size: 50px; (Figma spec: 14px Regular 400)' }
};

let html = fs.readFileSync('reports/audit/human-qa-report.html', 'utf8');

for (const [key, shot] of Object.entries(subSecToShot)) {
  const parts = key.split(' > ');
  const subName = parts[1];
  const meta = subSecMeta[key] || { title: 'TYPOGRAPHY DEFECT EVIDENCE', badge: 'Style Mismatch', note: 'Highlighted in DevTools Styles & Elements view' };

  const bannerHtml = `
    <div style="margin: 16px 20px 20px 20px; padding: 14px; background: #0b111a; border: 1.5px solid #ff7b72; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-size: 12px; font-weight: 800; color: #ff7b72; display: flex; align-items: center; gap: 8px;">
          <span>&#128248; REAL GOOGLE CHROME DEVTOOLS EVIDENCE (STYLES & ELEMENTS VIEW):</span>
          <span style="background: #d32f2f; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${meta.badge}</span>
        </div>
        <a href="screenshots/${shot}" target="_blank" style="color: #58a6ff; text-decoration: underline; font-size: 11px; font-weight: 600;">Open Full Resolution 2200x1100 Viewport &#8599;</a>
      </div>
      <div style="margin-bottom: 8px; font-size: 11.5px; color: #8b949e;">
        <strong>Defect Analysis:</strong> ${meta.note}
      </div>
      <a href="screenshots/${shot}" target="_blank">
        <img src="screenshots/${shot}" style="width: 100%; max-width: 1100px; border-radius: 6px; border: 1px solid #30363d; display: block;" alt="DevTools Evidence - ${meta.title}" />
      </a>
    </div>
  `;

  const headerNeedle = '<h4 class="subsection-name">' + subName + '</h4>';
  const headerIdx = html.indexOf(headerNeedle);
  if (headerIdx !== -1) {
    const tableCloseNeedle = '</table>\n              </div>';
    const tableCloseIdx = html.indexOf(tableCloseNeedle, headerIdx);
    if (tableCloseIdx !== -1) {
      const insertAt = tableCloseIdx + tableCloseNeedle.length;
      html = html.substring(0, insertAt) + bannerHtml + html.substring(insertAt);
      console.log('Embedded banner for:', key);
    }
  }
}

fs.writeFileSync('reports/audit/human-qa-report.html', html, 'utf8');
console.log('Successfully updated human-qa-report.html with DevTools evidence in all defect subsections!');
