import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const LINEAGE_STYLE_FILE = /^lineage-(\d+).*\.css$/;
const CLASS_TOKEN = /\.([_a-zA-Z][-_a-zA-Z0-9]*)/g;

export function stripCssComments(cssText) {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, "");
}

export function bemRoot(className) {
  const elementIndex = className.indexOf("__");
  const modifierIndex = className.indexOf("--");
  const indexes = [elementIndex, modifierIndex].filter((index) => index > 0);
  if (indexes.length === 0) return className;
  return className.slice(0, Math.min(...indexes));
}

export function isBemMember(className) {
  return className.includes("__") || className.includes("--");
}

export function splitSelectorList(prelude) {
  const selectors = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote = null;
  let escaped = false;

  for (const character of prelude) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      current += character;
      quote = character;
      continue;
    }
    if (character === "(") parenDepth += 1;
    if (character === ")") parenDepth = Math.max(0, parenDepth - 1);
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);

    if (character === "," && parenDepth === 0 && bracketDepth === 0) {
      const selector = current.trim();
      if (selector) selectors.push(selector);
      current = "";
      continue;
    }
    current += character;
  }

  const selector = current.trim();
  if (selector) selectors.push(selector);
  return selectors;
}

export function selectorPreludes(cssText) {
  const css = stripCssComments(cssText);
  const preludes = [];
  const pattern = /([^{}]+)\{/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith("@")) continue;
    for (const selector of splitSelectorList(prelude)) {
      if (selector && !selector.startsWith("@")) preludes.push(selector);
    }
  }
  return preludes;
}

export function classNamesInSelector(selector) {
  const names = [];
  const pattern = new RegExp(CLASS_TOKEN.source, "g");
  let match;
  while ((match = pattern.exec(selector)) !== null) names.push(match[1]);
  return names;
}

export function inferLineageId(filePath) {
  const filename = filePath.split(/[\\/]/).at(-1) ?? "";
  const match = filename.match(LINEAGE_STYLE_FILE);
  if (!match) {
    throw new Error(`Cannot infer Lineage id from stylesheet path: ${filePath}`);
  }
  return match[1];
}

export function findCrossLineageNamespaceCollisions(files) {
  const parsed = files.map(({ filePath, cssText }) => ({
    filePath,
    lineageId: inferLineageId(filePath),
    selectors: selectorPreludes(cssText),
  }));

  const candidateRoots = new Set();
  for (const file of parsed) {
    for (const selector of file.selectors) {
      for (const className of classNamesInSelector(selector)) {
        if (isBemMember(className)) candidateRoots.add(bemRoot(className));
      }
    }
  }

  const claims = new Map();
  for (const file of parsed) {
    for (const selector of file.selectors) {
      const classNames = classNamesInSelector(selector);
      if (classNames.length === 0) continue;
      const firstRoot = bemRoot(classNames[0]);
      if (!candidateRoots.has(firstRoot)) continue;

      if (!claims.has(firstRoot)) claims.set(firstRoot, new Map());
      const byLineage = claims.get(firstRoot);
      if (!byLineage.has(file.lineageId)) byLineage.set(file.lineageId, []);
      byLineage.get(file.lineageId).push({ filePath: file.filePath, selector });
    }
  }

  const collisions = [];
  for (const [root, byLineage] of claims.entries()) {
    if (byLineage.size < 2) continue;
    collisions.push({
      root,
      lineages: [...byLineage.entries()]
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([lineageId, evidence]) => ({ lineageId, evidence })),
    });
  }

  return collisions.sort((a, b) => a.root.localeCompare(b.root));
}

export function formatNamespaceCollisions(collisions) {
  return collisions
    .map((collision) => {
      const evidence = collision.lineages
        .map(({ lineageId, evidence: entries }) => {
          const samples = entries
            .slice(0, 3)
            .map(({ filePath, selector }) => `    - ${filePath}: ${selector}`)
            .join("\n");
          return `  Lineage ${lineageId}:\n${samples}`;
        })
        .join("\n");
      return `Global CSS namespace \".${collision.root}\" is claimed by multiple Lineages:\n${evidence}`;
    })
    .join("\n\n");
}

export function assertNoCrossLineageNamespaceCollisions(files) {
  const collisions = findCrossLineageNamespaceCollisions(files);
  if (collisions.length > 0) {
    throw new Error(
      `Cross-Lineage global CSS namespace collision detected.\n\n${formatNamespaceCollisions(collisions)}`,
    );
  }
  return collisions;
}

export async function loadLineageStyles(stylesDir = resolve("app/styles")) {
  const entries = await readdir(stylesDir, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && LINEAGE_STYLE_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    filenames.map(async (filename) => ({
      filePath: `app/styles/${filename}`,
      cssText: await readFile(resolve(stylesDir, filename), "utf8"),
    })),
  );
}

export async function checkRepositoryLineageCssNamespaceIsolation(stylesDir = resolve("app/styles")) {
  const files = await loadLineageStyles(stylesDir);
  assertNoCrossLineageNamespaceCollisions(files);
  return { filesChecked: files.length, collisions: [] };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    const result = await checkRepositoryLineageCssNamespaceIsolation();
    console.log(`LINEAGE_CSS_NAMESPACE_ISOLATION=PASS files=${result.filesChecked}`);
  } catch (error) {
    console.error("LINEAGE_CSS_NAMESPACE_ISOLATION=FAIL");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
