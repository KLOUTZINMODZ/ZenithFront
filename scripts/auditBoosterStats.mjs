#!/usr/bin/env node
/**
 * CLI auxiliar para auditar o motivo de "0 boosts concluídos".
 * Ele busca o payload de propostas de um boosting e cruza com o endpoint
 * de perfil de usuário (totalSales) para identificar divergências.
 */
import axios from 'axios';

const usage = `\nUso: node scripts/auditBoosterStats.mjs <boostingId> [opções]\n\nOpções:\n  --api=<url>       Base URL da API de boosting (default: VITE_API_URL ou https://zenith.enrelyugi.com.br/api/v1)\n  --userApi=<url>   Base URL da API de usuários (default: USER_API_URL ou https://zenithggapi.vercel.app/api/v1)\n  --token=<jwt>     Token JWT para chamadas autenticadas (ou defina API_TOKEN / VITE_API_TOKEN)\n  --json            Saída em JSON ao invés de texto\n  --help            Exibe esta ajuda\n`;

const args = process.argv.slice(2);
const positional = [];
const options = {};

for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, rawValue] = arg.slice(2).split('=');
    options[key] = rawValue !== undefined ? rawValue : true;
  } else {
    positional.push(arg);
  }
}

if (options.help) {
  console.log(usage);
  process.exit(0);
}

const boostingId = options.boosting || positional[0];

if (!boostingId) {
  console.error('Erro: informe o boostingId.');
  console.log(usage);
  process.exit(1);
}

const apiBase = (options.api || process.env.VITE_API_URL || 'https://zenith.enrelyugi.com.br/api/v1').replace(/\/$/, '');
const userApiBase = (options.userApi || process.env.USER_API_URL || 'https://zenithggapi.vercel.app/api/v1').replace(/\/$/, '');
const token = options.token || process.env.API_TOKEN || process.env.VITE_API_TOKEN || null;
const pretty = !options.json;

const boostingApi = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
});

const userApi = axios.create({
  baseURL: userApiBase,
  headers: {
    'Content-Type': 'application/json'
  }
});

const safeNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const getBoosterIdentifier = (proposal) => {
  if (proposal?.boosterId) return String(proposal.boosterId);
  if (proposal?.booster?.userid) return String(proposal.booster.userid);
  return null;
};

const getCompletedFromPayload = (booster = {}) => {
  const candidates = [
    booster.totalBoosts,
    booster.completedBoosts,
    booster.statistics?.completedBoosts,
    booster.statistics?.boostsCompleted,
    booster.statistics?.totalBoosts,
    booster.statistics?.successfulOrders,
    booster.statistics?.deliveredOrders,
    booster.statistics?.totalOrders
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return 0;
};

const fetchBoosterProfile = async (boosterId) => {
  if (!boosterId) return null;
  try {
    const { data } = await userApi.get(`/users/${boosterId}`);
    if (data && typeof data === 'object') {
      if (data.success === false) {
        throw new Error(data.message || 'Resposta sem sucesso ao buscar usuário');
      }
      return data.data || data;
    }
    return data;
  } catch (error) {
    return {
      error: true,
      message: error?.response?.data?.message || error.message || 'Falha ao buscar usuário',
      status: error?.response?.status
    };
  }
};

const buildDiagnosis = (payloadValue, userValue, profileResponse) => {
  if (profileResponse?.error) {
    return `Não foi possível consultar userService (${profileResponse.status || 'erro'}: ${profileResponse.message})`;
  }
  if (typeof userValue === 'number') {
    if (userValue > 0 && payloadValue === 0) {
      return 'Divergência detectada: payload trouxe 0, mas totalSales indica histórico. Atualize frontend/backend para usar totalSales.';
    }
    if (userValue === payloadValue) {
      return 'Ambas as fontes concordam. O resultado "0 boosts" é o que o backend realmente fornece.';
    }
    return `Dados diferentes: payload=${payloadValue} vs userService=${userValue}. Verificar origem e normalizar.`;
  }
  if (payloadValue === 0) {
    return 'Somente o payload foi analisado e retornou 0. Sem outra fonte disponível, este é o valor real.';
  }
  return 'Sem dados suficientes para diagnóstico.';
};

const main = async () => {
  const { data } = await boostingApi.get(`/boosting-requests/${boostingId}/proposals`);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Resposta inesperada ao buscar propostas');
  }

  const proposals = Array.isArray(data.data.proposals) ? data.data.proposals : [];
  const uniqueBoosters = new Map();

  proposals.forEach((proposal) => {
    const boosterId = getBoosterIdentifier(proposal);
    if (!uniqueBoosters.has(boosterId || proposal?._id)) {
      uniqueBoosters.set(boosterId || proposal?._id, {
        boosterId,
        booster: proposal.booster,
        proposals: []
      });
    }
    uniqueBoosters.get(boosterId || proposal?._id)?.proposals.push(proposal);
  });

  const boosterReports = [];
  for (const [key, entry] of uniqueBoosters.entries()) {
    const profile = await fetchBoosterProfile(entry.boosterId);
    const payloadValue = getCompletedFromPayload(entry.booster);
    const totalSales = safeNumber(profile?.totalSales);
    boosterReports.push({
      boosterId: entry.boosterId || key,
      boosterName: entry.booster?.name || 'Desconhecido',
      proposals: entry.proposals.length,
      payload: {
        totalBoosts: safeNumber(entry.booster?.totalBoosts),
        completedBoosts: safeNumber(entry.booster?.completedBoosts),
        statistics: entry.booster?.statistics || null
      },
      resolvedFrontend: payloadValue,
      userService: totalSales,
      diagnosis: buildDiagnosis(payloadValue, totalSales, profile)
    });
  }

  if (options.json) {
    console.log(JSON.stringify({
      boostingId,
      proposals: proposals.length,
      boosters: boosterReports
    }, null, 2));
    return;
  }

  console.log(`Boosting ID: ${boostingId}`);
  console.log(`Total de propostas: ${proposals.length}`);
  console.log(`Total de boosters únicos: ${boosterReports.length}`);
  console.log('='.repeat(80));
  boosterReports.forEach((report, index) => {
    console.log(`#${index + 1} Booster: ${report.boosterName} (ID: ${report.boosterId || 'n/d'})`);
    console.log(`   Propostas vinculadas: ${report.proposals}`);
    console.log(`   Payload → totalBoosts=${report.payload.totalBoosts ?? 'n/d'}, completedBoosts=${report.payload.completedBoosts ?? 'n/d'}`);
    console.log(`   Payload statistics: ${report.payload.statistics ? JSON.stringify(report.payload.statistics) : 'n/d'}`);
    console.log(`   Valor resolvido no frontend: ${report.resolvedFrontend}`);
    console.log(`   userService.totalSales: ${report.userService ?? 'n/d'}`);
    console.log(`   Diagnóstico: ${report.diagnosis}`);
    console.log('-'.repeat(80));
  });

  if (!boosterReports.length) {
    console.log('Nenhuma proposta encontrada para este boosting.');
  }
};

main().catch((error) => {
  console.error('Falha ao executar auditoria de boosters.');
  console.error(error?.response?.data || error.message || error);
  process.exit(1);
});
