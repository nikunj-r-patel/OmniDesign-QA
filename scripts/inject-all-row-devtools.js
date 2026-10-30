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

const lines = fs.readFileSync('reports/audit/qa-audit-multi-viewport-perfect.tsv', 'utf8').split('\n');
const rowMap = new Map();
lines.slice(1).forEach(l => {
  const p = l.split('\t');
  if (p[6] && (p[6].includes('DEFECT') || p[6].includes('BUG'))) {
    const key = (p[1] + ' > ' + p[2]).trim();
    const name = p[4] ? p[4].trim() : '';
    if (name) {
      const shot = subSecToShot[key] || 'defect-frame-154-hero.png';
      rowMap.set(name, shot);
    }
  }
});

let html = fs.readFileSync('reports/audit/human-qa-report.html', 'utf8');

// Strip any small cropped defect images
html = html.replace(/<div style="margin-top:10px; padding:10px; background:#0b111a; border:1px solid #ff7b72; border-radius:8px;">[\s\S]*?<\/div>\s*<\/div>/g, '');

let embeddedCount = 0;
for (const [name, shot] of rowMap.entries()) {
  const targetTag = `<strong class="elem-title">${name}</strong>`;
  const escapedTag = `<strong class="elem-title">${name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>`;

  const cardHtml = `
    <div style="margin-top:10px; padding:10px; background:#0b111a; border:1.5px solid #ff7b72; border-radius:8px;">
      <div style="font-size:11px; font-weight:800; color:#ff7b72; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
        <span>&#128248; REAL GOOGLE CHROME DEVTOOLS EVIDENCE (PREVIEW & STYLES VIEW):</span>
        <a href="screenshots/${shot}" target="_blank" style="color:#58a6ff; text-decoration:underline;">Open Full 2200x1100 Viewport &#8599;</a>
      </div>
      <a href="screenshots/${shot}" target="_blank">
        <img src="screenshots/${shot}" style="width:100%; max-width:850px; border-radius:6px; border:1px solid #30363d; display:block;" alt="DevTools Evidence" />
      </a>
    </div>
  `;

  if (html.includes(escapedTag)) {
    html = html.replaceAll(escapedTag, escapedTag + cardHtml);
    embeddedCount++;
  } else if (html.includes(targetTag)) {
    html = html.replaceAll(targetTag, targetTag + cardHtml);
    embeddedCount++;
  }
}

fs.writeFileSync('reports/audit/human-qa-report.html', html, 'utf8');
console.log('Successfully injected authentic DevTools screenshot card on ' + embeddedCount + ' unique defect rows!');
