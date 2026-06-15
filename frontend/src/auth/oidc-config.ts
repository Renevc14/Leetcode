import { WebStorageStateStore, InMemoryWebStorage } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

const memoryStore = new InMemoryWebStorage();

const AUTHORITY =
  (import.meta.env.VITE_OIDC_AUTHORITY as string | undefined) ??
  'http://localhost:9000/application/o/leetcode';

// Authentik responde 500 al discovery doc cuando el browser envia Origin con
// CORS, asi que servimos la metadata estatica para evitar la llamada.
const metadata = {
  issuer: `${AUTHORITY}/`,
  authorization_endpoint: 'http://localhost:9000/application/o/authorize/',
  token_endpoint: 'http://localhost:9000/application/o/token/',
  userinfo_endpoint: 'http://localhost:9000/application/o/userinfo/',
  end_session_endpoint: `${AUTHORITY}/end-session/`,
  jwks_uri: `${AUTHORITY}/jwks/`,
  revocation_endpoint: 'http://localhost:9000/application/o/revoke/',
};

export const oidcConfig: AuthProviderProps = {
  authority: AUTHORITY,
  metadata,
  client_id: (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ?? 'leetcode',
  redirect_uri:
    (import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined) ??
    `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope:
    'openid profile email roles submissions:write submissions:read problems:write problems:admin contests:write contests:manage contests:participate solutions:read executor:execute admin:all',
  loadUserInfo: false,
  automaticSilentRenew: true,
  monitorSession: false,
  // Tokens (userStore) viven en memoria conforme al requerimiento 4.3.
  // El stateStore guarda el state CSRF + code_verifier PKCE que necesitan
  // sobrevivir el redirect a Authentik y vuelta. Va en sessionStorage
  // porque es efimero (se limpia al cerrar tab) y no es un token.
  userStore: new WebStorageStateStore({ store: memoryStore }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
