import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── GPS localStorage keys ────────────────────────────────────────────────────
const GPS_GRANTED_KEY  = 'gps_granted';   // '1' quando o user já aceitou
const GPS_BLOCKED_KEY  = 'gps_blocked_at'; // timestamp (ms) quando bloqueou permanentemente
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function gpsIsGranted()  { return !!localStorage.getItem(GPS_GRANTED_KEY); }
function gpsIsBlocked()  {
  const t = localStorage.getItem(GPS_BLOCKED_KEY);
  return !!t && Date.now() - parseInt(t) < MONTH_MS;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface GeoData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;

  const deviceType: 'desktop' | 'mobile' | 'tablet' = /tablet|ipad|playbook|silk/i.test(ua)
    ? 'tablet'
    : /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)
    ? 'mobile'
    : 'desktop';

  const browser = /edg/i.test(ua)
    ? 'Edge'
    : /chrome/i.test(ua)
    ? 'Chrome'
    : /firefox/i.test(ua)
    ? 'Firefox'
    : /safari/i.test(ua)
    ? 'Safari'
    : /opera|opr/i.test(ua)
    ? 'Opera'
    : 'Unknown';

  const os = /windows/i.test(ua)
    ? 'Windows'
    : /mac os/i.test(ua)
    ? 'macOS'
    : /android/i.test(ua)
    ? 'Android'
    : /ios|iphone|ipad/i.test(ua)
    ? 'iOS'
    : /linux/i.test(ua)
    ? 'Linux'
    : 'Unknown';

  return { userAgent: ua, deviceType, browser, os };
}

/** Solicita GPS do browser e persiste o resultado no localStorage. */
async function fetchGpsCoords(): Promise<{ lat: number; lon: number } | null> {
  if (!('geolocation' in navigator)) return null;

  const gpsPromise = new Promise<{ lat: number; lon: number } | null>(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem(GPS_GRANTED_KEY, '1');
        localStorage.removeItem(GPS_BLOCKED_KEY);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      err => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          // Bloqueio permanente → grava timestamp; reperguntar após 30 dias
          localStorage.removeItem(GPS_GRANTED_KEY);
          localStorage.setItem(GPS_BLOCKED_KEY, String(Date.now()));
        }
        // código 2 (indisponível) ou 3 (timeout) → sem grava, tenta de novo no próximo login
        resolve(null);
      },
      {
        timeout: 10000,        // hint para o browser (alguns ignoram)
        maximumAge: 300000,    // aceita posição cacheada de até 5 min (resposta instantânea)
        enableHighAccuracy: true,
      },
    );
  });

  // Hard timeout no JS — garante resolução mesmo se o browser ignorar o timeout nativo
  const hardTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 12_000));

  return Promise.race([gpsPromise, hardTimeout]);
}

/** fetch com AbortSignal timeout — evita hanging de rede em mobile */
function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(id));
}

async function fetchGeoData(): Promise<GeoData | null> {
  // Tentativa 1: ipapi.co (sem chave, funciona em browsers de produção)
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.ip && !data.error) {
        return {
          ip: data.ip,
          country: data.country_name || data.country,
          countryCode: data.country,
          region: data.region || '',
          city: data.city || '',
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone || '',
          isp: data.org || '',
        };
      }
    }
  } catch { /* continua para fallback */ }

  // Tentativa 2: ipinfo.io (sem chave, 50k req/mês)
  try {
    const res = await fetchWithTimeout('https://ipinfo.io/json');
    if (res.ok) {
      const data = await res.json();
      if (data.ip && data.loc) {
        const [lat, lon] = data.loc.split(',').map(Number);
        // loc válido: coordenadas diferentes de 0,0 (null island)
        if (lat !== 0 || lon !== 0) {
          return {
            ip: data.ip,
            country: data.city ? `${data.city}, ${data.country}` : data.country,
            countryCode: data.country,
            region: data.region || '',
            city: data.city || '',
            lat,
            lon,
            timezone: data.timezone || '',
            isp: data.org || '',
          };
        }
      }
    }
  } catch { /* continua para fallback */ }

  // Tentativa 3: ipwho.is (sem chave, sem rate-limit severo)
  try {
    const res = await fetchWithTimeout('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.ip && data.latitude != null && data.longitude != null) {
        return {
          ip: data.ip,
          country: data.country,
          countryCode: data.country_code,
          region: data.region || '',
          city: data.city || '',
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone?.id || '',
          isp: data.connection?.isp || '',
        };
      }
    }
  } catch { /* continua para fallback */ }

  // Tentativa 4: ip-api.com (último recurso, tem rate-limit)
  try {
    const res = await fetchWithTimeout(
      'https://ip-api.com/json/?fields=status,country,countryCode,region,city,lat,lon,timezone,isp,query',
    );
    const data = await res.json();
    if (data.status === 'success') {
      return {
        ip: data.query,
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
      };
    }
  } catch { /* desiste */ }

  console.warn('[AccessLog] Falha ao buscar geolocalização em todos os providers');
  return null;
}

export function useAccessLog() {
  const logIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  // ─── Modal GPS ──────────────────────────────────────────────────────────────
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const gpsResolverRef = useRef<((allowed: boolean) => void) | null>(null);

  /** Chamado pelo modal quando o user clica em "Permitir" ou "Agora não". */
  const handleGpsModalResult = useCallback((allowed: boolean) => {
    setGpsModalOpen(false);
    gpsResolverRef.current?.(allowed);
    gpsResolverRef.current = null;
  }, []);

  /** Mostra o modal customizado e aguarda decisão (auto-false após 30s para evitar hanging). */
  const askGpsViaModal = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      gpsResolverRef.current = resolve;
      setGpsModalOpen(true);
      // Safety: se ninguém clicar em 30s, cancela e usa IP
      setTimeout(() => {
        if (gpsResolverRef.current === resolve) {
          gpsResolverRef.current = null;
          setGpsModalOpen(false);
          resolve(false);
        }
      }, 30_000);
    });
  }, []);

  // Mantém o access token atualizado para uso no beforeunload (keepalive)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  const registerAccess = useCallback(
    async (userId?: string, userEmail?: string, userName?: string): Promise<boolean> => {
      // ── Decide se usa GPS ──────────────────────────────────────────────────
      let tryGps = false;
      if (gpsIsGranted()) {
        tryGps = true; // já aceitou antes → usa direto, sem modal
      } else if (!gpsIsBlocked()) {
        // Nunca respondeu, ou negou (sem bloqueio perm.) → mostra modal
        tryGps = await askGpsViaModal();
      }
      // gpsIsBlocked() → dentro do mês de bloqueio → pula GPS silenciosamente

      // GPS e IP em paralelo — GPS tem prioridade nas coordenadas, IP fornece cidade/país/ISP
      const [gpsCoords, geoData, deviceInfo] = await Promise.all([
        tryGps ? fetchGpsCoords() : Promise.resolve(null),
        fetchGeoData(),
        Promise.resolve(getDeviceInfo()),
      ]);

      // Usa coordenadas do GPS se disponível, senão cai nas coordenadas do IP
      const lat = gpsCoords?.lat ?? (geoData?.lat ?? null);
      const lon = gpsCoords?.lon ?? (geoData?.lon ?? null);

      // Gera UUID client-side para evitar .select() após insert
      // (não-admins têm policy INSERT mas não SELECT — o select pós-insert falha com RLS)
      const newLogId = crypto.randomUUID();

      const { error } = await db
        .from('access_logs')
        .insert({
          id: newLogId,
          user_id: userId || null,
          user_email: userEmail || null,
          user_name: userName || null,
          ip_address: geoData?.ip || 'unknown',
          country: geoData?.country || null,
          country_code: geoData?.countryCode || null,
          region: geoData?.region || null,
          city: geoData?.city || null,
          latitude: lat,
          longitude: lon,
          timezone: geoData?.timezone || null,
          isp: geoData?.isp || null,
          user_agent: deviceInfo.userAgent,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          status: 'online',
        });

      if (error) {
        console.error('[AccessLog] Erro ao registrar acesso:', error);
        return false;
      }

      logIdRef.current = newLogId;

      // Heartbeat a cada 2 minutos para manter status online
      heartbeatRef.current = setInterval(async () => {
        if (logIdRef.current) {
          await db.rpc('update_last_seen', { p_log_id: logIdRef.current });
        }
      }, 2 * 60 * 1000);

      return true;
    },
    [],
  );

  const registerLogout = useCallback(async () => {
    if (!logIdRef.current) return;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    await db.rpc('mark_user_offline', { p_log_id: logIdRef.current });
    logIdRef.current = null;
  }, []);

  // Marca offline ao fechar a aba usando fetch com keepalive (não é cancelado pelo browser)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!logIdRef.current || !tokenRef.current || !SUPABASE_URL) return;

      // Limpa heartbeat imediatamente
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // keepalive: true garante que o browser complete a requisição mesmo fechando a aba
      fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_user_offline`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ p_log_id: logIdRef.current }),
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return { registerAccess, registerLogout, gpsModalOpen, handleGpsModalResult };
}
