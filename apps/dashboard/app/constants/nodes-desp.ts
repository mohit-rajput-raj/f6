export const EditorCanvasDefaultCardTypes: Record<string, { description: string; type: string }> = {
  // Input nodes
  InputFileNode: { description: 'Upload and parse .xlsx/.csv files', type: 'Input' },
  InputText: { description: 'Enter text data', type: 'Input' },
  InputImage: { description: 'Upload an image', type: 'Input' },
  TextInputNode: { description: 'Text input with preview', type: 'Input' },

  // Transform nodes
  FilterNode: { description: 'Filter rows by column condition', type: 'Transform' },
  SortNode: { description: 'Sort data by column', type: 'Transform' },
  RenameColumnNode: { description: 'Rename a column', type: 'Transform' },
  SelectColumnsNode: { description: 'Pick or drop columns', type: 'Transform' },
  CamelCaseNode: { description: 'Convert text to camelCase', type: 'Transform' },
  LowercaseNode: { description: 'Convert text to lowercase', type: 'Transform' },

  // Math nodes
  MathColumnNode: { description: 'Add/Sub/Mul/Div on a column', type: 'Math' },
  MathRowNode: { description: 'Row-wise sum/avg/min/max', type: 'Math' },
  FormulaNode: { description: 'Custom formula (e.g. col_A * 2 + col_B)', type: 'Math' },
  AggregateNode: { description: 'Group by + aggregate (sum/count/avg)', type: 'Math' },
  CountNode: { description: 'Count specific value across rows', type: 'Math' },

  // Combine nodes
  MergeNode: { description: 'Merge/join two datasets', type: 'Combine' },

  // Output nodes
  OutputNode2: { description: 'Display text/data output', type: 'Output' },
  FileOutputNode: { description: 'Export processed data as file', type: 'Output' },
  baseOutput: { description: 'Basic output display', type: 'Output' },

  // Legacy / other
  FilterCsvNode: { description: 'CSV filter card', type: 'Action' },
  baseNodebar: { description: 'Action bar node', type: 'Action' },
  baseNodeFull: { description: 'Full-featured node', type: 'Action' },
  InputFile: { description: 'File input', type: 'Action' },
  Email: { description: 'Send an email', type: 'Action' },
  Condition: { description: 'Conditional logic', type: 'Condition' },
  AI: { description: 'AI processing', type: 'Action' },
  Slack: { description: 'Send a notification to Slack', type: 'Action' },
  'Google Drive': { description: 'Google Drive integration', type: 'Action' },
  Notion: { description: 'Notion integration', type: 'Action' },
  'Custom Webhook': { description: 'Custom webhook', type: 'Action' },
  'Google Calendar': { description: 'Google Calendar integration', type: 'Action' },
  Trigger: { description: 'Workflow trigger', type: 'Trigger' },
  Action: { description: 'Workflow action', type: 'Action' },
  Wait: { description: 'Wait/delay', type: 'Action' },
}