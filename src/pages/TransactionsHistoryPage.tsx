import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, RefreshCw, Wallet, ArrowDown, ArrowUp, DollarSign, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { walletService } from '../services';
import notificationWebSocketService from '../services/notificationWebSocketService';
import { formatCurrency } from '../utils/currency';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

const easeBezier: [number, number, number, number] = [0.22, 1, 0.36, 1];


const ApexBarChart: React.FC<{ categories: string[]; series: number[]; height?: number }>
  = ({ categories, series, height = 240 }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ApexCharts = (window as any)?.ApexCharts;
    if (!ApexCharts || !ref.current) return;

    const chart = new ApexCharts(ref.current, {
      chart: {
        type: 'bar',
        height,
        background: 'transparent',
        foreColor: '#CBD5E1',
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 700,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 }
        }
      },
      theme: { mode: 'dark' },
      grid: { borderColor: 'rgba(255,255,255,0.08)' },
      plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '45%' } },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: { style: { colors: '#CBD5E1' } }
      },
      yaxis: { labels: { style: { colors: '#94A3B8' } } },
      colors: ['#10B981', '#EF4444', '#60A5FA', '#A78BFA'],
      series: [{ name: 'Qtd', data: series }]
    });
    chart.render();
    return () => { try { chart.destroy(); } catch {} };
  }, [categories.join('|'), series.join(',')]);
  return <div ref={ref} />;
};

const ApexAreaChart: React.FC<{ categories: string[]; series: number[]; height?: number }>
  = ({ categories, series, height = 240 }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ApexCharts = (window as any)?.ApexCharts;
    if (!ApexCharts || !ref.current) return;

    const chart = new ApexCharts(ref.current, {
      chart: {
        type: 'area',
        height,
        background: 'transparent',
        foreColor: '#CBD5E1',
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 700,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 }
        }
      },
      theme: { mode: 'dark' },
      grid: { borderColor: 'rgba(255,255,255,0.08)' },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: { rotate: -45, style: { colors: '#CBD5E1' } },
        axisTicks: { show: false },
        axisBorder: { show: false }
      },
      yaxis: { labels: { style: { colors: '#94A3B8' } } },
      colors: ['#7C3AED'],
      series: [{ name: 'Movimentações/dia', data: series }]
    });
    chart.render();
    return () => { try { chart.destroy(); } catch {} };
  }, [categories.join('|'), series.join(',')]);
  return <div ref={ref} />;
};

const TransactionsHistoryPage: React.FC = () => {
  const navigate = useNavigate();


  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const PERIOD_DAYS = 7;
  const [selectedType, setSelectedType] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);


  const PAGE_LIMIT = 6;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await walletService.getWallet(page, PAGE_LIMIT, selectedType || undefined);
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, selectedType]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);


  useEffect(() => {
    const onBalance = () => setRefreshTrigger((v) => v + 1);
    const onNotif = () => setRefreshTrigger((v) => v + 1);
    notificationWebSocketService.on('wallet_balance_updated', onBalance);
    notificationWebSocketService.on('new_notification', onNotif);
    return () => {
      notificationWebSocketService.off('wallet_balance_updated', onBalance);
      notificationWebSocketService.off('new_notification', onNotif);
    };
  }, []);

  const chartData = useMemo(() => {

    const now = Date.now();
    const cutoff = now - PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const counts: Record<string, number> = { deposit: 0, withdrawal: 0, purchase: 0, sale: 0 };
    transactions.forEach((t) => {
      const tms = new Date(t.createdAt).getTime();
      if (tms >= cutoff) {
        counts[t.type] = (counts[t.type] || 0) + 1;
      }
    });
    const maxVal = Math.max(1, ...Object.values(counts));
    return { counts, maxVal };
  }, [transactions]);

  const typeCategories = useMemo(() => ['Depósitos', 'Saques', 'Compras', 'Vendas'], []);
  const typeSeries = useMemo(() => [
    chartData.counts.deposit,
    chartData.counts.withdrawal,
    chartData.counts.purchase,
    chartData.counts.sale
  ], [chartData]);

  const weeklySeries = useMemo(() => {

    const WEEKS = 8;
    const labels: string[] = [];
    const data: number[] = [];
    const startOfWeek = (d: Date) => {
      const c = new Date(d);
      const dow = c.getDay();
      const diff = (dow === 0 ? -6 : 1) - dow;
      c.setDate(c.getDate() + diff);
      c.setHours(0, 0, 0, 0);
      return c;
    };
    const endOfWeek = (s: Date) => {
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return e;
    };
    const map = new Map<string, number>();
    const today = new Date();

    for (let i = WEEKS - 1; i >= 0; i--) {
      const ref = new Date(today);
      ref.setDate(ref.getDate() - i * 7);
      const s = startOfWeek(ref);
      const e = endOfWeek(s);
      const key = s.toISOString().slice(0, 10);
      labels.push(`${s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}–${e.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);
      map.set(key, 0);
    }

    transactions.forEach((t) => {
      const d = new Date(t.createdAt);
      const s = startOfWeek(d);
      const key = s.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });

    const today2 = new Date();
    for (let i = WEEKS - 1; i >= 0; i--) {
      const ref = new Date(today2);
      ref.setDate(ref.getDate() - i * 7);
      const s = startOfWeek(ref);
      const key = s.toISOString().slice(0, 10);
      data.push(map.get(key) || 0);
    }
    return { labels, data };
  }, [transactions]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDown className="w-4 h-4" />;
      case 'withdrawal': return <ArrowUp className="w-4 h-4" />;
      case 'sale': return <ArrowDown className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const statusToPtBr = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pedding':
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  return (
    <div className="history-page min-h-screen overflow-hidden bg-gray-900">
      {}
      <div className="bg-gray-900/60 backdrop-blur-sm border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/wallet')}
            className="inline-flex items-center text-gray-300 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Carteira</span>
          </button>
          <div className="flex items-center space-x-3 bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700/50">
            <BarChart3 className="w-5 h-5 text-gray-300" />
            <span className="text-sm font-medium text-gray-300">Histórico de Transações</span>
          </div>
        </div>
      </div>

      {}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="overflow-hidden p-6 bg-gray-800/60 border-gray-700/60">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <BarChart3 className="w-5 h-5" />
                  <span>Distribuição por tipo</span>
                </div>
                <div className="text-xs text-gray-400">Últimos 7 dias</div>
              </div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: easeBezier }}>
                <ApexBarChart categories={typeCategories} series={typeSeries} height={240} />
              </motion.div>

              <div className="mt-6 mb-3 flex items-center gap-2 text-white font-semibold">
                <BarChart3 className="w-5 h-5" />
                <span>Atividade semanal</span>
              </div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: easeBezier }}>
                <ApexAreaChart categories={weeklySeries.labels} series={weeklySeries.data} height={240} />
              </motion.div>
            </Card>
          </div>

          {}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="p-6 bg-gray-800/60 border-gray-700/60">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Wallet className="w-5 h-5" />
                  <span>Transações</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={selectedType}
                    onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="deposit">Depósitos</option>
                    <option value="withdrawal">Saques</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRefreshing(true); setRefreshTrigger(v => v + 1); setTimeout(() => setRefreshing(false), 600); }}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${refreshing || loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t) => {
                    const isWithdraw = t.type === 'withdrawal';
                    const s = (t.status || '').toLowerCase();
                    const isCompleted = s === 'completed';
                    const isFailed = s === 'failed';
                    const isPending = s === 'pending' || s === 'pedding';
                    const isCancelled = s === 'cancelled';
                    const isOverdue = s === 'overdue';

                    const containerTint = isCompleted
                      ? 'border-emerald-600/30'
                      : isFailed
                        ? 'border-red-600/30'
                        : isPending
                          ? 'border-yellow-600/30'
                          : isCancelled
                            ? 'border-gray-600/40'
                            : 'border-gray-700/60';

                    const iconWrap = isCompleted
                      ? 'bg-emerald-900/20 text-emerald-400'
                      : isFailed
                        ? 'bg-red-900/20 text-red-400'
                        : isPending
                          ? 'bg-yellow-900/20 text-yellow-400'
                          : isWithdraw
                            ? 'bg-red-900/20 text-red-400'
                            : 'bg-emerald-900/20 text-emerald-400';

                    const amountClass = isCompleted
                      ? (isWithdraw ? 'text-red-400' : 'text-emerald-400')
                      : isFailed
                        ? 'text-red-300 line-through opacity-70'
                        : isPending
                          ? (isWithdraw ? 'text-red-300' : 'text-emerald-300')
                          : (isWithdraw ? 'text-red-400' : 'text-emerald-400');

                    const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : isPending ? Clock : null;
                    const badgeClass = isCompleted
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : isFailed
                        ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                        : isPending
                          ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                          : isCancelled
                            ? 'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                            : isOverdue
                              ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                              : 'bg-gray-500/10 text-gray-300 border border-gray-500/30';

                    return (
                      <div key={t._id} className={`flex items-center justify-between p-4 rounded-lg bg-gray-700/40 border ${containerTint}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconWrap}`}>
                            {getIcon(t.type)}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                              {t.description}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                                {StatusIcon ? <StatusIcon className="w-3.5 h-3.5" /> : null}
                                {statusToPtBr(t.status)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('pt-BR')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${amountClass}`}>
                            {(t.type === 'deposit' || t.type === 'sale' ? '+' : '-')}
                            {formatCurrency(Math.abs(t.amount), true)}
                          </div>
                          {isFailed && (
                            <div className="text-[10px] text-red-300/80">Não debitado</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-3">
                  <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <span className="text-gray-400 text-sm">Página {page} de {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsHistoryPage;
