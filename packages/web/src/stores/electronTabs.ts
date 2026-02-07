import { create } from 'zustand';
import type { Graph } from '@xovis/core';

export type ElectronTab = {
  id: string;
  label: string;
  graph: Graph | null;
};

type ElectronTabsState = {
  tabs: ElectronTab[];
  activeId: string | null;
  addTab: (tab?: Partial<Pick<ElectronTab, 'id' | 'label'>>) => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  setTabGraph: (id: string, graph: Graph | null) => void;
  setTabLabel: (id: string, label: string) => void;
  getTab: (id: string) => ElectronTab | undefined;
};

let tabSeq = 0;

export const useElectronTabsStore = create<ElectronTabsState>((set, get) => ({
  tabs: [{ id: '1', label: 'untitled', graph: null }],
  activeId: '1',

  addTab: (tab) => {
    const id = tab?.id ?? `tab-${++tabSeq}`;
    const label = tab?.label ?? 'untitled';
    set((s) => {
      const next = [...s.tabs, { id, label, graph: null }];
      return { tabs: next, activeId: id };
    });
    return id;
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return s;
      let next = s.tabs.filter((t) => t.id !== id);
      if (next.length === 0) next = [{ id: `tab-${++tabSeq}`, label: 'untitled', graph: null }];
      const nextActive =
        s.activeId === id ? (next[Math.max(0, idx - 1)]?.id ?? next[0].id) : s.activeId;
      return { tabs: next, activeId: nextActive };
    });
  },

  setActive: (id) => {
    set({ activeId: id });
  },

  setTabGraph: (id, graph) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, graph } : t)),
    }));
  },

  setTabLabel: (id, label) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, label } : t)),
    }));
  },

  getTab: (id) => get().tabs.find((t) => t.id === id),
}));
