import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';
import { env } from '../config/env';

export const oidcConfig: AuthProviderProps = {
  authority: env.VITE_AUTH_AUTHORITY,
  client_id: env.VITE_AUTH_CLIENT_ID,
  redirect_uri: env.VITE_AUTH_REDIRECT_URI,
  scope: 'openid profile email roles offline_access',
  response_type: 'code',
  loadUserInfo: true,
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
