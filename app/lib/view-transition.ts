import { flushSync } from "react-dom";

/** Run an update inside a View Transition when the browser supports it. */
export function startViewTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      finished: Promise<void>;
    };
  };
  if (typeof doc.startViewTransition !== "function") {
    update();
    return undefined;
  }
  return doc.startViewTransition(() => {
    flushSync(update);
  });
}
