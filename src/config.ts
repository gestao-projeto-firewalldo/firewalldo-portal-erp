export const appConfig = {
  appName: 'Firewalldo',
  appSubtitle: 'Portal de Desenvolvimento',
  version: 'Portal V1.9',
  dataSource: (import.meta.env.VITE_DATA_SOURCE ?? 'mock') as 'mock' | 'api',
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '/api',
  /** Latência simulada (ms) para exibir os estados de carregamento. */
  mockLatency: { min: 250, max: 650 },
  storageKey: 'firewalldo-portal:v4',
};

// Os atalhos do "Acesso rápido" são editados direto na Visão geral (settingsService.shortcuts()).
