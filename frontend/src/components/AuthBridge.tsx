import { useEffect } from 'react';
import { setAccessTokenProvider, setOnUnauthorized } from '../api/client';
import { useAuth } from '../auth/useAuth';

export function AuthBridge() {
  const auth = useAuth();
  useEffect(() => {
    setAccessTokenProvider(() => auth.user?.access_token);
    setOnUnauthorized(() => {
      void auth.signinRedirect();
    });
  }, [auth]);
  return null;
}
