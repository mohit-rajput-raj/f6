import { create } from 'zustand';

export interface SpreadsheetDataset {
  id: string;
  name: string;
  columns: string[];
  data: any[][];
  createdAt: number;
}

interface SpreadsheetStore {
  // Datasets exported from spreadsheet as input nodes
  inputDatasets: SpreadsheetDataset[];
  addInputDataset: (dataset: SpreadsheetDataset) => void;
  removeInputDataset: (id: string) => void;

  // Output datasets to write back to spreadsheet
  outputDatasets: SpreadsheetDataset[];
  setOutputDataset: (dataset: SpreadsheetDataset) => void;
  removeOutputDataset: (id: string) => void;
  clearOutputDatasets: () => void;
}

export const useSpreadsheetStore = create<SpreadsheetStore>((set) => ({
  inputDatasets: [],
  addInputDataset: (dataset) =>
    set((state) => ({
      inputDatasets: [...state.inputDatasets, dataset],
    })),
  removeInputDataset: (id) =>
    set((state) => ({
      inputDatasets: state.inputDatasets.filter((d) => d.id !== id),
    })),

  outputDatasets: [],
  setOutputDataset: (dataset) =>
    set((state) => ({
      outputDatasets: [
        ...state.outputDatasets.filter((d) => d.id !== dataset.id),
        dataset,
      ],
    })),
  removeOutputDataset: (id) =>
    set((state) => ({
      outputDatasets: state.outputDatasets.filter((d) => d.id !== id),
    })),
  clearOutputDatasets: () => set({ outputDatasets: [] }),
}));
