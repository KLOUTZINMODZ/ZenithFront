


const URL_PATTERNS = [
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
  /www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
  /\b[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*\.(com|net|org|br|io|app|dev|co|me|info|biz|online|site|tech|store|shop|xyz|club|link|tv|us|uk|ca|au|de|fr|es|it|ru|cn|jp|in|edu|gov|mil)\b/gi,
  /\b(bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|short\.link|cutt\.ly|rb\.gy|is\.gd|buff\.ly|adf\.ly|t\.co)\/[a-zA-Z0-9]+/gi,
];


const PHONE_PATTERNS = [
  
  /\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g,
  
  /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g,
  
  /\b\d{9,15}\b/g,
  
  /\+\d{1,3}\s*\(?\d{1,4}\)?\s*\d{4,10}[-\s]?\d{0,10}/g,
];


const CONTACT_KEYWORDS = [
  /whats\s*app/gi,
  /telegram/gi,
  /discord/gi,
  /skype/gi,
  /\bwpp\b/gi,
  /\bzap\b/gi,
  /me\s*liga/gi,
  /ligue\s*para/gi,
  /chama\s*no/gi,
  /adiciona\s*no/gi,
];

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  detectedContent?: string;
}


export const containsURL = (text: string): boolean => {
  return URL_PATTERNS.some(pattern => pattern.test(text));
};


export const containsPhoneNumber = (text: string): boolean => {
  
  const cleanText = text.replace(/[,;.!?]/g, ' ');
  
  return PHONE_PATTERNS.some(pattern => {
    const matches = cleanText.match(pattern);
    if (!matches) return false;
    
    
    return matches.some(match => {
      const digitsOnly = match.replace(/\D/g, '');
      
      return digitsOnly.length >= 8 && digitsOnly.length <= 15;
    });
  });
};


export const containsContactKeywords = (text: string): boolean => {
  return CONTACT_KEYWORDS.some(pattern => pattern.test(text));
};


export const validateMessage = (content: string): ValidationResult => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'Mensagem inválida' };
  }

  const text = content.trim();
  
  if (!text) {
    return { isValid: false, reason: 'Mensagem vazia' };
  }

  
  if (containsURL(text)) {
    return {
      isValid: false,
      reason: 'Não é permitido enviar links ou URLs no chat',
      detectedContent: 'URL/Link'
    };
  }

  
  if (containsPhoneNumber(text)) {
    return {
      isValid: false,
      reason: 'Não é permitido enviar números de telefone no chat',
      detectedContent: 'Número de telefone'
    };
  }

  
  if (containsContactKeywords(text) && /\d{8,}/.test(text.replace(/\D/g, ''))) {
    return {
      isValid: false,
      reason: 'Não é permitido compartilhar informações de contato externo',
      detectedContent: 'Informações de contato'
    };
  }

  return { isValid: true };
};

export default {
  validateMessage,
  containsURL,
  containsPhoneNumber,
  containsContactKeywords,
};
