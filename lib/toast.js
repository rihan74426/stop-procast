import { create } from "zustand";

let _id = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],

  show(message, { type = "info", duration = 4000, action } = {}) {
    const id = ++_id;
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, action }],
    }));
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  dismissAll() {
    set({ toasts: [] });
  },
}));

// Convenience helpers — call these anywhere (client-side)
export const toast = {
  info: (msg, opts) =>
    useToastStore.getState().show(msg, { type: "info", ...opts }),
  success: (msg, opts) =>
    useToastStore.getState().show(msg, { type: "success", ...opts }),
  error: (msg, opts) =>
    useToastStore
      .getState()
      .show(msg, { type: "error", duration: 6000, ...opts }),
  warn: (msg, opts) =>
    useToastStore.getState().show(msg, { type: "warn", ...opts }),
  loading: (msg, opts) =>
    useToastStore
      .getState()
      .show(msg, { type: "loading", duration: 0, ...opts }),
  dismiss: (id) => useToastStore.getState().dismiss(id),
  dismissAll: () => useToastStore.getState().dismissAll(),
};
