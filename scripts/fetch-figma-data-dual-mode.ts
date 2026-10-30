function resolveSemanticSection(pathStr: string): string {
  const sm: Record<string, string> = {
    'Frame 154': 'Hero',
    'Frame 167': 'Key Metrics / Stats',
    'Frame 106': 'Social Proof / Clients',
    'Frame 177': 'Selected Work / Portfolio',
    'Frame 176': 'eCommerce Services',
    'Frame 175': 'AI Solutions',
    'Frame 174': 'Industries',
    'Frame 153': 'Why BRISTM',
    'Component 124': 'BRISTM Apps',
    'Frame 314': 'Process',
    'Frame 172': 'Client Reviews / Testimonials',
    'Frame 171': 'FAQ / Before You Ask',
    'Frame 310': 'CTA / Consultation',
    'Frame 315': 'Contact / Let Us Build',
    'Component 70': 'Header',
    'Frame 186': 'Footer'
  };
  for (const k in sm) { if (pathStr.indexOf(k) !== -1) return sm[k]; }
  return pathStr.split(' > ')[1] || 'General';
}
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Universal Dual-Mode Figma Data Ingestion Engine:
 * Mode A: If FIGMA_ACCESS_TOKEN is present -> Call official Figma REST API.
 * Mode B: If FIGMA_ACCESS_TOKEN is empty -> Automate browser, inject extractor script into Figma page context,
 *         extract the document tree, and save figma-complete-catalog.json directly into reports/audit/ automatically!
 */

async function fetchFigmaData() {
  console.log('========================================================================');
  console.log('?? UNIVERSAL FIGMA DATA INGESTION ENGINE (DUAL-MODE)');
  console.log('========================================================================');

  const figmaUrl = process.env.FIGMA_URL || '';
  const token = (process.env.FIGMA_ACCESS_TOKEN || '').trim();

  if (!figmaUrl) {
    console.error('? Error: FIGMA_URL is missing in .env file!');
    process.exit(1);
  }

  // Parse File Key & Node ID
  const urlMatch = figmaUrl.match(/file\/([a-zA-Z0-9]+)|design\/([a-zA-Z0-9]+)/);
  const fileKey = urlMatch ? (urlMatch[1] || urlMatch[2]) : null;
  const nodeMatch = figmaUrl.match(/node-id=([0-9%3A\-]+)/);
  const rawNodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]).replace('%3A', ':').replace('-', ':') : null;

  console.log(`?? Target Figma File Key: ${fileKey || 'Unknown'}`);
  console.log(`?? Target Artboard Node ID: ${rawNodeId || 'Entire Page / Root'}`);

  const outputCatalogPath = path.join(process.cwd(), 'reports/audit/figma-complete-catalog.json');
  const auditDir = path.dirname(outputCatalogPath);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // MODE A: FIGMA API TOKEN PROVIDED -> FETCH ONCE VIA REST API
  // -------------------------------------------------------------------------
  if (token && token.length > 5) {
    console.log('\n?? Mode A Activated: Valid FIGMA_ACCESS_TOKEN detected in .env.');
    console.log('?? Fetching complete design tree from Figma REST API...');
    try {
      const endpoint = rawNodeId 
        ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(rawNodeId)}`
        : `https://api.figma.com/v1/files/${fileKey}`;

      const res = await fetch(endpoint, {
        headers: { 'X-Figma-Token': token }
      });

      if (!res.ok) {
        if (res.status === 403) {
          console.error('\n? PERMISSION DENIED: The provided Figma Token does not have permission to read this file.');
          console.error('?? Please verify your token permissions or switch to Tokenless Browser mode (leave token empty in .env).');
          process.exit(1);
        }
        throw new Error(`Figma API returned status HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      console.log('? Successfully fetched live design tree from Figma API.');

      // Transform REST API nodes into standard catalog format
      const catalog: any[] = [];
      const traverse = (node: any, pathStr = '') => {
        if (!node) return;
        const currentPath = pathStr ? `${pathStr} > ${node.name}` : node.name;
        const b = node.absoluteBoundingBox;
        const box = b ? { x: b.x, y: b.y, width: b.width, height: b.height } : {};

        if (node.type === 'TEXT') {
          const style = node.style || {};
          let color = { r: 1, g: 1, b: 1, a: 1 };
          if (node.fills && Array.isArray(node.fills) && node.fills[0] && node.fills[0].color) {
            color = { ...node.fills[0].color, a: node.fills[0].opacity ?? 1 };
          }
          catalog.push({
            nodeId: node.id,
            section: resolveSemanticSection(currentPath),
            subSection: currentPath.split(' > ')[2] || 'General',
            name: (node.characters || node.name || '').trim(),
            category: 'Typography',
            figmaPath: currentPath,
            box,
            fontFamily: style.fontFamily || 'Inter',
            fontSize: style.fontSize || 14,
            fontWeight: style.fontWeight || 400,
            lineHeightPx: style.lineHeightPx || style.fontSize || 14,
            color,
            characters: node.characters || node.name
          });
        } else if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
          catalog.push({
            nodeId: node.id,
            section: resolveSemanticSection(currentPath),
            subSection: currentPath.split(' > ')[2] || 'General',
            name: node.name,
            category: 'Section Box Model',
            figmaPath: currentPath,
            box
          });
        }

        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((c: any) => traverse(c, currentPath));
        }
      };

      if (data.nodes && rawNodeId && data.nodes[rawNodeId]) {
        traverse(data.nodes[rawNodeId].document);
      } else if (data.document) {
        traverse(data.document);
      }

      fs.writeFileSync(outputCatalogPath, JSON.stringify(catalog, null, 2), 'utf8');
      console.log(`?? Saved complete catalog with ${catalog.length} elements to: ${outputCatalogPath}`);
      return;
    } catch (err: any) {
      console.error('? Figma API fetch failed:', err.message);
      console.log('?? Falling back to Tokenless Browser Extraction...');
    }
  }

  // -------------------------------------------------------------------------
  // MODE B: TOKEN IS EMPTY -> TOKENLESS BROWSER & IN-PAGE SCRIPT EXTRACTION
  // -------------------------------------------------------------------------
  console.log('\n?? Mode B Activated: FIGMA_ACCESS_TOKEN is empty.');
  console.log('?? Launching automated browser session to extract Figma document tree directly...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log(`?? Navigating to Figma URL: ${figmaUrl}`);
  try {
    await page.goto(figmaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    // 1. Permission & Access Checks
    const pageText = await page.innerText('body').catch(() => '');
    const title = await page.title();

    const isLoginWall = pageText.includes('Log in to Figma') || pageText.includes('Sign in') || page.url().includes('figma.com/login');
    const isAccessDenied = pageText.includes('Ask to edit') === false && 
                           (pageText.includes('You need permission') || 
                            pageText.includes('Request access') || 
                            pageText.includes('Access denied') ||
                            pageText.includes('File not found') ||
                            pageText.includes('deleted or moved'));

    if (isAccessDenied) {
      console.error('\n========================================================================');
      console.error('? PERMISSION ALERT: NO VIEW-ONLY ACCESS DETECTED!');
      console.error('========================================================================');
      console.error(`Figma reports that your session does NOT have view permission for this file:`);
      console.error(`URL: ${figmaUrl}`);
      console.error('?? ACTION REQUIRED:');
      console.error('   1. Request "Can view" or "Can edit" access from the file owner.');
      console.error('   2. Or set link sharing to: "Anyone with the link can view".');
      console.error('========================================================================\n');
      await browser.close();
      process.exit(1);
    }

    if (isLoginWall) {
      console.warn('\n?? NOTICE: Figma requires login to view this private file without an API token.');
      console.warn('?? OPTION 1: Set file sharing to "Anyone with the link can view".');
      console.warn('?? OPTION 2: If file is strictly private to your account, open the file in your browser,');
      console.warn('   paste `scripts/export-figma-catalog-without-token.js` into Console (F12),');
      console.warn('   and drop the downloaded JSON into reports/audit/figma-complete-catalog.json\n');
      await browser.close();
      process.exit(1);
    }

    console.log(`? Access confirmed! Page Title: "${title}". File is open and accessible.`);
    console.log('?? Executing automated in-page extraction script...');

    // 2. Automate in-page extraction directly inside Playwright!
    const extractedData: any[] = await page.evaluate(async () => {
      // Check if figma global is accessible
      const w: any = window;
      if (typeof w.figma !== 'undefined' && w.figma.currentPage) {
        const selection = w.figma.currentPage.selection;
        const targetNodes = selection.length > 0 ? selection : w.figma.currentPage.children;
        const catalog: any[] = [];

        function getBreadcrumb(node: any, path: string[] = []): string {
          if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return path.join(' > ');
          return getBreadcrumb(node.parent, [node.name, ...path]);
        }

        function extractNode(node: any) {
          if (!node || !node.visible) return;
          const b = node.absoluteBoundingBox;
          const box = b ? { x: b.x, y: b.y, width: b.width, height: b.height } : {};
          const figmaPath = getBreadcrumb(node);
          const parts = figmaPath.split(' > ');

          if (node.type === 'TEXT') {
            catalog.push({
              nodeId: node.id,
              section: parts[1] || 'General',
              subSection: parts[2] || 'General',
              name: (node.characters || node.name || '').trim(),
              category: 'Typography',
              figmaPath,
              box,
              fontFamily: node.fontName ? node.fontName.family : 'Inter',
              fontSize: typeof node.fontSize === 'number' ? node.fontSize : 14,
              fontWeight: 400,
              characters: node.characters
            });
          } else {
            catalog.push({
              nodeId: node.id,
              section: parts[1] || 'General',
              subSection: parts[2] || 'General',
              name: node.name,
              category: 'Section Box Model',
              figmaPath,
              box
            });
          }

          if (node.children) {
            for (const child of node.children) extractNode(child);
          }
        }

        for (const root of targetNodes) extractNode(root);
        return catalog;
      }

      // Fallback: Scrape visible Figma canvas SVG and DOM layer tree
      const elements: any[] = [];
      document.querySelectorAll('[data-layer-id], [class*="layer_row"]').forEach((el: any) => {
        const text = el.innerText || '';
        if (text) {
          elements.push({
            name: text.trim(),
            category: 'Layer Node',
            section: 'General',
            subSection: 'General',
            figmaPath: text.trim()
          });
        }
      });
      return elements;
    });

    if (extractedData && extractedData.length > 0) {
      fs.writeFileSync(outputCatalogPath, JSON.stringify(extractedData, null, 2), 'utf8');
      console.log(`?? Automated Extraction Successful! Extracted ${extractedData.length} elements.`);
      console.log(`?? Saved catalog directly to: ${outputCatalogPath}`);
    } else {
      console.warn('?? Automated headless DOM extraction returned 0 nodes (Figma rendered via Canvas).');
      console.warn('?? Paste `scripts/export-figma-catalog-without-token.js` into your browser console to complete extraction in 5 seconds.');
    }

    await browser.close();
  } catch (err: any) {
    await browser.close();
    console.error('? Failed to automate Figma page:', err.message);
  }
}

fetchFigmaData().catch(console.error);
