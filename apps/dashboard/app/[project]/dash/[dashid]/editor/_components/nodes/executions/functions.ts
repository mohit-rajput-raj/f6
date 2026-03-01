export const toCamelCase = (str: string): string => {
    return str.toUpperCase()
//   return str
//     .trim()
//     .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
//     .replace(/^./, (s) => s.toLowerCase());
};
export const toLowercase = (str: string): string => {
    return str.toLowerCase()

};