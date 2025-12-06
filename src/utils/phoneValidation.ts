


const VALID_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', 
  '21', '22', '24', 
  '27', '28', 
  '31', '32', '33', '34', '35', '37', '38', 
  '41', '42', '43', '44', '45', '46', 
  '47', '48', '49', 
  '51', '53', '54', '55', 
  '61', 
  '62', '64', 
  '63', 
  '65', '66', 
  '67', 
  '68', 
  '69', 
  '71', '73', '74', '75', '77', 
  '79', 
  '81', '87', 
  '82', 
  '83', 
  '84', 
  '85', '88', 
  '86', '89', 
  '91', '93', '94', 
  '92', '97', 
  '95', 
  '96', 
  '98', '99'  
];


export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}


export function validateBrazilianPhone(phone: string): { valid: boolean; message?: string } {
  if (!phone || phone.trim() === '') {
    return {
      valid: false,
      message: 'Telefone é obrigatório'
    };
  }

  const normalized = normalizePhone(phone);

  
  if (normalized.length < 10) {
    return {
      valid: false,
      message: 'Telefone muito curto. Digite DDD + número'
    };
  }

  if (normalized.length > 11) {
    return {
      valid: false,
      message: 'Telefone muito longo. Máximo 11 dígitos'
    };
  }

  
  const ddd = normalized.substring(0, 2);
  if (!VALID_DDDS.includes(ddd)) {
    return {
      valid: false,
      message: `DDD ${ddd} inválido. Use um código de área brasileiro válido`
    };
  }

  
  if (/^(\d)\1+$/.test(normalized)) {
    return {
      valid: false,
      message: 'Telefone inválido. Não use números repetidos'
    };
  }

  
  if (normalized.length === 10) {
    const firstDigit = normalized.charAt(2);
    
    if (!['2', '3', '4', '5'].includes(firstDigit)) {
      return {
        valid: false,
        message: 'Telefone fixo deve começar com 2, 3, 4 ou 5 após o DDD'
      };
    }
  }

  
  if (normalized.length === 11) {
    const firstDigit = normalized.charAt(2);
    
    if (firstDigit !== '9') {
      return {
        valid: false,
        message: 'Celular deve começar com 9 após o DDD'
      };
    }
  }

  return { valid: true };
}


export function formatBrazilianPhone(phone: string): string {
  const normalized = normalizePhone(phone);

  if (normalized.length === 0) return '';

  if (normalized.length <= 2) {
    return `(${normalized}`;
  }

  if (normalized.length <= 6) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2)}`;
  }

  if (normalized.length <= 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }

  
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7, 11)}`;
}


export function applyPhoneMask(value: string): string {
  return formatBrazilianPhone(value);
}
