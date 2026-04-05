import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DataLibraryDataset {
  columns: string[];
  data: any[][];
}

export interface DataLibraryFile {
  id: string;
  name: string;
  description?: string;
  fileType: string; // "csv", "xlsx", "json", "calculated"
  data?: DataLibraryDataset;
  metadata?: {
    rowCount?: number;
    colCount?: number;
    fileSize?: number;
    sourceWorkflowId?: string;
    sourceNodeId?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface DataLibraryStore {
  files: DataLibraryFile[];

  addFile: (file: DataLibraryFile) => void;
  updateFile: (id: string, updates: Partial<DataLibraryFile>) => void;
  removeFile: (id: string) => void;
  getFile: (id: string) => DataLibraryFile | undefined;

  // Import file data as a workflow node dataset
  getFileData: (id: string) => DataLibraryDataset | null;
}

export const useDataLibraryStore = create<DataLibraryStore>()(
  persist(
    (set, get) => ({
      files: [],

      addFile: (file) =>
        set((state) => ({
          files: [...state.files.filter((f) => f.id !== file.id), file],
        })),

      updateFile: (id, updates) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
          ),
        })),

      removeFile: (id) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
        })),

      getFile: (id) => get().files.find((f) => f.id === id),

      getFileData: (id) => {
        const file = get().files.find((f) => f.id === id);
        return file?.data ?? null;
      },
    }),
    {
      name: 'data-library-storage',
      // Only persist metadata and small datasets, not huge files
      partialize: (state) => ({
        files: state.files.map((f) => ({
          ...f,
          // Limit persisted data size — only keep first 10000 rows
          data: f.data
            ? {
                columns: f.data.columns,
                data: f.data.data.slice(0, 10000),
              }
            : undefined,
        })),
      }),
    }
  )
);
