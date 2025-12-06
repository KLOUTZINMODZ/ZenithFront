/**
 * Constantes de limites de preços do sistema
 * 
 * IMPORTANTE: Estes limites devem estar sincronizados com os backends:
 * - HackloteChatApi/src/constants/priceLimits.js
 * - HackLoteAPI/src/constants/priceLimits.js
 */

export const PRICE_LIMITS = {
  // Limite mínimo: R$ 5,00
  // Razão: Garante viabilidade do sistema de mediação
  // Valores muito baixos resultam em taxas < 1 centavo (inviáveis)
  MIN: 5.00,

  // Limite máximo: R$ 99.999,00
  // Razão: Segurança e compatibilidade com sistema de pagamento
  MAX: 99999.00,

  // Mensagens de erro padronizadas
  ERRORS: {
    TOO_LOW: `O valor mínimo permitido é R$ 5,00`,
    TOO_HIGH: `O valor máximo permitido é R$ 99.999,00`,
    INVALID: 'Valor inválido',
    REQUIRED: 'O preço é obrigatório'
  }
} as const;

/**
 * Interface para resultado de validação
 */
export interface PriceValidationResult {
  valid: boolean;
  error: string | null;
  value?: number;
}

/**
 * Opções de validação de preço
 */
export interface PriceValidationOptions {
  fieldName?: string;
  allowZero?: boolean;
  customMin?: number;
  customMax?: number;
}

/**
 * Valida se um preço está dentro dos limites permitidos
 * @param price - Preço a ser validado
 * @param options - Opções de validação
 * @returns Resultado da validação
 */
export function validatePrice(
  price: number | string | null | undefined,
  options: PriceValidationOptions = {}
): PriceValidationResult {
  const {
    fieldName = 'Preço',
    allowZero = false,
    customMin = PRICE_LIMITS.MIN,
    customMax = PRICE_LIMITS.MAX
  } = options;

  // Verificar se foi fornecido
  if (price === null || price === undefined || price === '') {
    return {
      valid: false,
      error: `${fieldName} é obrigatório`
    };
  }

  // Converter para número
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Verificar se é número válido
  if (isNaN(numPrice)) {
    return {
      valid: false,
      error: `${fieldName} inválido`
    };
  }

  // Verificar se é negativo
  if (numPrice < 0) {
    return {
      valid: false,
      error: `${fieldName} não pode ser negativo`
    };
  }

  // Verificar zero (se não for permitido)
  if (!allowZero && numPrice === 0) {
    return {
      valid: false,
      error: `${fieldName} não pode ser zero`
    };
  }

  // Verificar limite mínimo
  if (numPrice > 0 && numPrice < customMin) {
    return {
      valid: false,
      error: `${fieldName} mínimo é R$ ${customMin.toFixed(2).replace('.', ',')}`
    };
  }

  // Verificar limite máximo
  if (numPrice > customMax) {
    return {
      valid: false,
      error: `${fieldName} máximo é R$ ${customMax.toFixed(2).replace('.', ',')}`
    };
  }

  return {
    valid: true,
    error: null,
    value: numPrice
  };
}

/**
 * Formata um preço para exibição em Reais
 * @param price - Preço a ser formatado
 * @returns String formatada (ex: "R$ 5,00")
 */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numPrice);
}

/**
 * Hook customizado para validação de preço em tempo real
 * @param price - Preço atual
 * @param options - Opções de validação
 * @returns Resultado da validação
 */
export function usePriceValidation(
  price: number | string | null | undefined,
  options: PriceValidationOptions = {}
): PriceValidationResult {
  return validatePrice(price, options);
}
