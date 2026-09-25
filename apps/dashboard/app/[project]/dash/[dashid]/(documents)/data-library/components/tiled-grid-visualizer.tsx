"use client";

import React, { useMemo } from "react";
import { TileItem, TiledGridConfig } from "./tiled-ocr-types";
import { Layers, AlertTriangle, CheckCircle2, ArrowDown, Database, Key } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

interface TiledGridVisualizerProps {
  tiles: TileItem[];
  config: TiledGridConfig;
  activeTileId: string | null;
  onSelectTile?: (id: string) => void;
}

export const TiledGridVisualizer: React.FC<TiledGridVisualizerProps> = ({
  tiles,
  config,
  activeTileId,
  onSelectTile,
}) => {
  // If in Sequential Rows mode (Arbitrary Slices: 1-10, 11-13, 14-200...)
  if (config.stitchMode === "sequential_rows") {
    let accumulatedRows = 0;
    return (
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Sequential Chunk Reconstruction Pipeline
            </h4>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold border-purple-400 bg-purple-500/10 text-purple-700 dark:text-purple-300"
            >
              Arbitrary Row Slices (1-10, 11-13, 14-200...)
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {tiles.filter((t) => t.status === "ready").length}/{tiles.length} Chunks Scanned
          </span>
        </div>

        {/* Pipeline Stack */}
        <div className="space-y-2">
          {tiles.map((tile, idx) => {
            const rowCount = tile.detectedRowsCount || (tile.rowRange[1] - tile.rowRange[0] + 1);
            const startRow = accumulatedRows + 1;
            const endRow = accumulatedRows + rowCount;
            accumulatedRows += rowCount;
            const isSelected = activeTileId === tile.id;

            return (
              <div key={tile.id} className="space-y-1">
                <div
                  onClick={() => onSelectTile?.(tile.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                    tile.color
                  } ${isSelected ? "ring-2 ring-primary" : "opacity-90 hover:opacity-100"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-background/80 shadow-2xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {tile.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {tile.fileName || "No photo attached"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-background text-[10px]">
                      {tile.status === "ready"
                        ? `Scanned: ${tile.detectedRowsCount} rows × ${tile.detectedColsCount} cols`
                        : `Estimated: ~${rowCount} rows`}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Rows {startRow}–{endRow}
                    </span>
                  </div>
                </div>

                {idx < tiles.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="size-3 text-muted-foreground/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>
            Chunks are appended automatically top-to-bottom into a continuous table without fixed row height restrictions.
          </span>
          <span className="font-semibold text-foreground">
            Total Target: ~{accumulatedRows} rows
          </span>
        </div>
      </div>
    );
  }

  // If in Key-Column Join Mode
  if (config.stitchMode === "key_column") {
    return (
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Key-Column Relational Join
            </h4>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold border-primary/30 text-primary"
            >
              Primary Key: {config.keyColumnName || "Roll No. / S.N."}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Chunks will be aligned and merged horizontally by matching the student's Roll No or Serial Number.
          Photos covering left columns (Name, Roll No) and right columns (Attendance Dates) merge into cohesive student records.
        </p>
      </div>
    );
  }

  // MODE 3: 2D Coordinate Bounds Matrix
  const displayRows = Math.min(Math.max(config.totalRows, 1), 24);
  const displayCols = Math.min(Math.max(config.totalCols, 1), 20);

  const coverageMatrix: TileItem[][][] = Array.from({ length: displayRows }, () =>
    Array.from({ length: displayCols }, () => []),
  );

  tiles.forEach((tile) => {
    const rMin = Math.max(0, Math.min(tile.rowRange[0], tile.rowRange[1]));
    const rMax = Math.min(displayRows - 1, Math.max(tile.rowRange[0], tile.rowRange[1]));
    const cMin = Math.max(0, Math.min(tile.colRange[0], tile.colRange[1]));
    const cMax = Math.min(displayCols - 1, Math.max(tile.colRange[0], tile.colRange[1]));

    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        coverageMatrix[r][c].push(tile);
      }
    }
  });

  let coveredCount = 0;
  let overlapCount = 0;
  for (let r = 0; r < displayRows; r++) {
    for (let c = 0; c < displayCols; c++) {
      const count = coverageMatrix[r][c].length;
      if (count > 0) coveredCount++;
      if (count > 1) overlapCount++;
    }
  }

  const totalDisplayCells = displayRows * displayCols;
  const coveragePercent = Math.round((coveredCount / totalDisplayCells) * 100);

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      {/* Header / Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Target Grid Layout Map
          </h4>
          <span className="text-xs text-muted-foreground">
            ({config.totalRows} rows × {config.totalCols} cols)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] font-medium border-primary/30 text-primary"
          >
            {coveragePercent}% Grid Covered
          </Badge>
          {overlapCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
            >
              <AlertTriangle className="size-2.5" />
              {overlapCount} overlapping cell{overlapCount > 1 ? "s" : ""}
            </Badge>
          )}
          {coveragePercent === 100 && overlapCount === 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"
            >
              <CheckCircle2 className="size-2.5" />
              Seamless Partition
            </Badge>
          )}
        </div>
      </div>

      {/* Visualizer Grid Matrix */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="flex items-center gap-1 mb-1 pl-8">
            {Array.from({ length: displayCols }, (_, c) => (
              <div
                key={c}
                className="w-10 text-center text-[10px] font-mono text-muted-foreground shrink-0"
              >
                C{c}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {Array.from({ length: displayRows }, (_, r) => (
              <div key={r} className="flex items-center gap-1">
                <div className="w-7 text-right pr-1 text-[10px] font-mono text-muted-foreground shrink-0">
                  R{r}
                </div>

                {Array.from({ length: displayCols }, (_, c) => {
                  const cellTiles = coverageMatrix[r][c];
                  const hasTiles = cellTiles.length > 0;
                  const isMulti = cellTiles.length > 1;
                  const primaryTile = cellTiles[0];
                  const isTileActive =
                    activeTileId && cellTiles.some((t) => t.id === activeTileId);

                  let cellStyle = "bg-background border-dashed border-border/70 text-muted-foreground/40";
                  if (hasTiles) {
                    if (isMulti) {
                      cellStyle = "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300";
                    } else {
                      cellStyle = `${primaryTile.color} border-solid shadow-2xs font-semibold`;
                    }
                  }

                  if (isTileActive) {
                    cellStyle += " ring-2 ring-primary ring-offset-1 scale-105 z-10";
                  }

                  return (
                    <div
                      key={c}
                      onClick={() => {
                        if (primaryTile && onSelectTile) {
                          onSelectTile(primaryTile.id);
                        }
                      }}
                      title={
                        hasTiles
                          ? `Cell (R${r}, C${c})\nTiles: ${cellTiles.map((t) => t.label).join(", ")}`
                          : `Cell (R${r}, C${c}): Unassigned`
                      }
                      className={`w-10 h-8 rounded border flex flex-col items-center justify-center text-[9px] cursor-pointer transition-all duration-150 shrink-0 select-none ${cellStyle}`}
                    >
                      {hasTiles ? (
                        <span>
                          {cellTiles.length === 1
                            ? primaryTile.label.slice(0, 3)
                            : `+${cellTiles.length}`}
                        </span>
                      ) : (
                        <span className="text-[8px]">•</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-1 border-t text-[11px] text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground">Legend:</span>
        {tiles.map((tile) => (
          <div
            key={tile.id}
            onClick={() => onSelectTile?.(tile.id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] cursor-pointer transition ${
              tile.color
            } ${activeTileId === tile.id ? "ring-2 ring-primary" : "opacity-85 hover:opacity-100"}`}
          >
            <span className="font-semibold">{tile.label}</span>
            <span className="opacity-70 text-[9px]">
              (R{tile.rowRange[0]}-{tile.rowRange[1]}, C{tile.colRange[0]}-{tile.colRange[1]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
