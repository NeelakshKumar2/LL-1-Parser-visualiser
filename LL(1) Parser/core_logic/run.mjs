import { parseGrammar, eliminateLeftRecursion, leftFactorGrammar } from "./grammarUtilis.js";
import { computeFirstSets, computeFollowSets } from "./firstFollow.js";
import { buildParsingTable } from "./parsingTable.js";

const g = parseGrammar(`
E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id
`);

const first  = computeFirstSets(g);
const follow = computeFollowSets(g, first);
const { table, conflicts } = buildParsingTable(g, first, follow);

const fmt = s => `{ ${[...s].sort().join(", ")} }`;

console.log("=== FIRST sets ===");
for (const A of g.nonTerminals)
  console.log(`  FIRST(${A}) = ${fmt(first[A])}`);

console.log("\n=== FOLLOW sets ===");
for (const A of g.nonTerminals)
  console.log(`  FOLLOW(${A}) = ${fmt(follow[A])}`);

console.log("\n=== Parse Table ===");
const terms = [...g.terminals, "$"];
console.log("NT    " + terms.map(t => t.padEnd(16)).join(""));
for (const A of g.nonTerminals) {
  let row = A.padEnd(6);
  for (const t of terms) {
    const cell = table[A][t];
    if (!cell)           row += "-".padEnd(16);
    else if (cell.synch) row += "synch".padEnd(16);
    else                 row += `${A}->${cell.production.join(" ")}`.padEnd(16);
  }
  console.log(row);
}

console.log(`\nConflicts: ${conflicts.length === 0 ? "none — LL(1) ✓" : conflicts.length}`);