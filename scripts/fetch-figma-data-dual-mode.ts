import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

function resolveFigmaSection(currentPath: string): { section: string; subSection: string } {
  const parts = currentPath.split(' > ').map(p => p.trim());
  if (parts.length <= 1) {
    return { section: parts[0] || 'General', subSection: 'General' };
  }
  if (parts[1] === 'Frame 155' && parts.length > 2) {
    return { section: parts[2], subSection: parts.length > 3 ? parts[3] : parts[2] };
  }
  return { section: parts[1], subSection: parts.length > 2 ? parts[2] : parts[1] };
}

async function fetchFigmaData() {
  console.log('========================================================================');
  console.log('[OMNIDESIGN-QA] UNIVERSAL FIGMA DATA INGESTION ENGINE');
  console.log('========================================================================');

  const figmaUrl = process.env.FIGMA_URL || '';
  const token = (process.env.FIGMA_ACCESS_TOKEN || '').trim();

  if (!figmaUrl) {
    console.error('Error: FIGMA_URL is missing in .env file!');
    process.exit(1);
  }

  const urlMatch = figmaUrl.match(/file\/([a-zA-Z0-9]+)|design\/([a-zA-Z0-9]+)/);
  const fileKey = urlMatch ? (urlMatch[1] || urlMatch[2]) : null;
  const nodeMatch = figmaUrl.match(/node-id=([0-9%3A\-]+)/);
  const rawNodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]).replace('%3A', ':').replace('-', ':') : null;

  console.log('Target Figma File Key:', fileKey || 'Unknown');
  console.log('Target Artboard Node ID:', rawNodeId || 'Entire Page / Root');

  const outputCatalogPath = path.join(process.cwd(), 'reports/audit/figma-complete-catalog.json');
  const auditDir = path.dirname(outputCatalogPath);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  if (token && token.length > 5) {
    console.log('\nMode A: Valid FIGMA_ACCESS_TOKEN detected in .env.');
    console.log('Fetching complete design tree from Figma REST API...');
    try {
      const endpoint = rawNodeId 
        ? ('https://api.figma.com/v1/files/' + fileKey + '/nodes?ids=' + encodeURIComponent(rawNodeId))
        : ('https://api.figma.com/v1/files/' + fileKey);

      const res = await fetch(endpoint, {
        headers: { 'X-Figma-Token': token }
      });

      if (!res.ok) {
        if (res.status === 403) {
          console.error('\nPERMISSION DENIED: Provided Figma Token does not have read permission for this file.');
          process.exit(1);
        }
        throw new Error('Figma API returned status ' + res.status);
      }

      const data: any = await res.json();
      console.log('Successfully fetched live design tree from Figma API.');

      const catalog: any[] = [];
      const traverse = (node: any, pathStr = '') => {
        if (!node) return;
        const currentPath = pathStr ? (pathStr + ' > ' + node.name) : node.name;
        const b = node.absoluteBoundingBox;
        const box = b ? { x: b.x, y: b.y, width: b.width, height: b.height } : {};
        const { section, subSection } = resolveFigmaSection(currentPath);

        if (node.type === 'TEXT') {
          const style = node.style || {};
          let color = { r: 1, g: 1, b: 1, a: 1 };
          if (node.fills && Array.isArray(node.fills) && node.fills[0] && node.fills[0].color) {
            color = { ...node.fills[0].color, a: node.fills[0].opacity ?? 1 };
          }
          catalog.push({
            nodeId: node.id,
            section,
            subSection,
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
            section,
            subSection,
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
      console.log('Saved complete catalog with ' + catalog.length + ' elements to: ' + outputCatalogPath);
      return;
    } catch (err: any) {
      console.error('Figma API fetch failed:', err.message);
      console.log('Falling back to Tokenless Browser Extraction...');
    }
  }

  console.log('\nMode B: Launching automated browser session to extract Figma document tree directly...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Figma URL:', figmaUrl);
  try {
    await page.goto(figmaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    const title = await page.title();
    console.log('Page Title:', title);

    const extractedData: any[] = await page.evaluate(async () => {
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

          catalog.push({
            nodeId: node.id,
            section: parts[1] || 'General',
            subSection: parts[2] || 'General',
            name: (node.characters || node.name || '').trim(),
            category: node.type === 'TEXT' ? 'Typography' : 'Section Box Model',
            figmaPath,
            box,
            fontFamily: node.fontName ? node.fontName.family : 'Inter',
            fontSize: typeof node.fontSize === 'number' ? node.fontSize : 14,
            fontWeight: 400,
            characters: node.characters
          });

          if (node.children) {
            for (const child of node.children) extractNode(child);
          }
        }

        for (const root of targetNodes) extractNode(root);
        return catalog;
      }
      return [];
    });

    if (extractedData && extractedData.length > 0) {
      fs.writeFileSync(outputCatalogPath, JSON.stringify(extractedData, null, 2), 'utf8');
      console.log('Automated Extraction Successful! Extracted ' + extractedData.length + ' elements.');
    }

    await browser.close();
  } catch (err: any) {
    await browser.close();
    console.error('Failed to automate Figma page:', err.message);
  }
}

fetchFigmaData().catch(console.error);
