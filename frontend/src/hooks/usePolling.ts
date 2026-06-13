import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '@/api/submissions';

/**
 * Polls GET /v1/submissions/:id every second until status === "DONE".
 */
export function useSubmissionPolling(submissionId: string | null) {
  return useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => submissionsApi.get(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (query) => (query.state.data?.status === 'DONE' ? false : 1000),
  });
}
