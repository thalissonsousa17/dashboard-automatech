import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

async function fetchGeoData(): Promise<GeoData | null> {
  try {
    const res = await fetch(
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
    return null;
  } catch {
    console.warn('[AccessLog] Falha ao buscar geolocalização');
    return null;
  }
}

export function useAccessLog() {
  const logIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const registerAccess = useCallback(
    async (userId?: string, userEmail?: string, userName?: string) => {
      const [geoData, deviceInfo] = await Promise.all([
        fetchGeoData(),
        Promise.resolve(getDeviceInfo()),
      ]);

      const { data, error } = await db
        .from('access_logs')
        .insert({
          user_id: userId || null,
          user_email: userEmail || null,
          user_name: userName || null,
          ip_address: geoData?.ip || 'unknown',
          country: geoData?.country || null,
          country_code: geoData?.countryCode || null,
          region: geoData?.region || null,
          city: geoData?.city || null,
          latitude: geoData?.lat || null,
          longitude: geoData?.lon || null,
          timezone: geoData?.timezone || null,
          isp: geoData?.isp || null,
          user_agent: deviceInfo.userAgent,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          status: 'online',
        })
        .select('id')
        .single();

      if (error) {
        console.error('[AccessLog] Erro ao registrar acesso:', error);
        return;
      }

      logIdRef.current = data.id;

      // Heartbeat a cada 2 minutos para manter status online
      heartbeatRef.current = setInterval(async () => {
        if (logIdRef.current) {
          await db.rpc('update_last_seen', { p_log_id: logIdRef.current });
        }
      }, 2 * 60 * 1000);
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

  // Marca offline ao fechar a aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (logIdRef.current) {
        registerLogout();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [registerLogout]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return { registerAccess, registerLogout };
}
