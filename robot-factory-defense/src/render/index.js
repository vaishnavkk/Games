/**
 * Canvas2D Procedural Renderer for Robot Factory Defense
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function render(_state) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Factory background
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
  }

  return {
    render,
    resize,
    getContext: () => ctx
  };
}
