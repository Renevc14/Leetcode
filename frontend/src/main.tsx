import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from 'react-oidc-context';
import { oidcConfig } from './auth/oidc-config';
import { AuthBootstrap } from './auth/AuthBootstrap';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <AuthBootstrap>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AuthBootstrap>
    </AuthProvider>
  </StrictMode>,
);
