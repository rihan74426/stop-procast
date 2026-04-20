import { create } from "zustand";

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeModal: null, // null | 'addTask' | 'addBlocker' | 'deleteProject' | ...
  modalPayload: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (name, payload = null) =>
    set({ activeModal: name, modalPayload: payload }),
  closeModal: () => set({ activeModal: null, modalPayload: null }),
}));
