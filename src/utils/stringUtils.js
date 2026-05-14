export const toTitleCase = (str) => {
  if (!str) return '';
  const titleCased = str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Pequenas palavras que normalmente não levam maiúscula no meio da frase (opcional, mas bom ter)
      const pequenas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'com', 'por', 'para'];
      if (pequenas.includes(word) && str.toLowerCase().indexOf(word) !== 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  // Deixa tudo que estiver entre parênteses em CAIXA ALTA
  return titleCased.replace(/\(([^)]+)\)/g, (match) => match.toUpperCase());
};
