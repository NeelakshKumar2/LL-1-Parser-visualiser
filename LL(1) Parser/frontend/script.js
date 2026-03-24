import {
  parseGrammar,
  eliminateLeftRecursion,
  leftFactorGrammar,
  EPSILON
} from "../core_logic/grammarUtilis.js";

import {
  computeFirstSets,
  computeFollowSets
} from "../core_logic/firstFollow.js";

import { buildParsingTable }  from "../core_logic/parsingTable.js";
import { summarizeConflicts } from "../core_logic/conflicts.js";
import { predictiveParse }    from "../core_logic/parser.js";

let processedGrammar = null;
let firstSets        = null;
let followSets       = null;
let parsingTable     = null;
let conflicts        = [];
let currentSteps     = [];
let currentStepIdx   = 0;
let autoInterval     = null;

const grammarInputEl     = document.getElementById("grammar-input");
const grammarProcessedEl = document.getElementById("grammar-processed");
const firstOutputEl      = document.getElementById("first-output");
const followOutputEl     = document.getElementById("follow-output");
const ffColumns          = document.getElementById("ff-columns");
const conflictOutputEl   = document.getElementById("conflict-output");
const conflictBox        = document.getElementById("conflict-box");
const tableContainerEl   = document.getElementById("table-container");
const traceTableBody     = document.querySelector("#trace-table tbody");
const errorOutputEl      = document.getElementById("error-output");
const inputStringEl      = document.getElementById("input-string");
const simColumns         = document.getElementById("sim-columns");
const btnStep            = document.getElementById("btn-step");
const btnAuto            = document.getElementById("btn-auto");
const btnReset           = document.getElementById("btn-reset");

document.getElementById("toggle-dark").addEventListener("change", e => {
  document.body.classList.toggle("dark", e.target.checked);
});

document.getElementById("btn-load-sample").addEventListener("click", () => {
  grammarInputEl.value =
    `E -> T E'\nE' -> + T E' | ${EPSILON}\nT -> F T'\nT' -> * F T' | ${EPSILON}\nF -> ( E ) | id`;
});


document.getElementById("btn-process-grammar").addEventListener("click", processGrammar);

function processGrammar() {
  try {
    const raw = parseGrammar(grammarInputEl.value);
    let g = eliminateLeftRecursion(raw);
    g = leftFactorGrammar(g);
    processedGrammar = g;

    const lines = [];
    for (const [A, rhsList] of Object.entries(g.productions))
      lines.push(`${A} -> ${rhsList.map(r => r.join(" ")).join(" | ")}`);

    grammarProcessedEl.textContent =
      "Processed grammar (left recursion removed + left factored):\n\n" +
      lines.join("\n");
    grammarProcessedEl.classList.remove("hidden");

   
    firstSets = followSets = parsingTable = null;
    conflicts = [];
    tableContainerEl.innerHTML = "";
    conflictBox.classList.add("hidden");
    ffColumns.style.display = "none";
  } catch (e) {
    grammarProcessedEl.textContent = "Error: " + e.message;
    grammarProcessedEl.classList.remove("hidden");
  }
}

document.getElementById("btn-compute-first-follow").addEventListener("click", () => {
  if (!processedGrammar) processGrammar();
  if (!processedGrammar) return;

  firstSets  = computeFirstSets(processedGrammar);
  followSets = computeFollowSets(processedGrammar, firstSets);

  const firstLines = [], followLines = [];
  for (const A of processedGrammar.nonTerminals) {
    firstLines.push(`FIRST(${A})  = { ${[...firstSets[A]].join(", ")} }`);
    followLines.push(`FOLLOW(${A}) = { ${[...followSets[A]].join(", ")} }`);
  }

  firstOutputEl.textContent  = firstLines.join("\n");
  followOutputEl.textContent = followLines.join("\n");
  ffColumns.style.display    = "";
});

document.getElementById("btn-build-table").addEventListener("click", buildTable);

function buildTable() {
  if (!processedGrammar) processGrammar();
  if (!firstSets) {
    firstSets  = computeFirstSets(processedGrammar);
    followSets = computeFollowSets(processedGrammar, firstSets);
  }

  const result = buildParsingTable(processedGrammar, firstSets, followSets);
  parsingTable = result.table;
  conflicts    = result.conflicts;

  renderParsingTable();

  conflictOutputEl.textContent = summarizeConflicts(conflicts);
  conflictBox.classList.toggle("hidden", conflicts.length === 0);
}

function renderParsingTable() {
  if (!parsingTable) return;

  const nonTerminals = Object.keys(parsingTable);
  const termSet = new Set();
  for (const A of nonTerminals)
    for (const a of Object.keys(parsingTable[A])) termSet.add(a);

  const terms = [...termSet].filter(t => t !== "$");
  if (termSet.has("$")) terms.push("$");

  const table  = document.createElement("table");
  const thead  = table.createTHead();
  const hRow   = thead.insertRow();
  const th0    = document.createElement("th");
  th0.textContent = "NT \\ Terminal";
  hRow.appendChild(th0);
  for (const t of terms) {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const A of nonTerminals) {
    const row    = tbody.insertRow();
    const ntCell = document.createElement("th");
    ntCell.textContent = A;
    row.appendChild(ntCell);

    for (const t of terms) {
      const td   = row.insertCell();
      const cell = parsingTable[A][t];

      if (!cell) {
        td.textContent = "—";
        td.className   = "cell-empty";
      } else if (cell.synch && !cell.production) {
        td.textContent = "synch";
        td.className   = "cell-synch";
      } else if (cell.production) {
        td.textContent = `${A} -> ${cell.production.join(" ")}`;
        td.className   = cell.conflict ? "cell-conflict" : "cell-prod";
      }
    }
  }

  tableContainerEl.innerHTML = "";
  tableContainerEl.appendChild(table);
}

document.getElementById("btn-start-parse").addEventListener("click", startParsing);
btnStep.addEventListener("click", renderNextStep);
btnAuto.addEventListener("click",  autoRun);
btnReset.addEventListener("click", resetSimulation);

function startParsing() {
  resetSimulation();

  if (!processedGrammar || !parsingTable) buildTable();
  if (!processedGrammar || !parsingTable) return;

  const tokens = inputStringEl.value.trim().split(/\s+/).filter(Boolean);
  const { steps, errors, accepted } = predictiveParse(
    processedGrammar, parsingTable, tokens
  );

  currentSteps   = steps;
  currentStepIdx = 0;

  errorOutputEl.textContent =
    (accepted ? "✓ Input accepted.\n" : "✗ Input rejected.\n") +
    (errors.length
      ? "\nError / recovery log:\n" + errors.join("\n")
      : "\nNo syntax errors detected.");

  simColumns.style.display = "";
  btnStep.disabled  = false;
  btnAuto.disabled  = false;
  btnReset.disabled = false;

  renderNextStep();
}

function renderNextStep() {
  if (currentStepIdx >= currentSteps.length) return;
  const step = currentSteps[currentStepIdx];
  const tr   = traceTableBody.insertRow();

  if (step.error)                           tr.className = "row-error";
  else if (step.action.startsWith("Accept"))tr.className = "row-accept";
  else if (step.productionApplied)          tr.className = "row-prod";

  tr.insertCell().textContent = currentStepIdx;
  tr.insertCell().textContent = [...step.stack].reverse().join(" ");
  tr.insertCell().textContent = step.input.join(" ");
  tr.insertCell().textContent = step.action;

  const scroll = traceTableBody.closest(".table-scroll");
  if (scroll) scroll.scrollTop = scroll.scrollHeight;

  currentStepIdx++;
}

function autoRun() {
  if (autoInterval) return;
  autoInterval = setInterval(() => {
    if (currentStepIdx >= currentSteps.length) {
      clearInterval(autoInterval);
      autoInterval = null;
    } else {
      renderNextStep();
    }
  }, 500);
}

function resetSimulation() {
  clearInterval(autoInterval);
  autoInterval   = null;
  currentSteps   = [];
  currentStepIdx = 0;
  traceTableBody.innerHTML  = "";
  errorOutputEl.textContent = "";
  simColumns.style.display  = "none";
  btnStep.disabled  = true;
  btnAuto.disabled  = true;
  btnReset.disabled = true;
}


processGrammar();