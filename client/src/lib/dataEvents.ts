/**
 * App-wide "something changed" signal. Any write (call, note, date move)
 * announces it; every mounted useApi() refetches, so the dashboard drawer,
 * case page and lists all show the new "last touched" without a reload.
 */
const EVENT = "mbmt:data-changed";

export function announceDataChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onDataChanged(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
