import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/api/users';

export function useUpsertMyUser() {
  return useMutation({
    mutationFn: () => usersApi.getMe(),
  });
}
