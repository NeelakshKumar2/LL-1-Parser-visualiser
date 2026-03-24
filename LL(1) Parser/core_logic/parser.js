import { EPSILON } from "./grammarUtilis.js";

export function predictiveParse(grammar, table, inputTokens) {
  const steps  = [];
  const errors = [];
  const stack  = ["$", grammar.startSymbol];
  const input  = [...inputTokens, "$"];
  let pointer  = 0;

  function snapshot(action, opts = {}) {
    steps.push({
      stack: [...stack],
      input: input.slice(pointer),
      action,
      ...opts
    });
  }

  snapshot("Initialize: push start symbol onto stack.");

  while (stack.length > 0) {
    const top       = stack[stack.length - 1];
    const lookahead = input[pointer];

    
    if (top === "$" && lookahead === "$") {
      snapshot("Accept: stack and input both exhausted.");
      break;
    }

    
    if (!grammar.nonTerminals.has(top)) {
      if (top === lookahead) {
        stack.pop();
        pointer++;
        snapshot(`Match terminal '${top}'. Advance input.`);
      } else {
        
        const msg = `Error: expected '${top}' but found '${lookahead}'. Skipping input symbol.`;
        errors.push(msg);
        pointer++;
        snapshot(msg, { error: true });
        if (pointer >= input.length) break;
      }
      continue;
    }

    
    const cell = (table[top] || {})[lookahead];

    if (!cell) {
      
      const msg = `Error: no rule for (${top}, '${lookahead}'). Skipping input symbol.`;
      errors.push(msg);
      pointer++;
      snapshot(msg, { error: true });
      if (pointer >= input.length) break;

    } else if (cell.synch && !cell.production) {
      
      const msg = `Panic-mode recovery: popping '${top}' (synch on '${lookahead}').`;
      errors.push(msg);
      stack.pop();
      snapshot(msg, { error: true });

    } else {
      
      const rhs = cell.production;
      stack.pop();

      
      if (!(rhs.length === 1 && rhs[0] === EPSILON)) {
        for (let i = rhs.length - 1; i >= 0; i--) {
          stack.push(rhs[i]);
        }
      }

      snapshot(`Apply ${top} -> ${rhs.join(" ")}.`, {
        productionApplied: { left: top, right: rhs }
      });
    }
  }

  
  const accepted =
    errors.length === 0 &&
    steps.length > 0 &&
    steps[steps.length - 1].action.startsWith("Accept");

  return { steps, errors, accepted };
}