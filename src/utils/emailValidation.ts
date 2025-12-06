


const TRUSTED_EMAIL_PROVIDERS = [
  
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  
  
  'yahoo.com',
  'yahoo.com.br',
  'ymail.com',
  'rocketmail.com',
  
  
  'icloud.com',
  'me.com',
  'mac.com',
  
  
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'tutamail.com',
  
  
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'aol.com',
  
  
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'globo.com',
  'globomail.com',
];


export function isEmailFromTrustedProvider(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return false;
  }

  
  if (TRUSTED_EMAIL_PROVIDERS.includes(domain)) {
    return true;
  }

  
  if (domain.endsWith('.edu') || domain.endsWith('.edu.br') || domain.endsWith('.ac.uk')) {
    return true;
  }

  
  for (const provider of TRUSTED_EMAIL_PROVIDERS) {
    if (domain.endsWith('.' + provider)) {
      return true;
    }
  }

  return false;
}


export function getUntrustedEmailMessage(email: string): string {
  const domain = email.split('@')[1];
  return `O domínio "${domain}" não é permitido. Use um provedor confiável como Gmail, Outlook, Yahoo, etc.`;
}


export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
