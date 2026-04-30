/**
 * parseTree.js
 * Builds and renders a parse tree step by step from predictiveParse() steps.
 * Tree grows node by node as parsing progresses.
 * Exports: initParseTree, stepParseTree, renderCurrentTree, drawLegend
 */

const EPSILON = "ε";

// ── Tree Node ─────────────────────────────────────────────────────────────
class TreeNode {
  constructor(symbol, isTerminal = false) {
    this.symbol     = symbol;
    this.isTerminal = isTerminal;
    this.children   = [];
    this.parent     = null;
    this.highlight  = false;
  }
  addChild(node) {
    node.parent = this;
    this.children.push(node);
    return node;
  }
}

// ── State ─────────────────────────────────────────────────────────────────
let root      = null;
let frontier  = [];
let allSteps  = [];
let stepIndex = 0;
let grammar   = null;

// ── Init — call once with all parser steps ────────────────────────────────
export function initParseTree(startSymbol, steps, g) {
  grammar   = g;
  allSteps  = steps.filter(s => s.productionApplied);
  stepIndex = 0;
  root      = new TreeNode(startSymbol, false);
  frontier  = [root];
}

// ── Step — call each time user clicks Next Step ───────────────────────────
export function stepParseTree() {
  if (stepIndex >= allSteps.length) return false;

  const { left, right } = allSteps[stepIndex].productionApplied;
  stepIndex++;

  // Clear previous highlight
  traverse(root, n => n.highlight = false);

  // Find leftmost frontier node matching left
  const idx = frontier.findIndex(n => n.symbol === left && !n.isTerminal);
  if (idx === -1) return stepIndex < allSteps.length;

  const node = frontier.splice(idx, 1)[0];
  node.highlight = true;

  if (right.length === 1 && right[0] === EPSILON) {
    node.addChild(new TreeNode(EPSILON, true));
  } else {
    const newFrontier = [];
    for (const sym of right) {
      const isT  = grammar ? !grammar.nonTerminals.has(sym) : !isNonTerminalBySteps(sym);
      const child = node.addChild(new TreeNode(sym, isT));
      child.highlight = true;
      if (!isT) newFrontier.push(child);
    }
    frontier.splice(idx, 0, ...newFrontier);
  }

  return stepIndex < allSteps.length;
}

// ── Build full tree at once (for auto/accept) ─────────────────────────────
export function buildFullTree(startSymbol, steps, g) {
  initParseTree(startSymbol, steps, g);
  while (stepIndex < allSteps.length) stepParseTree();
  traverse(root, n => n.highlight = false);
  return root;
}

function isNonTerminalBySteps(sym) {
  return allSteps.some(s => s.productionApplied.left === sym);
}

// ── Layout ────────────────────────────────────────────────────────────────
const NODE_W = 48;
const NODE_H = 34;
const H_GAP  = 12;
const V_GAP  = 50;

function assignLayout(node, depth = 0) {
  if (node.children.length === 0) {
    node.width = NODE_W + H_GAP;
    node.x     = 0;
    node.y     = depth * (NODE_H + V_GAP);
    return;
  }
  let offset = 0;
  for (const child of node.children) {
    assignLayout(child, depth + 1);
    shiftSubtree(child, offset);
    offset += child.width;
  }
  node.width = offset;
  node.x     = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
  node.y     = depth * (NODE_H + V_GAP);
}

function shiftSubtree(node, dx) {
  node.x += dx;
  for (const c of node.children) shiftSubtree(c, dx);
}

// ── Render current state of tree ──────────────────────────────────────────
export function renderCurrentTree(canvas) {
  if (!root) return;

  assignLayout(root, 0);

  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  traverse(root, n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  });

  const PAD = 40;
  const W   = maxX - minX + NODE_W + PAD * 2;
  const H   = maxY + NODE_H + PAD * 2;

  canvas.width  = Math.max(W, 300);
  canvas.height = Math.max(H, 120);

  const ctx  = canvas.getContext("2d");
  const dark = document.body.classList.contains("dark");
  const offX = PAD - minX;
  const offY = PAD;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw edges
  traverse(root, node => {
    for (const child of node.children) {
      const x1 = node.x  + offX + NODE_W / 2;
      const y1 = node.y  + offY + NODE_H;
      const x2 = child.x + offX + NODE_W / 2;
      const y2 = child.y + offY;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (child.highlight) {
        ctx.strokeStyle = dark ? "#2997ff" : "#0071e3";
        ctx.lineWidth   = 2;
      } else {
        ctx.strokeStyle = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
        ctx.lineWidth   = 1.5;
      }
      ctx.stroke();
    }
  });

  // Draw nodes
  traverse(root, node => {
    const x  = node.x + offX;
    const y  = node.y + offY;
    const cx = x + NODE_W / 2;
    const cy = y + NODE_H / 2;
    const r  = 7;

    ctx.beginPath();
    ctx.roundRect(x, y, NODE_W, NODE_H, r);

    if (node.highlight) {
      // Highlighted — glowing accent
      ctx.fillStyle   = dark ? "#0a2540" : "#dbeafe";
      ctx.fill();
      ctx.strokeStyle = dark ? "#2997ff" : "#0071e3";
      ctx.lineWidth   = 2;
      ctx.stroke();
      // Glow
      ctx.shadowColor = dark ? "#2997ff" : "#0071e3";
      ctx.shadowBlur  = 10;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    } else if (node.symbol === EPSILON) {
      ctx.fillStyle   = dark ? "#1c1c1e" : "#f5f5f7";
      ctx.fill();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (node.isTerminal) {
      ctx.fillStyle   = dark ? "#001a3a" : "#eff6ff";
      ctx.fill();
      ctx.strokeStyle = dark ? "#2997ff" : "#0071e3";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle   = dark ? "#2c2c2e" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Label
    ctx.font         = `500 12px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur   = 0;

    if (node.highlight) {
      ctx.fillStyle = dark ? "#93c5fd" : "#1d4ed8";
    } else if (node.symbol === EPSILON) {
      ctx.fillStyle = dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
    } else if (node.isTerminal) {
      ctx.fillStyle = dark ? "#60a5fa" : "#0055cc";
    } else {
      ctx.fillStyle = dark ? "#f5f5f7" : "#1d1d1f";
    }

    ctx.fillText(node.symbol, cx, cy);
  });
}

// ── Legend ────────────────────────────────────────────────────────────────
export function drawLegend(canvas) {
  const ctx  = canvas.getContext("2d");
  const dark = document.body.classList.contains("dark");
  canvas.width  = 320;
  canvas.height = 36;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const items = [
    { label: "Nonterminal", fill: dark?"#2c2c2e":"#ffffff",  stroke: dark?"rgba(255,255,255,0.14)":"rgba(0,0,0,0.1)" },
    { label: "Terminal",    fill: dark?"#001a3a":"#eff6ff",  stroke: dark?"#2997ff":"#0071e3" },
    { label: "Current step",fill: dark?"#0a2540":"#dbeafe",  stroke: dark?"#2997ff":"#0071e3" },
    { label: "ε (empty)",   fill: dark?"#1c1c1e":"#f5f5f7",  stroke: dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.12)" },
  ];

  let x = 6;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textBaseline = "middle";

  for (const item of items) {
    ctx.beginPath();
    ctx.roundRect(x, 10, 14, 14, 3);
    ctx.fillStyle   = item.fill;
    ctx.fill();
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.fillStyle = dark ? "#f5f5f7" : "#1d1d1f";
    ctx.fillText(item.label, x + 18, 17);
    x += ctx.measureText(item.label).width + 28;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function traverse(node, fn) {
  fn(node);
  for (const child of node.children) traverse(child, fn);
}
