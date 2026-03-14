import { FilterConfig } from "./nodeExecutions";

export const toCamelCase = (str: string): string => {
    // return str.toUpperCase()
  return str
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (s) => s.toLowerCase());
};
export const toLowercase = (str: string): string => {
    return str.toLowerCase()

};
export const applyFilter = (dataset: { columns: string[]; data: any[][] }, config: FilterConfig) => {
  if (!config.column || !config.value || !config.condition) return dataset;
  console.log("this is datasets" ,dataset);
  

  const colIndex = dataset.columns.indexOf(config.column);
  if (colIndex === -1) return dataset;

  const value = config.value.trim();
  const isNumeric = ['number-eq','number-gt','number-gte','number-lt','number-lte'].includes(config.condition);

  const filteredRows = dataset.data.filter(row => {
    const cell = row[colIndex];
    const cellStr = String(cell ?? '').trim();

    switch (config.condition) {
      case 'text-exact':   return cellStr === value;
      case 'text-contains': return cellStr.includes(value);
      case 'text-starts':  return cellStr.startsWith(value);
      case 'text-ends':    return cellStr.endsWith(value);

      case 'number-eq':   return Number(cell) === Number(value);
      case 'number-gt':   return Number(cell) > Number(value);
      case 'number-gte':  return Number(cell) >= Number(value);
      case 'number-lt':   return Number(cell) < Number(value);
      case 'number-lte':  return Number(cell) <= Number(value);

      default: return true;
    }
  });

  return {
    columns: dataset.columns,
    data: filteredRows,
  };
};
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout>;

  function debounced(...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
  };

  return debounced as typeof debounced & { cancel: () => void };
}