import { cn } from "@repo/ui/lib/utils";
import { Handle, type HandleProps, Position } from "@xyflow/react";
import type { ComponentProps, ReactNode } from "react";

export type NodeVariant =
  | "default"
  | "input"
  | "transform"
  | "math"
  | "logic"
  | "combine"
  | "output"
  | "ai";

const nodeVariantCardStyles: Record<NodeVariant, string> = {
  default:
    "hover:border-border [.react-flow\\_\\_node.selected_&]:border-foreground/80 [.react-flow\\_\\_node.selected_&]:ring-primary/30",
  input:
    "hover:border-sky-500/50 [.react-flow\\_\\_node.selected_&]:border-sky-500 [.react-flow\\_\\_node.selected_&]:ring-sky-500/35",
  transform:
    "hover:border-violet-500/50 [.react-flow\\_\\_node.selected_&]:border-violet-500 [.react-flow\\_\\_node.selected_&]:ring-violet-500/35",
  math:
    "hover:border-blue-500/50 [.react-flow\\_\\_node.selected_&]:border-blue-500 [.react-flow\\_\\_node.selected_&]:ring-blue-500/35",
  logic:
    "hover:border-amber-500/50 [.react-flow\\_\\_node.selected_&]:border-amber-500 [.react-flow\\_\\_node.selected_&]:ring-amber-500/35",
  combine:
    "hover:border-fuchsia-500/50 [.react-flow\\_\\_node.selected_&]:border-fuchsia-500 [.react-flow\\_\\_node.selected_&]:ring-fuchsia-500/35",
  output:
    "hover:border-emerald-500/50 [.react-flow\\_\\_node.selected_&]:border-emerald-500 [.react-flow\\_\\_node.selected_&]:ring-emerald-500/35",
  ai:
    "hover:border-purple-500/50 [.react-flow\\_\\_node.selected_&]:border-purple-500 [.react-flow\\_\\_node.selected_&]:ring-purple-500/35",
};

const nodeVariantHeaderStyles: Record<NodeVariant, string> = {
  default: "bg-muted/40 text-foreground border-border/40",
  input: "bg-sky-500/[0.08] dark:bg-sky-500/[0.14] text-foreground border-sky-500/20",
  transform: "bg-violet-500/[0.08] dark:bg-violet-500/[0.14] text-foreground border-violet-500/20",
  math: "bg-blue-500/[0.08] dark:bg-blue-500/[0.14] text-foreground border-blue-500/20",
  logic: "bg-amber-500/[0.08] dark:bg-amber-500/[0.14] text-foreground border-amber-500/20",
  combine: "bg-fuchsia-500/[0.08] dark:bg-fuchsia-500/[0.14] text-foreground border-fuchsia-500/20",
  output: "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] text-foreground border-emerald-500/20",
  ai: "bg-gradient-to-r from-purple-500/[0.12] to-indigo-500/[0.12] dark:from-purple-500/[0.20] dark:to-indigo-500/[0.20] text-foreground border-purple-500/25",
};

const nodeVariantIconStyles: Record<NodeVariant, string> = {
  default: "bg-muted text-muted-foreground border-border/60",
  input: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  transform: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  math: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  logic: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  combine: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  output: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ai: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
};

const nodeVariantHandleStyles: Record<NodeVariant, string> = {
  default: "!bg-muted-foreground",
  input: "!bg-sky-500",
  transform: "!bg-violet-500",
  math: "!bg-blue-500",
  logic: "!bg-amber-500",
  combine: "!bg-fuchsia-500",
  output: "!bg-emerald-500",
  ai: "!bg-purple-500",
};

export interface BaseNodeProps extends ComponentProps<"div"> {
  variant?: NodeVariant;
  selected?: boolean;
}

export function BaseNode({ className, variant = "default", selected, ...props }: BaseNodeProps) {
  return (
    <div
      data-variant={variant}
      data-selected={selected}
      className={cn(
        "bg-card text-card-foreground relative rounded-2xl border border-border/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06),0_2px_6px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-150",
        // React Flow selection styles
        "[.react-flow\\_\\_node.selected_&]:ring-2",
        "[.react-flow\\_\\_node.selected_&]:shadow-lg",
        selected && "ring-2 shadow-lg",
        nodeVariantCardStyles[variant],
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}

export interface BaseNodeHeaderProps extends ComponentProps<"header"> {
  variant?: NodeVariant;
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({
  className,
  variant,
  ...props
}: BaseNodeHeaderProps) {
  return (
    <header
      {...props}
      className={cn(
        "mx-0 my-0 flex flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-t-2xl border-b",
        variant ? nodeVariantHeaderStyles[variant] : "border-border/40 bg-muted/30 text-foreground",
        className,
      )}
    />
  );
}

export interface BaseNodeIconProps extends ComponentProps<"div"> {
  variant?: NodeVariant;
}

export function BaseNodeIcon({
  className,
  variant = "default",
  ...props
}: BaseNodeIconProps) {
  return (
    <div
      data-slot="base-node-icon"
      className={cn(
        "flex size-6.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-transform",
        nodeVariantIconStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn(
        "select-none flex-1 font-semibold text-xs tracking-tight text-foreground truncate",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Clean container for right-aligned header actions (NodeMenu, delete, etc.)
 * with `nodrag` to prevent triggering node dragging in React Flow.
 */
export function NodeHeaderActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-header-actions"
      className={cn("flex items-center gap-1.5 shrink-0 nodrag ml-auto", className)}
      {...props}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-content"
      className={cn("flex flex-col gap-y-2.5 p-3.5", className)}
      {...props}
    />
  );
}

export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn(
        "flex flex-col items-center gap-y-2 border-t border-border/40 px-3.5 py-2.5 bg-muted/20 rounded-b-2xl",
        className,
      )}
      {...props}
    />
  );
}

export interface NodeHandleProps extends HandleProps {
  variant?: NodeVariant;
}

export function NodeHandle({
  variant = "default",
  className,
  ...props
}: NodeHandleProps) {
  return (
    <Handle
      className={cn(
        "!w-3 !h-3 rounded-full !border-2 !border-background shadow-xs hover:!scale-130 transition-transform cursor-crosshair z-10",
        nodeVariantHandleStyles[variant],
        className,
      )}
      {...props}
    />
  );
}