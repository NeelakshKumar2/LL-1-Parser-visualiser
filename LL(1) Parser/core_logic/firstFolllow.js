import { EPSILON } from "./grammarUtilis.js";

export function computeFirstSets(grammar) {
  const first = {};

  for (const A of grammar.nonTerminals) {
    first[A] = new Set();
  }
  for (const a of grammar.terminals) {
    first[a] = new Set([a]);
  }
  first[EPSILON] = new Set([EPSILON]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const [A, rhsList] of Object.entries(grammar.productions)) {
      for (const rhs of rhsList) {
        let allNullable = true;
        for (const X of rhs) {
          for (const t of first[X] || []) {
            if (t !== EPSILON && !first[A].has(t)) {
              first[A].add(t);
              changed = true;
            }
          }
          if (!first[X] || !first[X].has(EPSILON)) {
            allNullable = false;
            break;
          }
        }
        if (allNullable && !first[A].has(EPSILON)) {
          first[A].add(EPSILON);
          changed = true;
        }
      }
    }
  }

  return first;
}

export function firstOfSequence(seq, firstSets) {
  const result = new Set();
  let allNullable = true;

  for (const X of seq) {
    const setX = firstSets[X] || new Set();
    for (const t of setX) {
      if (t !== EPSILON) result.add(t);
    }
    if (!setX.has(EPSILON)) {
      allNullable = false;
      break;
    }
  }

  if (allNullable) result.add(EPSILON);
  return result;
}

export function computeFollowSets(grammar, firstSets) {
  const follow = {};

  for (const A of grammar.nonTerminals) {
    follow[A] = new Set();
  }
  follow[grammar.startSymbol].add("$");

  let changed = true;
  while (changed) {
    changed = false;
    for (const [A, rhsList] of Object.entries(grammar.productions)) {
      for (const rhs of rhsList) {
        for (let i = 0; i < rhs.length; i++) {
          const B = rhs[i];
          if (!grammar.nonTerminals.has(B)) continue;

          const beta = rhs.slice(i + 1);
          const firstBeta = beta.length
            ? firstOfSequence(beta, firstSets)
            : new Set([EPSILON]);

          for (const t of firstBeta) {
            if (t !== EPSILON && !follow[B].has(t)) {
              follow[B].add(t);
              changed = true;
            }
          }

          if (beta.length === 0 || firstBeta.has(EPSILON)) {
            for (const t of follow[A]) {
              if (!follow[B].has(t)) {
                follow[B].add(t);
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  return follow;
}
