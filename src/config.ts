export const appConfig = {
  appName: 'Firewalldo',
  appSubtitle: 'Portal de Desenvolvimento',
  version: 'Portal V1.8',
  dataSource: (import.meta.env.VITE_DATA_SOURCE ?? 'mock') as 'mock' | 'api',
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '/api',
  /** Latência simulada (ms) para exibir os estados de carregamento. */
  mockLatency: { min: 250, max: 650 },
  storageKey: 'firewalldo-portal:v3',
};

// Os atalhos do "Acesso rápido" agora ficam no estado (Configurações → Integrações),
// servidos por settingsService.shortcuts() — ver src/services/index.ts.
