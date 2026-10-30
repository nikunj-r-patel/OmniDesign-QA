// =========================================================================
// ZERO-TOKEN FIGMA EXTRACTOR (100% Comprehensive Layer-by-Layer Exporter)
// =========================================================================
// How to use in Figma without any API token:
// 1. Open the Figma file in browser or Figma Desktop App (View-Only is fine).
// 2. Select your Artboard (e.g., "01. Home — Desktop 1280", "Tablet 744", or "Mobile 390").
//    (If nothing selected, it exports the entire current page).
// 3. Open Figma Console:
//    - In Desktop App: Help -> Troubleshooting -> Toggle Developer Tools -> Console
//    - In Browser (Chrome/Brave/Edge): Press F12 -> Console
// 4. Paste this code and press ENTER.
// 5. It will immediately download the exact JSON catalog needed for our QA framework!
// =========================================================================

(async function exportFigmaCatalogWithoutToken() {
  console.log('🚀 Starting Zero-Token Figma Deep Tree Extractor...');

  // Target node: selected frame or root frame
  const selection = figma.currentPage.selection;
  const targetNodes = selection.length > 0 ? selection : figma.currentPage.children;

  const catalog = [];

  function getBreadcrumb(node, path = []) {
    if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return path.join(' > ');
    return getBreadcrumb(node.parent, [node.name, ...path]);
  }

  function getSectionName(node) {
    let curr = node;
    let section = 'General'; const sectionMap = {'Frame 154': 'Hero', 'Frame 167': 'Key Metrics / Stats', 'Frame 106': 'Social Proof / Clients', 'Frame 177': 'Selected Work / Portfolio', 'Frame 176': 'eCommerce Services', 'Frame 175': 'AI Solutions', 'Frame 174': 'Industries', 'Frame 153': 'Why BRISTM', 'Component 124': 'BRISTM Apps', 'Frame 314': 'Process', 'Frame 172': 'Client Reviews / Testimonials', 'Frame 171': 'FAQ / Before You Ask', 'Frame 310': 'CTA / Consultation', 'Frame 315': 'Contact / Let Us Build', 'Component 70': 'Header', 'Frame 186': 'Footer'};
    while (curr && curr.parent && curr.parent.type !== 'PAGE' && curr.parent.type !== 'DOCUMENT') {
      section = curr.name;
      curr = curr.parent;
    }
    for (const k in sectionMap) { if (section.indexOf(k) !== -1) return sectionMap[k]; } return section;
  }

  function extractNode(node) {
    if (!node || !node.visible) return;

    const b = node.absoluteBoundingBox;
    const box = b ? {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height
    } : {};

    const figmaPath = getBreadcrumb(node);
    const section = getSectionName(node);

    // 1. Typography Nodes
    if (node.type === 'TEXT') {
      let color = { r: 1, g: 1, b: 1, a: 1 };
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].color) {
        color = {
          r: node.fills[0].color.r,
          g: node.fills[0].color.g,
          b: node.fills[0].color.b,
          a: node.fills[0].opacity !== undefined ? node.fills[0].opacity : 1
        };
      }

      let fontName = node.fontName;
      if (typeof fontName === 'symbol') fontName = { family: 'Inherited', style: 'Regular' };

      catalog.push({
        nodeId: node.id,
        section: section,
        name: node.characters.trim() || node.name,
        category: 'Typography',
        figmaPath: figmaPath,
        box: box,
        fontFamily: fontName ? fontName.family : 'Barlow Condensed',
        fontSize: typeof node.fontSize === 'number' ? node.fontSize : 14,
        fontWeight: fontName && fontName.style && fontName.style.toLowerCase().includes('bold') ? 700 : 400,
        lineHeightPx: node.lineHeight && typeof node.lineHeight.value === 'number' ? node.lineHeight.value : (node.fontSize || 14),
        color: color,
        textCase: node.textCase || 'ORIGINAL',
        characters: node.characters
      });
      return;
    }

    // 2. Vector / Icon Nodes
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.name.toLowerCase().includes('icon') || node.name.toLowerCase().includes('arrow')) {
      catalog.push({
        nodeId: node.id,
        section: section,
        name: node.name,
        category: 'SVG / Vector Icon',
        figmaPath: figmaPath,
        box: box
      });
      return;
    }

    // 3. Media / Image Nodes
    const hasImageFill = node.fills && Array.isArray(node.fills) && node.fills.some(f => f.type === 'IMAGE');
    if (hasImageFill || node.name.toLowerCase().includes('image') || node.name.toLowerCase().includes('marquee') || node.name.toLowerCase().includes('banner')) {
      catalog.push({
        nodeId: node.id,
        section: section,
        name: node.name,
        category: 'Media / Image / Marquee',
        figmaPath: figmaPath,
        box: box
      });
    }

    // 4. Section & Frame Box Models
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'GROUP') {
      if (node.parent && (node.parent.type === 'PAGE' || node.parent.name.includes('Home') || node.name.toUpperCase() === node.name)) {
        catalog.push({
          nodeId: node.id,
          section: section,
          name: node.name.includes('Section') ? node.name : `${node.name} Section Container`,
          category: 'Section Box Model',
          figmaPath: figmaPath,
          box: box,
          padding: {
            top: node.paddingTop || 0,
            bottom: node.paddingBottom || 0,
            left: node.paddingLeft || 0,
            right: node.paddingRight || 0
          },
          fills: (node.fills || []).map(f => f.type)
        });
      }
    }

    // Traverse children recursively down to every corner
    if ('children' in node && node.children) {
      for (const child of node.children) {
        extractNode(child);
      }
    }
  }

  // Execute extraction across selected or all roots
  for (const root of targetNodes) {
    extractNode(root);
  }

  console.log(`✅ Extracted ${catalog.length} elements across all corners without token!`);

  // Trigger JSON download in browser / desktop
  const jsonStr = JSON.stringify(catalog, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `figma-complete-catalog.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('🎉 Catalog file saved! Drop it into reports/audit/ to run QA without any token.');
})();
