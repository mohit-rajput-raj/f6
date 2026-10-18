"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getDataLibraryFile, updateDataLibraryFile } from "../actions";
import { normalizeDataset, serializeDataset } from "../lib/dataset-helpers";
import { toast } from "sonner";

export interface DataLibraryFileItem {
  id: string;
  name: string;
  description: string | null;
  fileType: string;
  data?: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  workflowId: string | null;
}

interface DatasetContextType {
  file: DataLibraryFileItem | null;
  columns: string[];
  rows: any[][];
  loading: boolean;
  isSaving: boolean;
  project: string;
  dashid: string;
  id: string;
  userId: string | undefined;
  activeIntegrationMode: "manual" | "automated";
  setActiveIntegrationMode: (mode: "manual" | "automated") => void;
  refreshFile: () => Promise<void>;
  saveDataset: (newColumns: string[], newRows: any[][], metaOverrides?: any) => Promise<void>;
  appendRow: (newRow: string[]) => Promise<void>;
  addColumn: (columnName: string, defaultValue?: string, columnType?: string) => Promise<void>;
  updateCell: (rowIndex: number, colIndex: number, value: string) => Promise<void>;
  deleteRow: (rowIndex: number) => Promise<void>;
  deleteColumn: (colIndex: number) => Promise<void>;
  renameColumn: (colIndex: number, newName: string) => Promise<void>;
  setColumnType: (columnName: string, type: string) => Promise<void>;
  updateMetadata: (name: string, description: string) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | null>(null);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams();
  const router = useRouter();
  const project = (params?.project as string) || "";
  const dashid = (params?.dashid as string) || "";
  const id = (params?.id as string) || "";

  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [file, setFile] = useState<DataLibraryFileItem | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeIntegrationMode, setActiveIntegrationMode] = useState<"manual" | "automated">("manual");

  const refreshFile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getDataLibraryFile(id, userId);
      if (!data) {
        toast.error("Dataset not found");
        router.push(`/${project}/dash/${dashid}/data-library`);
        return;
      }
      setFile(data as any);
      const { columns: cols, rows: rws } = normalizeDataset(data.data);
      setColumns(cols);
      setRows(rws);
    } catch (err) {
      console.error("Failed to load dataset:", err);
      toast.error("Error loading dataset");
    } finally {
      setLoading(false);
    }
  }, [id, userId, project, dashid, router]);

  useEffect(() => {
    refreshFile();
  }, [refreshFile]);

  const saveDataset = async (newColumns: string[], newRows: any[][], metaOverrides?: any) => {
    if (!file?.id || !userId) {
      toast.error("Authentication required to save");
      return;
    }
    setIsSaving(true);
    try {
      const payload = serializeDataset(newColumns, newRows);
      const updatedMetadata = {
        ...(file.metadata || {}),
        rowCount: newRows.length,
        colCount: newColumns.length,
        ...(metaOverrides || {}),
      };

      const res = await updateDataLibraryFile(file.id, userId, {
        data: payload,
        metadata: updatedMetadata,
      });

      setFile(res as any);
      setColumns(newColumns);
      setRows(newRows);
      toast.success("Dataset saved successfully!");
    } catch (err) {
      console.error("Failed to save dataset:", err);
      toast.error("Failed to save dataset updates");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const appendRow = async (newRow: string[]) => {
    const updatedRows = [...rows, newRow];
    await saveDataset(columns, updatedRows);
  };

  const addColumn = async (columnName: string, defaultValue = "", columnType?: string) => {
    const trimmed = columnName.trim();
    if (!trimmed) {
      toast.error("Column name cannot be blank");
      return;
    }
    if (columns.includes(trimmed)) {
      toast.error(`Column "${trimmed}" already exists`);
      return;
    }
    const updatedColumns = [...columns, trimmed];
    const updatedRows = rows.map((r) => [...r, defaultValue]);
    const currentTypes = file?.metadata?.columnTypes || {};
    const updatedTypes = columnType ? { ...currentTypes, [trimmed]: columnType } : currentTypes;
    await saveDataset(updatedColumns, updatedRows, { columnTypes: updatedTypes });
  };

  const updateCell = async (rowIndex: number, colIndex: number, value: string) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    if (colIndex < 0 || colIndex >= columns.length) return;

    const updatedRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const copy = [...row];
      copy[colIndex] = value;
      return copy;
    });

    await saveDataset(columns, updatedRows);
  };

  const deleteRow = async (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const updatedRows = rows.filter((_, idx) => idx !== rowIndex);
    await saveDataset(columns, updatedRows);
  };

  const deleteColumn = async (colIndex: number) => {
    if (colIndex < 0 || colIndex >= columns.length) return;
    const colName = columns[colIndex];
    const updatedColumns = columns.filter((_, idx) => idx !== colIndex);
    const updatedRows = rows.map((row) => row.filter((_, idx) => idx !== colIndex));
    const currentTypes = { ...(file?.metadata?.columnTypes || {}) };
    if (colName && currentTypes[colName] && !updatedColumns.includes(colName)) {
      delete currentTypes[colName];
    }
    await saveDataset(updatedColumns, updatedRows, { columnTypes: currentTypes });
    toast.success(`Removed column "${colName}"`);
  };

  const renameColumn = async (colIndex: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Column name cannot be blank");
      return;
    }
    const oldName = columns[colIndex];
    const updatedColumns = [...columns];
    updatedColumns[colIndex] = trimmed;
    const currentTypes = { ...(file?.metadata?.columnTypes || {}) };
    if (oldName && currentTypes[oldName]) {
      currentTypes[trimmed] = currentTypes[oldName];
      delete currentTypes[oldName];
    }
    await saveDataset(updatedColumns, rows, { columnTypes: currentTypes });
  };

  const setColumnType = async (columnName: string, type: string) => {
    if (!file?.id || !userId) return;
    const currentTypes = file?.metadata?.columnTypes || {};
    const updatedTypes = { ...currentTypes, [columnName]: type };
    await saveDataset(columns, rows, { columnTypes: updatedTypes });
    toast.success(`Set "${columnName}" format to ${type}`);
  };

  const updateMetadata = async (name: string, description: string) => {
    if (!file?.id || !userId) return;
    setIsSaving(true);
    try {
      const res = await updateDataLibraryFile(file.id, userId, {
        name: name.trim(),
        description: description.trim(),
      });
      setFile(res as any);
      toast.success("Dataset details updated!");
    } catch (err) {
      console.error("Failed to update metadata:", err);
      toast.error("Failed to update details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DatasetContext.Provider
      value={{
        file,
        columns,
        rows,
        loading,
        isSaving,
        project,
        dashid,
        id,
        userId,
        activeIntegrationMode,
        setActiveIntegrationMode,
        refreshFile,
        saveDataset,
        appendRow,
        addColumn,
        updateCell,
        deleteRow,
        deleteColumn,
        renameColumn,
        setColumnType,
        updateMetadata,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used within a DatasetProvider");
  }
  return context;
};
