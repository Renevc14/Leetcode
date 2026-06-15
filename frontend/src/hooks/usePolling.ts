import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '@/api/submissions';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Polls GET /v1/submissions/:id every second until status === "DONE".
 * Solo activa el polling si el id parece un UUID — los ids sinteticos
 * de Run no son UUID y el backend Smithy los rechaza con validacion.
 */
export function useSubmissionPolling(submissionId: string | null) {
  const isUuid = !!submissionId && UUID_RE.test(submissionId);
  return useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => submissionsApi.get(submissionId!),
    enabled: isUuid,
    refetchInterval: (query) => (query.state.data?.status === 'DONE' ? false : 1000),
  });
}
