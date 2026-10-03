// The core is DOM-free; these are the only host globals it touches.
declare const console: { warn(...args: unknown[]): void };
declare function queueMicrotask(callback: () => void): void;
