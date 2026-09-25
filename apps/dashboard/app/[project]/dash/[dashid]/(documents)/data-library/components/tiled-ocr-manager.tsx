"use client";

import React, { useState, useRef } from "react";
import {
  TileItem,
  TiledGridConfig,
  TILE_PALETTE,
  OverlapStrategy,
} from "./tiled-ocr-types";
import { TiledGridVisualizer } from "./tiled-grid-visualizer";
import { stitchTiledOcr } from "../lib/tiled-ocr-stitcher";
import { scanTableImageAction } from "../ocr-actions";
import {
  Upload,
  Plus,
  Trash2,
  ScanText,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Layers,
  Wand2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";

interface TiledOcrManagerProps {
  userId?: string;
  onStitchComplete: (result: {
    columns: string[];
    data: (string | null)[][];
    datasetNameSuggestion: string;
  }) => void;
}

export const TiledOcrManager: React.FC<TiledOcrManagerProps> = ({
  userId,
  onStitchComplete,
}) => {
  // Grid config
  const [config, setConfig] = useState<TiledGridConfig>({
    totalRows: 9,
    totalCols: 9,
    autoFitToExtracted: true,
    overlapStrategy: "prefer_longest",
    trimDuplicateHeaders: true,
    stitchMode: "sequential_rows",
    keyColumnName: "Roll No.",
    directives: {
      customPrompt: "",
      dotToA: true,
      leaveUnclearBlank: true,
      handleCrossOuts: true,
      parseMultiTierDates: true,
      includeBottomNotes: true,
    },
  });

  const [showDirectives, setShowDirectives] = useState(true);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Initial tiles set up for a 3x3 (9 tiles) grid by default as requested by user
  const [tiles, setTiles] = useState<TileItem[]>([
    {
      id: "tile-1",
      label: "Tile 1 (Top-Left)",
      imageBase64: "",
      fileName: "",
      colRange: [0, 2],
      rowRange: [0, 2],
      hasHeader: true,
      status: "idle",
      color: "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
    },
    {
      id: "tile-2",
      label: "Tile 2 (Top-Center)",
      imageBase64: "",
      fileName: "",
      colRange: [3, 5],
      rowRange: [0, 2],
      hasHeader: true,
      status: "idle",
      color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    },
    {
      id: "tile-3",
      label: "Tile 3 (Top-Right)",
      imageBase64: "",
      fileName: "",
      colRange: [6, 8],
      rowRange: [0, 2],
      hasHeader: true,
      status: "idle",
      color: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300",
    },
    {
      id: "tile-4",
      label: "Tile 4 (Mid-Left)",
      imageBase64: "",
      fileName: "",
      colRange: [0, 2],
      rowRange: [3, 5],
      hasHeader: false,
      status: "idle",
      color: "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300",
    },
    {
      id: "tile-5",
      label: "Tile 5 (Center)",
      imageBase64: "",
      fileName: "",
      colRange: [3, 5],
      rowRange: [3, 5],
      hasHeader: false,
      status: "idle",
      color: "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300",
    },
    {
      id: "tile-6",
      label: "Tile 6 (Mid-Right)",
      imageBase64: "",
      fileName: "",
      colRange: [6, 8],
      rowRange: [3, 5],
      hasHeader: false,
      status: "idle",
      color: "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300",
    },
    {
      id: "tile-7",
      label: "Tile 7 (Bottom-Left)",
      imageBase64: "",
      fileName: "",
      colRange: [0, 2],
      rowRange: [6, 8],
      hasHeader: false,
      status: "idle",
      color: "bg-cyan-500/10 border-cyan-500/40 text-cyan-700 dark:text-cyan-300",
    },
    {
      id: "tile-8",
      label: "Tile 8 (Bottom-Center)",
      imageBase64: "",
      fileName: "",
      colRange: [3, 5],
      rowRange: [6, 8],
      hasHeader: false,
      status: "idle",
      color: "bg-orange-500/10 border-orange-500/40 text-orange-700 dark:text-orange-300",
    },
    {
      id: "tile-9",
      label: "Tile 9 (Bottom-Right)",
      imageBase64: "",
      fileName: "",
      colRange: [6, 8],
      rowRange: [6, 8],
      hasHeader: false,
      status: "idle",
      color: "bg-teal-500/10 border-teal-500/40 text-teal-700 dark:text-teal-300",
    },
  ]);

  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Apply Presets
  const applyPreset = (presetType: "3x3" | "2x2" | "vertical_3" | "horizontal_2") => {
    if (presetType === "3x3") {
      setConfig((prev) => ({ ...prev, totalRows: 9, totalCols: 9 }));
      setTiles([
        { id: "tile-1", label: "Tile 1 (Top-Left)", imageBase64: "", fileName: "", colRange: [0, 2], rowRange: [0, 2], hasHeader: true, status: "idle", color: "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300" },
        { id: "tile-2", label: "Tile 2 (Top-Center)", imageBase64: "", fileName: "", colRange: [3, 5], rowRange: [0, 2], hasHeader: true, status: "idle", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
        { id: "tile-3", label: "Tile 3 (Top-Right)", imageBase64: "", fileName: "", colRange: [6, 8], rowRange: [0, 2], hasHeader: true, status: "idle", color: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" },
        { id: "tile-4", label: "Tile 4 (Mid-Left)", imageBase64: "", fileName: "", colRange: [0, 2], rowRange: [3, 5], hasHeader: false, status: "idle", color: "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300" },
        { id: "tile-5", label: "Tile 5 (Center)", imageBase64: "", fileName: "", colRange: [3, 5], rowRange: [3, 5], hasHeader: false, status: "idle", color: "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300" },
        { id: "tile-6", label: "Tile 6 (Mid-Right)", imageBase64: "", fileName: "", colRange: [6, 8], rowRange: [3, 5], hasHeader: false, status: "idle", color: "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300" },
        { id: "tile-7", label: "Tile 7 (Bottom-Left)", imageBase64: "", fileName: "", colRange: [0, 2], rowRange: [6, 8], hasHeader: false, status: "idle", color: "bg-cyan-500/10 border-cyan-500/40 text-cyan-700 dark:text-cyan-300" },
        { id: "tile-8", label: "Tile 8 (Bottom-Center)", imageBase64: "", fileName: "", colRange: [3, 5], rowRange: [6, 8], hasHeader: false, status: "idle", color: "bg-orange-500/10 border-orange-500/40 text-orange-700 dark:text-orange-300" },
        { id: "tile-9", label: "Tile 9 (Bottom-Right)", imageBase64: "", fileName: "", colRange: [6, 8], rowRange: [6, 8], hasHeader: false, status: "idle", color: "bg-teal-500/10 border-teal-500/40 text-teal-700 dark:text-teal-300" },
      ]);
      toast.success("Applied 3×3 Grid Preset (9 tiles, 9×9 matrix)");
    } else if (presetType === "2x2") {
      setConfig((prev) => ({ ...prev, totalRows: 8, totalCols: 8 }));
      setTiles([
        { id: "tile-1", label: "Quadrant 1 (Top-Left)", imageBase64: "", fileName: "", colRange: [0, 3], rowRange: [0, 3], hasHeader: true, status: "idle", color: "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300" },
        { id: "tile-2", label: "Quadrant 2 (Top-Right)", imageBase64: "", fileName: "", colRange: [4, 7], rowRange: [0, 3], hasHeader: true, status: "idle", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
        { id: "tile-3", label: "Quadrant 3 (Bottom-Left)", imageBase64: "", fileName: "", colRange: [0, 3], rowRange: [4, 7], hasHeader: false, status: "idle", color: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" },
        { id: "tile-4", label: "Quadrant 4 (Bottom-Right)", imageBase64: "", fileName: "", colRange: [4, 7], rowRange: [4, 7], hasHeader: false, status: "idle", color: "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300" },
      ]);
      toast.success("Applied 2×2 Quadrant Preset (4 photos)");
    } else if (presetType === "vertical_3") {
      setConfig((prev) => ({ ...prev, totalRows: 30, totalCols: 6 }));
      setTiles([
        { id: "tile-1", label: "Top Section", imageBase64: "", fileName: "", colRange: [0, 5], rowRange: [0, 9], hasHeader: true, status: "idle", color: "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300" },
        { id: "tile-2", label: "Middle Section", imageBase64: "", fileName: "", colRange: [0, 5], rowRange: [10, 19], hasHeader: false, status: "idle", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
        { id: "tile-3", label: "Bottom Section", imageBase64: "", fileName: "", colRange: [0, 5], rowRange: [20, 29], hasHeader: false, status: "idle", color: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" },
      ]);
      toast.success("Applied Long Vertical Table Preset (3 chunks)");
    } else if (presetType === "horizontal_2") {
      setConfig((prev) => ({ ...prev, totalRows: 15, totalCols: 10 }));
      setTiles([
        { id: "tile-1", label: "Left Columns (A-E)", imageBase64: "", fileName: "", colRange: [0, 4], rowRange: [0, 14], hasHeader: true, status: "idle", color: "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300" },
        { id: "tile-2", label: "Right Columns (F-J)", imageBase64: "", fileName: "", colRange: [5, 9], rowRange: [0, 14], hasHeader: true, status: "idle", color: "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300" },
      ]);
      toast.success("Applied Wide Horizontal Preset (2 chunks)");
    }
  };

  // Add a new custom tile
  const handleAddTile = () => {
    const nextIdx = tiles.length;
    const palette = TILE_PALETTE[nextIdx % TILE_PALETTE.length];
    const newTile: TileItem = {
      id: `tile-${Date.now()}`,
      label: `Tile ${nextIdx + 1}`,
      imageBase64: "",
      fileName: "",
      colRange: [0, 2],
      rowRange: [nextIdx * 3, nextIdx * 3 + 2],
      hasHeader: nextIdx === 0,
      status: "idle",
      color: `${palette.bg} ${palette.border} ${palette.text}`,
    };
    setTiles((prev) => [...prev, newTile]);
    toast.info(`Added ${newTile.label}`);
  };

  // Remove a tile
  const handleRemoveTile = (id: string) => {
    if (tiles.length <= 1) {
      toast.error("At least one tile is required");
      return;
    }
    setTiles((prev) => prev.filter((t) => t.id !== id));
  };

  // Update tile properties
  const updateTile = (id: string, updates: Partial<TileItem>) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  // Shift tile coordinates
  const shiftTile = (
    id: string,
    axis: "row" | "col",
    delta: number,
  ) => {
    setTiles((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (axis === "row") {
          const newStart = Math.max(0, t.rowRange[0] + delta);
          const newEnd = Math.max(newStart, t.rowRange[1] + delta);
          return { ...t, rowRange: [newStart, newEnd] };
        } else {
          const newStart = Math.max(0, t.colRange[0] + delta);
          const newEnd = Math.max(newStart, t.colRange[1] + delta);
          return { ...t, colRange: [newStart, newEnd] };
        }
      }),
    );
  };

  // Handle uploading image for a single tile
  const handleTileImageUpload = (id: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateTile(id, {
        imageBase64: base64,
        fileName: file.name,
        status: "idle",
        error: undefined,
      });
      toast.success(`Attached photo to ${tiles.find((t) => t.id === id)?.label}`);
    };
    reader.readAsDataURL(file);
  };

  // Handle batch uploading multiple images at once
  const handleBatchImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      toast.error("No valid image files found");
      return;
    }

    let loadedCount = 0;
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;

        setTiles((prevTiles) => {
          // If we have an existing empty slot at this index, fill it
          if (index < prevTiles.length) {
            return prevTiles.map((t, i) =>
              i === index
                ? {
                    ...t,
                    imageBase64: base64,
                    fileName: file.name,
                    status: "idle",
                  }
                : t,
            );
          } else {
            // Otherwise create a new tile for this image
            const palette = TILE_PALETTE[index % TILE_PALETTE.length];
            const newTile: TileItem = {
              id: `tile-${Date.now()}-${index}`,
              label: `Tile ${index + 1}`,
              imageBase64: base64,
              fileName: file.name,
              colRange: [0, 2],
              rowRange: [index * 3, index * 3 + 2],
              hasHeader: index === 0,
              status: "idle",
              color: `${palette.bg} ${palette.border} ${palette.text}`,
            };
            return [...prevTiles, newTile];
          }
        });

        loadedCount++;
        if (loadedCount === imageFiles.length) {
          toast.success(`Attached ${loadedCount} images to tile grid slots!`);
        }
      };
      reader.readAsDataURL(file);
    });

    if (batchFileInputRef.current) batchFileInputRef.current.value = "";
  };

  // Scan an individual tile
  const scanIndividualTile = async (tileId: string) => {
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || !tile.imageBase64) {
      toast.error("Please upload an image for this tile first");
      return;
    }

    updateTile(tileId, { status: "scanning", error: undefined });
    try {
      const expectedRows = Math.abs(tile.rowRange[1] - tile.rowRange[0]) + 1;
      const expectedCols = Math.abs(tile.colRange[1] - tile.colRange[0]) + 1;

      const res = await scanTableImageAction(tile.imageBase64, {
        isDataOnly: !tile.hasHeader,
        expectedRows,
        expectedCols,
        tileContext: `${tile.label} covering Rows ${tile.rowRange[0]}-${tile.rowRange[1]}, Cols ${tile.colRange[0]}-${tile.colRange[1]}`,
        customPrompt: config.directives.customPrompt,
        dotToA: config.directives.dotToA,
        leaveUnclearBlank: config.directives.leaveUnclearBlank,
        handleCrossOuts: config.directives.handleCrossOuts,
        parseMultiTierDates: config.directives.parseMultiTierDates,
        includeBottomNotes: config.directives.includeBottomNotes,
        userId,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "OCR extraction failed");
      }

      const rows = res.data.data || [];
      const cols = res.data.columns || [];

      updateTile(tileId, {
        status: "ready",
        extractedCols: cols,
        extractedData: rows,
        detectedRowsCount: rows.length,
        detectedColsCount: cols.length,
      });

      toast.success(`${tile.label}: Extracted ${cols.length} cols × ${rows.length} rows`);
    } catch (err: any) {
      console.error("Tile OCR error:", err);
      updateTile(tileId, {
        status: "error",
        error: err.message || "Failed to scan tile",
      });
      toast.error(`${tile.label} error: ${err.message || "OCR failed"}`);
    }
  };

  // Scan all tiles that have an image attached
  const scanAllTiles = async () => {
    const tilesToScan = tiles.filter((t) => t.imageBase64 && t.status !== "ready");
    if (tilesToScan.length === 0) {
      const readyCount = tiles.filter((t) => t.status === "ready").length;
      if (readyCount > 0) {
        toast.info("All tiles with images are already scanned. Ready to stitch!");
      } else {
        toast.error("Please attach images to the tiles first");
      }
      return;
    }

    setIsScanningAll(true);
    setScanProgress({ current: 0, total: tilesToScan.length });

    let completed = 0;
    for (const tile of tilesToScan) {
      updateTile(tile.id, { status: "scanning", error: undefined });
      try {
        const expectedRows = Math.abs(tile.rowRange[1] - tile.rowRange[0]) + 1;
        const expectedCols = Math.abs(tile.colRange[1] - tile.colRange[0]) + 1;

        const res = await scanTableImageAction(tile.imageBase64, {
          isDataOnly: !tile.hasHeader,
          expectedRows,
          expectedCols,
          tileContext: `${tile.label} covering Rows ${tile.rowRange[0]}-${tile.rowRange[1]}, Cols ${tile.colRange[0]}-${tile.colRange[1]}`,
          customPrompt: config.directives.customPrompt,
          dotToA: config.directives.dotToA,
          leaveUnclearBlank: config.directives.leaveUnclearBlank,
          handleCrossOuts: config.directives.handleCrossOuts,
          parseMultiTierDates: config.directives.parseMultiTierDates,
          includeBottomNotes: config.directives.includeBottomNotes,
          userId,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || "OCR extraction failed");
        }

        const rows = res.data.data || [];
        const cols = res.data.columns || [];

        updateTile(tile.id, {
          status: "ready",
          extractedCols: cols,
          extractedData: rows,
          detectedRowsCount: rows.length,
          detectedColsCount: cols.length,
        });
      } catch (err: any) {
        updateTile(tile.id, {
          status: "error",
          error: err.message || "OCR failed",
        });
      } finally {
        completed++;
        setScanProgress({ current: completed, total: tilesToScan.length });
      }
    }

    setIsScanningAll(false);
    toast.success("Finished scanning tiles!");
  };

  // Reconstruct and Stitch the master spreadsheet
  const handleStitch = () => {
    const readyTiles = tiles.filter((t) => t.status === "ready");
    if (readyTiles.length === 0) {
      toast.error("No scanned tiles ready to stitch. Scan tiles first!");
      return;
    }

    const result = stitchTiledOcr(tiles, config);

    if (result.columns.length === 0 && result.data.length === 0) {
      toast.error("Stitching produced an empty table. Check your tile ranges.");
      return;
    }

    toast.success(
      `Reconstructed table: ${result.stats.totalCols} columns × ${result.stats.totalRows} rows (${result.stats.filledCells} cells filled from ${result.stats.tilesUsed} tiles)!`,
    );

    onStitchComplete({
      columns: result.columns,
      data: result.data,
      datasetNameSuggestion: `Tiled OCR Reconstructed (${result.stats.tilesUsed} Chunks) - ${new Date().toLocaleDateString()}`,
    });
  };

  const readyTilesCount = tiles.filter((t) => t.status === "ready").length;
  const tilesWithImagesCount = tiles.filter((t) => !!t.imageBase64).length;

  return (
    <div className="space-y-6">
      {/* Top Controls & Presets */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Tiled Chunking & Coordinate Mapping Engine
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold border-purple-300 text-purple-600 dark:border-purple-800 dark:text-purple-300"
            >
              <Sparkles className="size-2.5 mr-1" /> Multi-Photo OCR
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Divide large or long physical spreadsheets across multiple photos.
            Assign X (Col) and Y (Row) coordinate ranges to stitch them into a single master sheet.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            Presets:
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset("3x3")}
            className="h-7 text-xs px-2.5 cursor-pointer"
          >
            3×3 Grid (9 Tiles)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset("2x2")}
            className="h-7 text-xs px-2.5 cursor-pointer"
          >
            2×2 Quadrants
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset("vertical_3")}
            className="h-7 text-xs px-2.5 cursor-pointer"
          >
            Long Vertical (3 Chunks)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset("horizontal_2")}
            className="h-7 text-xs px-2.5 cursor-pointer"
          >
            Wide Horizontal (2 Chunks)
          </Button>
        </div>
      </div>

      {/* Stitching Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-2xs">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wand2 className="size-3.5 text-primary" />
            <span>Chunk Stitching Strategy</span>
          </span>
          <p className="text-[11px] text-muted-foreground">
            {config.stitchMode === "sequential_rows"
              ? "Append chunks vertically in sequence (e.g. Chunk 1 has rows 1-10, Chunk 2 has 11-13, Chunk 3 has 14-200, arbitrary row sizes)"
              : config.stitchMode === "coordinate"
                ? "Map chunks into target grid using explicit [X, Y] coordinate bounds"
                : "Join chunk rows dynamically by matching Roll No, S.N., or ID column"}
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-muted/40 shrink-0">
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, stitchMode: "sequential_rows" }))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              config.stitchMode === "sequential_rows"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sequential Rows (Any Sizes)
          </button>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, stitchMode: "coordinate" }))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              config.stitchMode === "coordinate"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            2D Coordinates [X, Y]
          </button>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, stitchMode: "key_column" }))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              config.stitchMode === "key_column"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Key-Column Join
          </button>
        </div>
      </div>

      {/* AI Vision Rules & Custom Directives Accordion */}
      <div className="rounded-xl border bg-muted/20 overflow-hidden shadow-2xs">
        <div
          onClick={() => setShowDirectives(!showDirectives)}
          className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer select-none border-b"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-600" />
            <span className="text-xs font-bold text-foreground">
              AI Vision Directives & Prompt Rules
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold border-purple-400 bg-purple-500/10 text-purple-700 dark:text-purple-300"
            >
              LangChain Style Control
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {showDirectives ? "Hide Rules ▲" : "Show Rules ▼"}
          </span>
        </div>

        {showDirectives && (
          <div className="p-4 space-y-3.5 text-xs">
            {/* Rule Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <label className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.directives.dotToA}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      directives: { ...prev.directives, dotToA: e.target.checked },
                    }))
                  }
                  className="rounded text-primary size-4 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Convert '.' dots to 'A'
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Treats single pen dots/bullets in attendance cells as Absent ('A').
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.directives.leaveUnclearBlank}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      directives: { ...prev.directives, leaveUnclearBlank: e.target.checked },
                    }))
                  }
                  className="rounded text-primary size-4 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Leave Unclear Cells Blank
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Outputs "" when handwriting is illegible instead of guessing.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.directives.handleCrossOuts}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      directives: { ...prev.directives, handleCrossOuts: e.target.checked },
                    }))
                  }
                  className="rounded text-primary size-4 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Prioritize Handwritten Overrides
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Detects crossed-out names and extracts replacement text (e.g. 'Taha').
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.directives.parseMultiTierDates}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      directives: { ...prev.directives, parseMultiTierDates: e.target.checked },
                    }))
                  }
                  className="rounded text-primary size-4 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Merge 2-Tier Date Headers
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Combines stacked days & months (e.g. 06 + Aug into '06/Aug').
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.directives.includeBottomNotes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      directives: { ...prev.directives, includeBottomNotes: e.target.checked },
                    }))
                  }
                  className="rounded text-primary size-4 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Extract Appended Bottom Rows
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Captures entries written below the main table grid.
                  </span>
                </div>
              </label>
            </div>

            {/* Custom Prompt Textarea */}
            <div className="space-y-1 pt-1">
              <label className="font-semibold text-foreground block text-xs">
                Custom AI Extraction Prompt:
              </label>
              <textarea
                value={config.directives.customPrompt}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    directives: { ...prev.directives, customPrompt: e.target.value },
                  }))
                }
                rows={2}
                placeholder="e.g., 'Dots mean Absent (A). P means Present. Keep Roll No format 0801CS... If cell contains handwritten circled name, highlight it.'"
                className="w-full text-xs font-mono p-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Target Grid Dimensions & Overlap Settings (Only for Coordinate Mode) */}
      {config.stitchMode === "coordinate" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border bg-card/60 shadow-2xs">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Target Total Rows (Y-Axis)
            </label>
            <Input
              type="number"
              min={1}
              max={200}
              value={config.totalRows}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  totalRows: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Target Total Columns (X-Axis)
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config.totalCols}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  totalCols: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Boundary Overlap Strategy
            </label>
            <select
              value={config.overlapStrategy}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  overlapStrategy: e.target.value as OverlapStrategy,
                }))
              }
              className="w-full h-8 px-2.5 text-xs rounded-md border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="prefer_longest">Keep Longest String (Recommended)</option>
              <option value="prefer_first">Prefer First Tile</option>
              <option value="prefer_latest">Overwrite with Later Tile</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium h-8">
              <input
                type="checkbox"
                checked={config.autoFitToExtracted}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    autoFitToExtracted: e.target.checked,
                  }))
                }
                className="rounded text-primary focus:ring-primary size-4"
              />
              <span>Auto-expand grid if tile data overflows</span>
            </label>
          </div>
        </div>
      )}

      {/* Visual 2D Grid Layout Map */}
      <TiledGridVisualizer
        tiles={tiles}
        config={config}
        activeTileId={activeTileId}
        onSelectTile={(id) => setActiveTileId(id)}
      />

      {/* Batch Upload & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Batch upload input */}
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => handleBatchImageUpload(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => batchFileInputRef.current?.click()}
            className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
          >
            <Upload className="size-3.5 text-primary" />
            <span>Batch Upload Photos ({tilesWithImagesCount}/{tiles.length} loaded)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTile}
            className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
          >
            <Plus className="size-3.5" />
            <span>Add Tile Slot</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan All Button */}
          <Button
            onClick={scanAllTiles}
            disabled={isScanningAll || tilesWithImagesCount === 0}
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 cursor-pointer border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 font-semibold"
          >
            {isScanningAll ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-purple-600" />
                <span>
                  Scanning ({scanProgress.current}/{scanProgress.total})...
                </span>
              </>
            ) : (
              <>
                <ScanText className="size-3.5 text-purple-600" />
                <span>Scan All Tiles</span>
              </>
            )}
          </Button>

          {/* Stitch Button */}
          <Button
            onClick={handleStitch}
            disabled={readyTilesCount === 0 || isScanningAll}
            size="sm"
            className="h-8 text-xs gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-xs"
          >
            <Wand2 className="size-3.5" />
            <span>Reconstruct Spreadsheet ({readyTilesCount} Ready)</span>
          </Button>
        </div>
      </div>

      {/* Tile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const isSelected = activeTileId === tile.id;
          return (
            <div
              key={tile.id}
              onClick={() => setActiveTileId(tile.id)}
              className={`rounded-xl border p-4 transition-all duration-200 bg-card space-y-3 shadow-2xs relative ${
                isSelected
                  ? "ring-2 ring-primary border-primary shadow-sm"
                  : "hover:border-primary/40"
              }`}
            >
              {/* Tile Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 ${tile.color}`}
                  >
                    {tile.label}
                  </Badge>
                  {tile.status === "ready" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"
                    >
                      <CheckCircle2 className="size-2.5" />
                      Ready
                    </Badge>
                  )}
                  {tile.status === "scanning" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 gap-1 animate-pulse"
                    >
                      <Loader2 className="size-2.5 animate-spin" />
                      Scanning
                    </Badge>
                  )}
                  {tile.status === "error" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-destructive/40 bg-destructive/10 text-destructive gap-1"
                    >
                      <AlertCircle className="size-2.5" />
                      Error
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTile(tile.id);
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  title="Remove this tile"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* Photo Area / Preview */}
              <div className="flex items-center gap-3">
                <div className="relative size-16 rounded-lg overflow-hidden border bg-muted/40 shrink-0 flex items-center justify-center">
                  {tile.imageBase64 ? (
                    <img
                      src={tile.imageBase64}
                      alt={tile.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 text-muted-foreground p-1 text-center">
                      <Upload className="size-4 mb-0.5 text-primary" />
                      <span className="text-[9px] font-semibold">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleTileImageUpload(tile.id, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    value={tile.label}
                    onChange={(e) =>
                      updateTile(tile.id, { label: e.target.value })
                    }
                    placeholder="Tile Name"
                    className="h-7 text-xs font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground truncate">
                    {tile.fileName || "No photo attached yet"}
                  </p>
                  {tile.status === "ready" && (
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Extracted: {tile.detectedColsCount} cols × {tile.detectedRowsCount} rows
                    </p>
                  )}
                </div>
              </div>

              {/* Coordinate Inputs: X-Range & Y-Range */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t text-xs">
                {/* Y-Axis: Rows */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Y-Axis: Rows</span>
                    <span className="font-mono text-foreground font-semibold">
                      [{tile.rowRange[0]}..{tile.rowRange[1]}]
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={tile.rowRange[0]}
                      onChange={(e) =>
                        updateTile(tile.id, {
                          rowRange: [
                            parseInt(e.target.value) || 0,
                            tile.rowRange[1],
                          ],
                        })
                      }
                      className="h-7 text-xs font-mono text-center px-1"
                      placeholder="Start"
                    />
                    <span className="text-muted-foreground text-xs font-mono">to</span>
                    <Input
                      type="number"
                      min={0}
                      value={tile.rowRange[1]}
                      onChange={(e) =>
                        updateTile(tile.id, {
                          rowRange: [
                            tile.rowRange[0],
                            parseInt(e.target.value) || 0,
                          ],
                        })
                      }
                      className="h-7 text-xs font-mono text-center px-1"
                      placeholder="End"
                    />
                  </div>
                </div>

                {/* X-Axis: Columns */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>X-Axis: Cols</span>
                    <span className="font-mono text-foreground font-semibold">
                      [{tile.colRange[0]}..{tile.colRange[1]}]
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={tile.colRange[0]}
                      onChange={(e) =>
                        updateTile(tile.id, {
                          colRange: [
                            parseInt(e.target.value) || 0,
                            tile.colRange[1],
                          ],
                        })
                      }
                      className="h-7 text-xs font-mono text-center px-1"
                      placeholder="Start"
                    />
                    <span className="text-muted-foreground text-xs font-mono">to</span>
                    <Input
                      type="number"
                      min={0}
                      value={tile.colRange[1]}
                      onChange={(e) =>
                        updateTile(tile.id, {
                          colRange: [
                            tile.colRange[0],
                            parseInt(e.target.value) || 0,
                          ],
                        })
                      }
                      className="h-7 text-xs font-mono text-center px-1"
                      placeholder="End"
                    />
                  </div>
                </div>
              </div>

              {/* Shift Buttons & Options */}
              <div className="flex items-center justify-between pt-1 border-t gap-1">
                {/* Has Header Checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={tile.hasHeader}
                    onChange={(e) =>
                      updateTile(tile.id, { hasHeader: e.target.checked })
                    }
                    className="rounded text-primary size-3.5"
                  />
                  <span>Has Headers</span>
                </label>

                {/* Coordinate Shift Shortcuts */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center border rounded-md overflow-hidden bg-muted/40">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftTile(tile.id, "row", -1);
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Shift 1 Row Up"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftTile(tile.id, "row", 1);
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Shift 1 Row Down"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftTile(tile.id, "col", -1);
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Shift 1 Col Left"
                    >
                      <ArrowLeft className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftTile(tile.id, "col", 1);
                      }}
                      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Shift 1 Col Right"
                    >
                      <ArrowRight className="size-3" />
                    </button>
                  </div>

                  {/* Individual Scan Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      scanIndividualTile(tile.id);
                    }}
                    disabled={!tile.imageBase64 || tile.status === "scanning"}
                    className="h-7 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    {tile.status === "scanning" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Scan"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
