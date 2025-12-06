


export const formatCurrency = (value: number, showDecimals: boolean = false): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
};


export const formatCurrencyWithoutSymbol = (value: number, showDecimals: boolean = false): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
};


export const formatCompactCurrency = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0';
  }

  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}K`;
  }

  return formatCurrency(value);
};
