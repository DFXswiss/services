import { useEffect, useMemo, useState } from 'react';

interface GeoLocationResult {
  IPv4: string;
  city: string;
  postal: string;
  state: string;
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
}

export interface GeoLocationInterface {
  ip?: string;
  city?: string;
  zip?: string;
  state?: string;
  countryCode?: string;
  countryName?: string;
}

export function useGeoLocation(): GeoLocationInterface {
  const [result, setResult] = useState<GeoLocationInterface>({});

  useEffect(() => {
    fetch('https://geolocation-db.com/json/')
      .then((response) => {
        if (response.ok) {
          response.json().then((r: GeoLocationResult) =>
            setResult({
              ip: r.IPv4,
              city: r.city,
              zip: r.postal,
              state: r.state,
              countryCode: r.country_code,
              countryName: r.country_name,
            }),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  return useMemo(() => result, [result]);
}
