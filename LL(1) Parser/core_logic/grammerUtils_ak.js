export const EPSILON = "ε";

export function parseGrammar(grammarText) {
  const lines = grammarText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("//"));

  const productions = {};
  let startSymbol = null;

  for (const line of lines) {
    const match = line.match(/^([^\-]+)->(.+)$/);
    if (!match) throw new Error(`Invalid syntax: "${line}"`);
    const left = match[1].trim();
    if (!startSymbol) startSymbol = left;
    const right = match[2].split("|").map(alt => alt.trim().split(/\s+/).filter(Boolean));
    if (!productions[left]) productions[left] = [];
    productions[left].push(...right);
  }

  const nonTerminals = new Set(Object.keys(productions));
  const terminals = new Set();
  for (const rhsList of Object.values(productions))
    for (const rhs of rhsList)
      for (const sym of rhs)
        if (sym !== EPSILON && !nonTerminals.has(sym)) terminals.add(sym);

  return { productions, startSymbol, nonTerminals, terminals };
}

export function cloneGrammar(grammar) {
  return {
    startSymbol: grammar.startSymbol,
    nonTerminals: new Set(grammar.nonTerminals),
    terminals: new Set(grammar.terminals),
    productions: Object.fromEntries(
      Object.entries(grammar.productions).map(([A, rhsList]) => [
        A,
        rhsList.map(rhs => [...rhs])
      ])
    )
  };
}

function generateFreshNonTerminal(base, existing) {
  let candidate = `${base}'`;
  let i = 1;
  while (existing.has(candidate)) candidate = `${base}'${i++}`;
  return candidate;
}

export function eliminateLeftRecursion(grammar) {
  const g = cloneGrammar(grammar);
  const nts = Array.from(g.nonTerminals);

  for (let i = 0; i < nts.length; i++) {
    const Ai = nts[i];

    for (let j = 0; j < i; j++) {
      const Aj = nts[j];
      const newRhs = [];
      for (const rhs of g.productions[Ai])
        if (rhs[0] === Aj)
          for (const delta of g.productions[Aj])
            newRhs.push([...delta, ...rhs.slice(1)]);
        else
          newRhs.push(rhs);
      g.productions[Ai] = newRhs;
    }

    const alpha = [], beta = [];
    for (const rhs of g.productions[Ai])
      (rhs[0] === Ai ? alpha : beta).push(rhs);

    if (alpha.length > 0) {
      const Ap = generateFreshNonTerminal(Ai, g.nonTerminals);
      g.nonTerminals.add(Ap);
      g.productions[Ai] = beta.map(b => [...b, Ap]);
      g.productions[Ap] = [...alpha.map(a => [...a.slice(1), Ap]), [EPSILON]];
    }
  }

  return g;
}

export function leftFactorGrammar(grammar) {
  let g = cloneGrammar(grammar);
  let changed = true;

  while (changed) {
    changed = false;
    for (const A of Object.keys(g.productions)) {
      const groups = new Map();
      for (const rhs of g.productions[A]) {
        const key = rhs.length > 0 ? rhs[0] : EPSILON;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(rhs);
      }

      for (const [prefix, group] of groups.entries()) {
        if (group.length > 1 && prefix !== EPSILON) {
          changed = true;
          const Ap = generateFreshNonTerminal(A, g.nonTerminals);
          g.nonTerminals.add(Ap);
          g.productions[A] = [
            ...g.productions[A].filter(r => !group.includes(r)),
            [prefix, Ap]
          ];
          g.productions[Ap] = group.map(r =>
            r.slice(1).length > 0 ? r.slice(1) : [EPSILON]
          );
          break;
        }
      }
      if (changed) break;
    }
  }

  return g;
}