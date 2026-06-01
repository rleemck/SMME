/**
 * Converts SW market taxonomy.xlsx → src/data/*.json
 * Run: node scripts/convert-taxonomy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const xlsxPath = path.join(root, "SW market taxonomy.xlsx");
const outDir = path.join(root, "src", "data");

if (!fs.existsSync(xlsxPath)) {
  console.error("Missing:", xlsxPath);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const wb = XLSX.readFile(xlsxPath);
console.log("Sheets:", wb.SheetNames);

function sheetRows(name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// --- Structure tab ---
const structureRows = sheetRows(
  wb.SheetNames.find((n) => /structure/i.test(n)) ?? wb.SheetNames[0]
);

const LEVEL_COLS = ["L0", "L1", "L2", "L3", "L4", "L5"];
const isVerticalSegment = (pathArr) => {
  const p = pathArr.join(" > ").toLowerCase();
  return (
    p.includes("vertical") ||
    (p.includes("industry") && !p.includes("horizontal")) ||
    /^vertical\b/i.test(pathArr[pathArr.length - 1] ?? "")
  );
};

function slug(parts) {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build tree from flat L0-L5 rows */
function buildTaxonomyTree(rows) {
  const root = { id: "root", level: "L0", name: "Root", path: [], children: [] };
  const nodeByPath = new Map();
  nodeByPath.set("", root);

  for (const row of rows) {
    const pathParts = [];
    for (const col of LEVEL_COLS) {
      const v = String(row[col] ?? "").trim();
      if (!v) break;
      pathParts.push(v);
    }
    if (pathParts.length === 0) continue;

    for (let i = 0; i < pathParts.length; i++) {
      const subPath = pathParts.slice(0, i + 1);
      const key = subPath.join("|");
      if (nodeByPath.has(key)) continue;

      const level = `L${i}` ;
      const parentKey = i === 0 ? "" : pathParts.slice(0, i).join("|");
      const parent = nodeByPath.get(parentKey);
      if (!parent) continue;

      const horizontal =
        !isVerticalSegment(subPath) &&
        subPath.some((p) => /software|tech|horizontal/i.test(p));
      const additive =
        horizontal &&
        subPath.some((p) => /software/i.test(p)) &&
        !isVerticalSegment(subPath);

      const node = {
        id: slug(subPath),
        level,
        name: pathParts[i],
        path: [...subPath],
        children: [],
        isHorizontal: horizontal,
        additiveToSoftwareMarket: additive,
      };
      parent.children.push(node);
      nodeByPath.set(key, node);
    }
  }

  return root.children.length === 1 ? root.children[0] : root;
}

// --- Definitions tab ---
const defRows = sheetRows(
  wb.SheetNames.find((n) => /definition/i.test(n)) ?? wb.SheetNames[1]
);

const definitionsByPath = {};
const definitionsByName = {};

for (const row of defRows) {
  const segment = String(row.Segment ?? row.segment ?? "").trim();
  const level = String(row.Level ?? row.level ?? "").trim();
  const definition = String(row.Definitions ?? row.definitions ?? "").trim();
  const expanded = String(
    row["Expanded definitions"] ?? row["Expanded Definitions"] ?? row.expanded ?? ""
  ).trim();
  if (!segment) continue;
  const entry = { level, segment, definition, expandedDefinition: expanded };
  definitionsByName[segment.toLowerCase()] = entry;
  definitionsByPath[segment.toLowerCase()] = entry;
}

function attachDefinitions(node) {
  const key = node.name.toLowerCase();
  const fullKey = node.path.join(" > ").toLowerCase();
  const def =
    definitionsByName[key] ||
    definitionsByPath[fullKey] ||
  Object.values(definitionsByName).find((d) => d.segment.toLowerCase() === key);
  if (def) {
    node.definition = def.definition || node.definition;
    node.expandedDefinition = def.expandedDefinition || node.expandedDefinition;
  }
  node.children?.forEach(attachDefinitions);
}

// --- Companies tab ---
const companyRows = sheetRows(
  wb.SheetNames.find((n) => /compan/i.test(n)) ?? wb.SheetNames[2]
);

const companies = companyRows
  .map((row, i) => ({
    id: `co-${i}`,
    companyName: String(row["Company Name"] ?? row.companyName ?? "").trim(),
    exchange: String(row.Exchange ?? row.exchange ?? "").trim(),
    ticker: String(row.Ticker ?? row.ticker ?? "").trim(),
    description: String(row.Description ?? row.description ?? "").trim(),
  }))
  .filter((c) => c.companyName);

// --- Merge ---
let taxonomyTree = buildTaxonomyTree(structureRows);
attachDefinitions(taxonomyTree);

// Flat index for search
const flatNodes = [];
function flatten(node, parentId = null) {
  flatNodes.push({
    id: node.id,
    level: node.level,
    name: node.name,
    path: node.path,
    definition: node.definition,
    expandedDefinition: node.expandedDefinition,
    isHorizontal: node.isHorizontal,
    additiveToSoftwareMarket: node.additiveToSoftwareMarket,
    parentId,
  });
  node.children?.forEach((c) => flatten(c, node.id));
}
flatten(taxonomyTree);

fs.writeFileSync(path.join(outDir, "taxonomy-tree.json"), JSON.stringify(taxonomyTree, null, 2));
fs.writeFileSync(path.join(outDir, "taxonomy-flat.json"), JSON.stringify(flatNodes, null, 2));
fs.writeFileSync(path.join(outDir, "definitions.json"), JSON.stringify(definitionsByName, null, 2));
fs.writeFileSync(path.join(outDir, "companies.json"), JSON.stringify(companies, null, 2));

console.log("Wrote taxonomy-tree.json, taxonomy-flat.json, definitions.json, companies.json");
console.log("Flat nodes:", flatNodes.length, "Companies:", companies.length);
