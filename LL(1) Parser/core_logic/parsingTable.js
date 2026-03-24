import { EPSILON } from "./grammarUtilis.js";
import { firstOfSequence } from "./firstFollow.js";
 
export function buildParsingTable(grammar, firstSets, followSets) {
  const table = {};
  const conflicts = [];
 
  for (const A of grammar.nonTerminals) {
    table[A] = {};
  }
 
  for (const [A, rhsList] of Object.entries(grammar.productions)) {
    for (const rhs of rhsList) {
      const firstAlpha = firstOfSequence(rhs, firstSets);
 
      
      const targets = new Set();
      for (const t of firstAlpha) {
        if (t !== EPSILON) targets.add(t);
      }
      if (firstAlpha.has(EPSILON)) {
        for (const b of followSets[A]) {
          targets.add(b);
        }
      }
 
      for (const a of targets) {
        if (!table[A][a]) {
          table[A][a] = { production: rhs, conflict: null, synch: false };
        } else {
          
          const type = firstAlpha.has(EPSILON)
            ? "FIRST/FOLLOW conflict"
            : "FIRST/FIRST conflict";
          const conflict = {
            nonTerminal: A,
            lookahead: a,
            existingProduction: table[A][a].production,
            newProduction: rhs,
            type
          };
          table[A][a].conflict = conflict;
          conflicts.push(conflict);
        }
      }
    }
  }
 
  for (const A of grammar.nonTerminals) {
    for (const b of followSets[A]) {
      if (!table[A][b]) {
        table[A][b] = { production: null, conflict: null, synch: true };
      }
    }
  }
 
  return { table, conflicts };
}