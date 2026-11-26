import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopModal } from '../../src/ui/workshopModal.js';
import { createInspectCard } from '../../src/ui/inspectCard.js';
import { createUI } from '../../src/ui/index.js';
import { createRenderer } from '../../src/render/index.js';
import { escapeHtml } from '../../src/ui/utils.js';

function createFakeDom() {
  const docListeners = new Map();

  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.id = '';
      this.className = '';
      this.children = [];
      this.parentElement = null;
      this.attributes = new Map();
      this.style = {};
      this.listeners = new Map();
      this.disabled = false;
      this.inert = false;
      this._textContent = '';
      this._innerHTML = '';
      this.focused = false;
    }

    get textContent() {
      if (this.children.length > 0) {
        return this.children.map(c => c.textContent).join('');
      }
      return this._textContent;
    }

    set textContent(v) {
      this.children = [];
      this._textContent = String(v);
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(v) {
      this._innerHTML = String(v);
      this.children = [];
      // Parse simple elements with id attributes so querySelector('#id') works
      const idMatches = this._innerHTML.matchAll(/<([a-zA-Z0-9]+)[^>]*\sid=["']([^"']+)["'][^>]*>/g);
      for (const m of idMatches) {
        const child = new FakeElement(m[1]);
        child.id = m[2];
        child.parentElement = this;
        this.children.push(child);
      }
    }

    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }

    setAttribute(k, v) {
      const val = String(v);
      this.attributes.set(k, val);
      if (k === 'id') this.id = val;
    }

    getAttribute(k) {
      if (k === 'id') return this.id || null;
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }

    removeAttribute(k) {
      this.attributes.delete(k);
    }

    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }

    dispatchEvent(evt) {
      const list = this.listeners.get(evt.type) || [];
      for (const fn of list) fn(evt);
    }

    click() {
      this.dispatchEvent({ type: 'click', stopPropagation: () => {}, target: this });
    }

    focus() {
      doc.activeElement = this;
      this.focused = true;
    }

    contains(node) {
      if (node === this) return true;
      return this.children.some(c => c.contains(node));
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
      const results = [];
      const selectors = selector.split(',').map(s => s.trim());
      const visit = (node) => {
        for (const child of node.children) {
          for (const sel of selectors) {
            if (sel.startsWith('#') && child.id === sel.slice(1)) {
              results.push(child);
              break;
            }
            if (sel.startsWith('button:not(:disabled)') && child.tagName === 'BUTTON' && !child.disabled) {
              results.push(child);
              break;
            }
          }
          visit(child);
        }
      };
      visit(this);
      return results;
    }
  }

  const doc = {
    activeElement: null,
    createElement: (tag) => new FakeElement(tag),
    contains: (node) => Boolean(node),
    addEventListener: (type, fn) => {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      const list = docListeners.get(type);
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    },
    dispatchKeyDown: (opts) => {
      let prevented = false;
      const evt = {
        type: 'keydown',
        key: opts.key,
        shiftKey: !!opts.shiftKey,
        preventDefault: () => { prevented = true; },
        stopPropagation: () => {}
      };
      for (const fn of (docListeners.get('keydown') || [])) fn(evt);
      return prevented;
    }
  };

  return { doc, FakeElement };
}

function withFakeDom(fn) {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const { doc, FakeElement } = createFakeDom();
  globalThis.document = doc;
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) };
  try {
    return fn(doc, FakeElement);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }
}

describe('UI Fixes Verification', () => {
  it('workshopModal provides dialog ARIA, Escape close, focus trap, and focus restoration', () => {
    withFakeDom((doc, FakeElement) => {
      const opener = new FakeElement('button');
      opener.id = 'btnWorkshop';
      opener.focus();

      let closedCount = 0;
      const modal = createWorkshopModal({
        onClose: () => {
          closedCount++;
          modal.hide();
        }
      });

      assert.equal(modal.element.getAttribute('role'), 'dialog');
      assert.equal(modal.element.getAttribute('aria-modal'), 'true');
      assert.equal(modal.element.getAttribute('aria-labelledby'), 'workshopModalTitle');

      modal.show();
      assert.equal(modal.isOpen(), true);
      const btnClose = modal.element.querySelector('#btnCloseWorkshop');
      assert.equal(doc.activeElement, btnClose, 'Opening modal focuses close button');

      // Focus trap wraps backward from first element on Shift+Tab
      const preventedBack = doc.dispatchKeyDown({ key: 'Tab', shiftKey: true });
      assert.equal(preventedBack, true);
      assert.notEqual(doc.activeElement, btnClose, 'Shift+Tab on first focusable moves to last');

      // Focus trap wraps forward from last element on Tab
      const preventedFwd = doc.dispatchKeyDown({ key: 'Tab', shiftKey: false });
      assert.equal(preventedFwd, true);
      assert.equal(doc.activeElement, btnClose, 'Tab on last focusable wraps to first');

      // Escape closes modal and restores focus to opener
      const preventedEsc = doc.dispatchKeyDown({ key: 'Escape' });
      assert.equal(preventedEsc, true);
      assert.equal(closedCount, 1);
      assert.equal(modal.isOpen(), false);
      assert.equal(doc.activeElement, opener, 'Closing modal restores previous focus');
    });
  });

  it('inspectCard displays dynamic Workshop percentages from state.config.upgrades', () => {
    withFakeDom(() => {
      const card = createInspectCard();
      const customUpgrades = {
        workshop: {
          globalUpgrades: [
            { id: 'overclock', effect: { fireRateMultiplier: 1.25 } },
            { id: 'hardened_rounds', effect: { damageMultiplier: 1.3 } },
            { id: 'long_barrels', effect: { rangeMultiplier: 1.2 } },
            { id: 'fast_assembly', effect: { costDiscountRatio: 0.2 } }
          ]
        }
      };

      const tower = { id: 't1', type: 'pulse', col: 1, row: 1, level: 1, investedScrap: 60 };

      // Default upgrades.json uses 1.1 (+10%) for overclock/hardened_rounds/long_barrels
      card.update({
        scrap: 200,
        purchasedUpgrades: ['overclock', 'hardened_rounds', 'long_barrels']
      }, tower);
      const statsDefault = card.element.querySelector('#inspectStats').innerHTML;
      assert.ok(statsDefault.includes('(+10%)'), 'Default upgrades config yields +10%');
      assert.ok(!statsDefault.includes('(+15%)'), 'Must not hardcode +15%');

      // Custom state.config.upgrades dynamically updates displayed percentages
      card.update({
        scrap: 200,
        purchasedUpgrades: ['overclock', 'hardened_rounds', 'long_barrels'],
        upgradesConfig: customUpgrades
      }, tower);
      const statsCustom = card.element.querySelector('#inspectStats').innerHTML;
      assert.ok(statsCustom.includes('(+25%)'), 'Displays dynamic overclock +25%');
      assert.ok(statsCustom.includes('(+30%)'), 'Displays dynamic hardened_rounds +30%');
      assert.ok(statsCustom.includes('(+20%)'), 'Displays dynamic long_barrels +20%');
    });
  });

  it('ui auto-closes workshopModal on win/loss and toggles inert on background elements', () => {
    withFakeDom((doc, FakeElement) => {
      const root = new FakeElement('div');
      const ui = createUI(root);

      const hud = root.querySelector('#hudBar');
      const titleScreen = root.querySelector('#titleScreen');
      const workshopModal = root.querySelector('#workshopModal');

      // Initially titleScreen is open -> background HUD is inert
      assert.equal(hud.inert, true);
      assert.equal(titleScreen.getAttribute('role'), 'dialog');

      // Click Play -> background HUD becomes active
      const btnPlay = titleScreen.querySelector('#btnPlay');
      btnPlay.click();
      assert.equal(hud.inert, false);

      // Open workshop -> background HUD becomes inert again
      const btnWorkshop = hud.querySelector('#btnWorkshop');
      btnWorkshop.click();
      assert.equal(workshopModal.style.display, 'flex');
      assert.equal(hud.inert, true);

      // Loss state auto-closes workshop modal and keeps endScreen modal active
      ui.renderHUD({
        coreHp: 0,
        maxCoreHp: 20,
        scrap: 100,
        circuits: 0,
        wave: 3,
        totalWaves: 15,
        waveState: 'lost',
        speed: 1,
        paused: false,
        towers: [],
        enemies: [],
        projectiles: [],
        unlockedTowers: ['pulse', 'coolant', 'fabricator'],
        purchasedUpgrades: [],
        fabricatorCount: 0,
        stats: { enemiesKilled: 5, scrapEarned: 100 }
      });

      assert.equal(workshopModal.style.display, 'none', 'Workshop must auto-close on loss');
      assert.equal(hud.inert, true, 'Background HUD must be inert when endScreen shows');
    });
  });

  it('renderer resize scales buffer by DPR while keeping screenToCell accurate', () => {
    withFakeDom(() => {
      const fakeCanvas = {
        width: 960,
        height: 540,
        getContext: () => ({}),
        getBoundingClientRect: () => ({ left: 100, top: 50, width: 640, height: 360 })
      };

      const renderer = createRenderer(fakeCanvas);
      renderer.resize(640, 360, 2);
      assert.equal(fakeCanvas.width, 1280);
      assert.equal(fakeCanvas.height, 720);

      // Cell (1, 1) center in CSS pixels: left + 1.5*(640/16) = 160, top + 1.5*(360/9) = 110
      const cell = renderer.screenToCell(160, 110);
      assert.deepEqual(cell, { col: 1, row: 1 });

      // Outside canvas returns null
      assert.equal(renderer.screenToCell(50, 110), null);
    });
  });

  it('escapeHtml escapes special HTML characters safely', () => {
    assert.equal(
      escapeHtml('<script>alert("xss" & \'1\')</script>'),
      '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;1&#39;)&lt;/script&gt;'
    );
  });
});
