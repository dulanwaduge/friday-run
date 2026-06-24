import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

type PublicConfig = {
  googleMapsApiKey: string | null;
};

let cachedConfig: PublicConfig | null = null;
let pendingConfig: Promise<PublicConfig> | null = null;

async function loadPublicConfig() {
  if (cachedConfig) return cachedConfig;
  if (!pendingConfig) {
    pendingConfig = fetch(`${API_BASE}/config/public`, { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load app configuration");
        return response.json() as Promise<PublicConfig>;
      })
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .finally(() => {
        pendingConfig = null;
      });
  }
  return pendingConfig;
}

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(cachedConfig);

  useEffect(() => {
    let active = true;
    loadPublicConfig()
      .then((nextConfig) => {
        if (active) setConfig(nextConfig);
      })
      .catch(() => {
        if (active) setConfig({ googleMapsApiKey: null });
      });
    return () => {
      active = false;
    };
  }, []);

  return config;
}
