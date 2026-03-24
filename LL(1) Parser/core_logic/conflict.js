import { EPSILON } from "./grammarUtilis.js";

export function explainConflict(conflict) {
  const { nonTerminal, lookahead, existingProduction, newProduction, type } = conflict;

  const base =
    `Conflict at nonterminal '${nonTerminal}' with lookahead '${lookahead}'.\n` +
    `  Existing production: ${nonTerminal} -> ${prettyRhs(existingProduction)}\n` +
    `  New production:      ${nonTerminal} -> ${prettyRhs(newProduction)}\n`;

  if (type === "FIRST/FIRST conflict") {
    return (
      base +
      `  Type: FIRST/FIRST conflict.\n` +
      `  Cause: Both productions can start with '${lookahead}', so the parser\n` +
      `         cannot decide which rule to apply using one token of lookahead.\n` +
      `  Fix:   Apply left factoring to merge the common prefix into a new\n` +
      `         nonterminal, or rewrite the grammar so alternatives start with\n` +
      `         distinct terminals.`
    );
  }

  if (type === "FIRST/FOLLOW conflict") {
    return (
      base +
      `  Type: FIRST/FOLLOW conflict.\n` +
      `  Cause: The epsilon (${EPSILON}) production for '${nonTerminal}' causes\n` +
      `         FIRST and FOLLOW to overlap on '${lookahead}'. The parser cannot\n` +
      `         tell whether to expand using the epsilon rule or another rule.\n` +
      `  Fix:   Remove the epsilon production if possible, or restructure the\n` +
      `         grammar so FIRST and FOLLOW sets are disjoint for '${nonTerminal}'.`
    );
  }

  return (
    base +
    `  Type: General LL(1) conflict.\n` +
    `  Fix:  Check for left recursion and ambiguity in the grammar.`
  );
}


export function summarizeConflicts(conflicts) {
  if (!conflicts.length) {
    return "No LL(1) conflicts detected. Grammar is LL(1).";
  }

  return (
    `${conflicts.length} conflict(s) detected — grammar is NOT LL(1):\n\n` +
    conflicts.map((c, i) => `[${i + 1}] ${explainConflict(c)}`).join("\n\n")
  );
}

function prettyRhs(rhs) {
  if (!rhs || rhs.length === 0) return EPSILON;
  return rhs.join(" ");
}