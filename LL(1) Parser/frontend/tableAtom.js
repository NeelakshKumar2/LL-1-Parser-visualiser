/**
 * tableAtom.js
 * Iron Man HUD-style parse table visualization.
 * Draggable, pinch-zoomable, scroll-zoomable.
 * Only renders when grammar is valid LL(1) (zero conflicts).
 *
 * Usage:
 *   import { initTableAtom, destroyTableAtom } from "./tableAtom.js";
 *   initTableAtom(table, grammar, conflicts);  // call after buildParsingTable
 */

export function initTableAtom(table, grammar, conflicts) {
  const container = document.getElementById("atom-container");
  if (!container) return;

  // Only exist if grammar is valid LL(1)
  if (conflicts.length > 0) {
    container.innerHTML = `
      <div class="atom-rejected">
        <div class="atom-rejected-icon"></div>
        <div class="atom-rejected-title">TABLE ATOM LOCKED</div>
        <div class="atom-rejected-msg">${conflicts.length} conflict(s) detected — grammar is not LL(1).<br>Resolve all conflicts to unlock the atom.</div>
      </div>`;
    container.classList.add("locked");
    container.classList.remove("active");
    return;
  }

  container.classList.remove("locked");
  container.classList.add("active");

  const nonTerminals = [...grammar.nonTerminals];
  const termSet = new Set();
  for (const A of nonTerminals)
    for (const a of Object.keys(table[A])) termSet.add(a);
  const terminals = [...termSet].filter(t => t !== "$");
  terminals.push("$");

  // Build table HTML
  let html = `
    <div class="atom-hud">
      <div class="hud-scanline"></div>
      <div class="hud-corner tl"></div>
      <div class="hud-corner tr"></div>
      <div class="hud-corner bl"></div>
      <div class="hud-corner br"></div>
      <div class="hud-header">
        <div class="hud-title">
          <span class="hud-dot"></span>
          LL(1) PARSE TABLE
          <span class="hud-sub">// ${nonTerminals.length} NON-TERMINALS · ${terminals.length} TERMINALS</span>
        </div>
        <div class="hud-status">
          <span class="hud-badge ok">VALID LL(1)</span>
          <span class="hud-hint">DRAG · SCROLL TO ZOOM</span>
        </div>
      </div>
      <div class="hud-body">
        <table class="hud-table">
          <thead>
            <tr>
              <th class="hud-nt-header">NT</th>
              ${terminals.map(t => `<th class="hud-term-header">${t}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${nonTerminals.map(A => `
              <tr>
                <th class="hud-nt">${A}</th>
                ${terminals.map(t => {
                  const cell = table[A][t];
                  if (!cell) return `<td class="hud-empty">—</td>`;
                  if (cell.synch && !cell.production)
                    return `<td class="hud-synch">synch</td>`;
                  return `<td class="hud-prod">
                    <span class="hud-lhs">${A}</span>
                    <span class="hud-arrow">→</span>
                    <span class="hud-rhs">${cell.production.join(" ")}</span>
                  </td>`;
                }).join("")}
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="hud-footer">
        <span class="hud-footer-text">GRAMMAR PROCESSED · NO CONFLICTS DETECTED · SYSTEM READY</span>
      </div>
    </div>`;

  container.innerHTML = html;

  // Drag + zoom
  const atom = container.querySelector(".atom-hud");
  let tx = 0, ty = 0, scale = 1;
  let dragging = false, lastX = 0, lastY = 0;
  let lastDist = null;

  function applyTransform() {
    atom.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  }

  // Mouse drag
  atom.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    atom.style.cursor = "grabbing";
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    atom.style.cursor = "grab";
  });

  // Scroll zoom
  container.addEventListener("wheel", e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    scale = Math.min(2.5, Math.max(0.3, scale + delta));
    applyTransform();
  }, { passive: false });

  // Touch drag + pinch zoom
  container.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
    if (e.touches.length === 2) {
      dragging = false;
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
    e.preventDefault();
  }, { passive: false });

  container.addEventListener("touchmove", e => {
    if (e.touches.length === 1 && dragging) {
      tx += e.touches[0].clientX - lastX;
      ty += e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      applyTransform();
    }
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastDist) {
        const delta = (dist - lastDist) * 0.01;
        scale = Math.min(2.5, Math.max(0.3, scale + delta));
        applyTransform();
      }
      lastDist = dist;
    }
    e.preventDefault();
  }, { passive: false });

  container.addEventListener("touchend", () => {
    dragging = false;
    lastDist = null;
  });

  // Double click to reset
  atom.addEventListener("dblclick", () => {
    tx = 0; ty = 0; scale = 1;
    atom.style.transition = "transform 0.3s ease";
    applyTransform();
    setTimeout(() => atom.style.transition = "", 300);
  });
}

export function destroyTableAtom() {
  const container = document.getElementById("atom-container");
  if (container) {
    container.innerHTML = "";
    container.classList.remove("active", "locked");
  }
}
