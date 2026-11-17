import '@fontsource/fredoka';
import '@fontsource/patrick-hand';
import './style.css';
import { initSprite, renderEmoji } from './sprite.js';

// Inject inlined SVG sprite into DOM
initSprite();

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <main class="meadow-card">
      <h1 class="meadow-title">Hello Meadow</h1>
      <p class="meadow-subtitle">A tricky puzzle adventure for clever minds!</p>
      <div class="meadow-badge">
        ${renderEmoji('rabbit', 48)}
        <span>Welcome to the Meadow</span>
        ${renderEmoji('sparkles', 36)}
      </div>
    </main>
  `;
}
