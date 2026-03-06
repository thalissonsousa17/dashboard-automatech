import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Globe, Clock, Download, RefreshCw,
  Monitor, Smartphone, Tablet, Wifi, WifiOff,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AccessLog {
  id: string;
  user_email: string | null;
  user_name: string | null;
  ip_address: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | null;
  browser: string | null;
  os: string | null;
  status: 'online' | 'offline';
  logged_in_at: string;
  logged_out_at: string | null;
  last_seen_at: string;
}

interface CountryStat {
  country: string;
  country_code: string;
  total_accesses: number;
  unique_users: number;
  currently_online: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DeviceIcon = ({ type }: { type: string | null }) => {
  if (type === 'mobile') return <Smartphone size={14} className="inline mr-1" />;
  if (type === 'tablet') return <Tablet size={14} className="inline mr-1" />;
  return <Monitor size={14} className="inline mr-1" />;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const flagEmoji = (code: string | null) => {
  if (!code) return '🌍';
  try {
    return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
  } catch { return '🌍'; }
};

// ─── Mapa Leaflet puro (sem react-leaflet) ───────────────────────────────────

function LeafletMap({ logs }: { logs: AccessLog[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Importa Leaflet dinamicamente para evitar problemas de SSR/bundle
    import('leaflet').then(({ default: L }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, { center: [20, 0], zoom: 2 });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
      }).addTo(map);

      const points: [number, number][] = [];

      logs.filter(l => l.latitude && l.longitude).forEach(log => {
        const color = log.status === 'online' ? '#4ade80' : '#f87171';
        const borderColor = log.status === 'online' ? '#22c55e' : '#ef4444';

        const marker = L.circleMarker([log.latitude!, log.longitude!], {
          radius: log.status === 'online' ? 9 : 6,
          color: borderColor,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2,
        });

        marker.bindPopup(`
          <div style="min-width:180px;font-size:13px;">
            <b style="font-size:14px;">${flagEmoji(log.country_code)} ${log.city || '—'}, ${log.country || '—'}</b><br/>
            <b>Usuário:</b> ${log.user_name || log.user_email || 'Anônimo'}<br/>
            <b>IP:</b> ${log.ip_address}<br/>
            ${log.browser || ''} / ${log.os || ''}<br/>
            <span style="color:${log.status === 'online' ? '#16a34a' : '#dc2626'};font-weight:600;">
              ${log.status === 'online' ? '● Online' : '○ Offline'}
            </span><br/>
            <span style="color:#9ca3af;font-size:11px;">Login: ${formatDate(log.logged_in_at)}</span>
          </div>
        `);

        marker.addTo(map);
        points.push([log.latitude!, log.longitude!]);
      });

      if (points.length > 0) {
        map.fitBounds(points, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza marcadores quando logs mudam sem recriar o mapa
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove camadas antigas (exceto TileLayer)
    map.eachLayer((layer: any) => {
      if (layer._latlng) map.removeLayer(layer);
    });

    import('leaflet').then(({ default: L }) => {
      const points: [number, number][] = [];
      logs.filter(l => l.latitude && l.longitude).forEach(log => {
        const color = log.status === 'online' ? '#4ade80' : '#f87171';
        const borderColor = log.status === 'online' ? '#22c55e' : '#ef4444';
        const marker = L.circleMarker([log.latitude!, log.longitude!], {
          radius: log.status === 'online' ? 9 : 6,
          color: borderColor, fillColor: color, fillOpacity: 0.8, weight: 2,
        });
        marker.bindPopup(`
          <div style="min-width:180px;font-size:13px;">
            <b>${flagEmoji(log.country_code)} ${log.city || '—'}, ${log.country || '—'}</b><br/>
            <b>Usuário:</b> ${log.user_name || log.user_email || 'Anônimo'}<br/>
            <b>IP:</b> ${log.ip_address}<br/>
            <span style="color:${log.status === 'online' ? '#16a34a' : '#dc2626'};font-weight:600;">
              ${log.status === 'online' ? '● Online' : '○ Offline'}
            </span>
          </div>
        `);
        marker.addTo(map);
        points.push([log.latitude!, log.longitude!]);
      });
      if (points.length > 0) map.fitBounds(points, { padding: [40, 40] });
    });
  }, [logs]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height: '100%', width: '100%', background: '#1a1a2e' }} />
    </>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function AccessMapDashboard() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'history'>('map');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: logsData }, { data: statsData }] = await Promise.all([
        db.from('access_logs').select('*').order('logged_in_at', { ascending: false }).limit(500),
        db.from('access_stats_by_country').select('*'),
      ]);
      if (logsData) setLogs(logsData);
      if (statsData) setCountryStats(statsData);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('access-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_logs' }, () => fetchData())
      .subscribe();
    const interval = setInterval(fetchData, 30_000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [fetchData]);

  const filteredLogs = logs.filter(log => {
    const matchStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchSearch =
      !searchTerm ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  const onlineCount = logs.filter(l => l.status === 'online').length;
  const uniqueCountries = new Set(logs.map(l => l.country).filter(Boolean)).size;
  const last24h = logs.filter(l => new Date(l.logged_in_at) > new Date(Date.now() - 86_400_000)).length;

  const exportCSV = () => {
    const headers = ['ID', 'Usuário', 'Email', 'IP', 'País', 'Cidade', 'Dispositivo', 'Browser', 'OS', 'Status', 'Login', 'Logout'];
    const rows = filteredLogs.map(l => [
      l.id, l.user_name || '-', l.user_email || '-', l.ip_address,
      l.country || '-', l.city || '-', l.device_type || '-',
      l.browser || '-', l.os || '-', l.status,
      formatDate(l.logged_in_at), l.logged_out_at ? formatDate(l.logged_out_at) : '-',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `acessos-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-100 rounded-xl overflow-hidden">
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="text-cyan-400" size={24} />
              Monitor de Acessos Global
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm transition-colors">
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Wifi className="text-green-400" size={18} />} label="Online agora" value={onlineCount} color="green" />
          <StatCard icon={<Users className="text-cyan-400" size={18} />} label="Total acessos" value={logs.length} color="cyan" />
          <StatCard icon={<Globe className="text-purple-400" size={18} />} label="Países" value={uniqueCountries} color="purple" />
          <StatCard icon={<Clock className="text-yellow-400" size={18} />} label="Últimas 24h" value={last24h} color="yellow" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-lg w-fit">
          {(['map', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {tab === 'map' ? '🗺️ Mapa' : '📋 Histórico'}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input type="text" placeholder="Buscar por usuário, país, cidade ou IP..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500" />
          <div className="flex gap-2">
            {(['all', 'online', 'offline'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === s
                    ? s === 'online' ? 'bg-green-600 text-white' : s === 'offline' ? 'bg-red-700 text-white' : 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {s === 'all' ? 'Todos' : s === 'online' ? '🟢 Online' : '🔴 Offline'}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        {activeTab === 'map' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-gray-900 rounded-xl overflow-hidden border border-gray-800" style={{ height: 460 }}>
              <LeafletMap logs={filteredLogs} />
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" /> Top Países
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-96">
                {countryStats.slice(0, 15).map(stat => (
                  <div key={stat.country_code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{flagEmoji(stat.country_code)}</span>
                      <span className="text-sm text-gray-300 truncate">{stat.country || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs ml-2">
                      {stat.currently_online > 0 && <span className="text-green-400 font-medium">{stat.currently_online} 🟢</span>}
                      <span className="text-gray-500">{stat.total_accesses} total</span>
                    </div>
                  </div>
                ))}
                {countryStats.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Sem dados ainda</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Usuário</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Localização</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">IP</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Dispositivo</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Login</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Logout</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-500">{loading ? 'Carregando...' : 'Nenhum registro encontrado'}</td></tr>
                  ) : filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        {log.status === 'online'
                          ? <span className="flex items-center gap-1 text-green-400 font-medium"><Wifi size={14} /> Online</span>
                          : <span className="flex items-center gap-1 text-red-400"><WifiOff size={14} /> Offline</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-200">{log.user_name || 'Anônimo'}</p>
                        <p className="text-gray-500 text-xs">{log.user_email || '—'}</p>
                      </td>
                      <td className="px-4 py-3"><span className="text-base mr-1">{flagEmoji(log.country_code)}</span>{log.city && `${log.city}, `}{log.country || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.ip_address}</td>
                      <td className="px-4 py-3 text-gray-400"><DeviceIcon type={log.device_type} />{log.browser} / {log.os}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.logged_in_at)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{log.logged_out_at ? formatDate(log.logged_out_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
                Exibindo {filteredLogs.length} de {logs.length} registros
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'green' | 'cyan' | 'purple' | 'yellow'; }) {
  const borders: Record<string, string> = { green: 'border-green-900/50', cyan: 'border-cyan-900/50', purple: 'border-purple-900/50', yellow: 'border-yellow-900/50' };
  return (
    <div className={`bg-gray-900 border ${borders[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-gray-400 text-xs">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}
