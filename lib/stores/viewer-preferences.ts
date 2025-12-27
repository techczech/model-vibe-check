/**
 * Viewer Preferences Store
 * 
 * Persists user preferences for the ResponseViewer component.
 * Uses localStorage for persistence across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ViewerLayoutMode, 
  ViewerHeightMode, 
  ColumnPreset,
  ViewerMetadataToggles,
  ViewerContentSettings,
  ViewerPreferences 
} from '../types';

// Default metadata toggles - all visible by default except temperature
const defaultMetadataToggles: ViewerMetadataToggles = {
  // Prompt section
  showPrompt: true,
  showExpectedAnswer: true,
  showPromptTokens: true,
  
  // Response header
  showModelName: true,
  showProvider: true,
  showSizeClass: true,
  showReasoning: true,
  showContextWindow: true,
  
  // Response footer
  showResponseTokens: true,
  showLatency: true,
  showIteration: true,
  showRunDate: true,
  showCost: true,
  showScore: true,
  showTemperature: false, // Optional, off by default
};

// Default content settings
const defaultContentSettings: ViewerContentSettings = {
  renderMarkdown: true,
  syntaxHighlight: true,
  wordWrap: true,
  syncScroll: true,
};

// Default preferences
const defaultPreferences: ViewerPreferences = {
  layout: '2-col',
  height: 'full',
  columnPreset: 'equal',
  metadata: defaultMetadataToggles,
  content: defaultContentSettings,
};

interface ViewerPreferencesState extends ViewerPreferences {
  // Actions
  setLayout: (layout: ViewerLayoutMode) => void;
  setHeight: (height: ViewerHeightMode) => void;
  setColumnPreset: (preset: ColumnPreset) => void;
  setCustomColumnWidths: (widths: number[]) => void;
  toggleMetadata: (key: keyof ViewerMetadataToggles) => void;
  setMetadata: (metadata: Partial<ViewerMetadataToggles>) => void;
  toggleContent: (key: keyof ViewerContentSettings) => void;
  setContent: (content: Partial<ViewerContentSettings>) => void;
  resetToDefaults: () => void;
  
  // Computed helpers
  getEffectiveColumnCount: () => number;
}

export const useViewerPreferences = create<ViewerPreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      
      setLayout: (layout) => set({ layout }),
      
      setHeight: (height) => set({ height }),
      
      setColumnPreset: (preset) => set({ columnPreset: preset }),
      
      setCustomColumnWidths: (widths) => set({ 
        columnPreset: 'custom', 
        customColumnWidths: widths 
      }),
      
      toggleMetadata: (key) => set((state) => ({
        metadata: {
          ...state.metadata,
          [key]: !state.metadata[key],
        },
      })),
      
      setMetadata: (metadata) => set((state) => ({
        metadata: {
          ...state.metadata,
          ...metadata,
        },
      })),
      
      toggleContent: (key) => set((state) => ({
        content: {
          ...state.content,
          [key]: !state.content[key],
        },
      })),
      
      setContent: (content) => set((state) => ({
        content: {
          ...state.content,
          ...content,
        },
      })),
      
      resetToDefaults: () => set(defaultPreferences),
      
      getEffectiveColumnCount: () => {
        const layout = get().layout;
        switch (layout) {
          case 'single': return 1;
          case '2-col': return 2;
          case '3-col': return 3;
          case 'n-col': return 0; // Dynamic based on content
          case 'stacked': return 1;
          default: return 2;
        }
      },
    }),
    {
      name: 'viewer-preferences',
      version: 1,
    }
  )
);

/**
 * Get column widths based on preset and count
 */
export function getColumnWidths(preset: ColumnPreset, count: number, customWidths?: number[]): number[] {
  if (preset === 'custom' && customWidths && customWidths.length === count) {
    return customWidths;
  }
  
  if (count === 2) {
    switch (preset) {
      case '1/3-2/3': return [33.33, 66.67];
      case '2/3-1/3': return [66.67, 33.33];
      case '1/4-3/4': return [25, 75];
      case '3/4-1/4': return [75, 25];
      default: return [50, 50];
    }
  }
  
  // Equal distribution for other counts
  const width = 100 / count;
  return Array(count).fill(width);
}

/**
 * Calculate minimum column width (equivalent to 3-col layout)
 * Returns percentage
 */
export function getMinColumnWidth(): number {
  return 33.33; // 1/3 of viewport
}
