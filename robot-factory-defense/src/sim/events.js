/**
 * Creates a clearable event queue for the tick.
 */
export function createEventQueue() {
  const events = [];
  return {
    push(event) {
      events.push(event);
    },
    flush() {
      return events.splice(0, events.length);
    },
    all() {
      return [...events];
    }
  };
}
