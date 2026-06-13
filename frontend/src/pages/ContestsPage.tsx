import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { contestsApi } from '@/api/contests';
import type { ContestStatus, ContestSummary } from '@/types';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 12;

function ContestCard({ contest }: { contest: ContestSummary }) {
  return (
    <Link to={`/contests/${contest.id}`}>
      <Card className="h-full transition-colors hover:border-lc-orange/60">
        <CardContent className="p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug text-lc-text">{contest.title}</h3>
            {contest.status === 'LIVE' ? (
              <Badge variant="green">Live</Badge>
            ) : contest.status === 'UPCOMING' ? (
              <Badge variant="orange">Upcoming</Badge>
            ) : (
              <Badge>Finished</Badge>
            )}
          </div>

          <div className="mt-4 space-y-1.5 text-sm">
            {contest.status === 'UPCOMING' && (
              <CountdownTimer
                target={contest.startTime}
                prefix="Starts in"
                className="text-lc-orange"
              />
            )}
            {contest.status === 'LIVE' && (
              <CountdownTimer target={contest.endTime} prefix="Ends in" className="text-lc-green" />
            )}
            {contest.status === 'FINISHED' && (
              <div className="text-lc-muted">Ended {formatDateTime(contest.endTime)}</div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-lc-muted">
              <Users className="h-3.5 w-3.5" />
              {contest.participantCount} participants
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ContestsPage() {
  const [status, setStatus] = useState<ContestStatus>('UPCOMING');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contests', { status, page }],
    queryFn: () => contestsApi.list({ status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contests</h1>
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as ContestStatus);
            setPage(1);
          }}
        >
          <TabsList className="bg-lc-panel">
            <TabsTrigger value="UPCOMING">Upcoming</TabsTrigger>
            <TabsTrigger value="LIVE">Live</TabsTrigger>
            <TabsTrigger value="FINISHED">Finished</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading && <div className="py-20 text-center text-lc-muted">Loading contests…</div>}
      {isError && (
        <div className="py-20 text-center text-lc-red">
          Failed to load contests. Is the contests-service running?
        </div>
      )}
      {data?.items.length === 0 && (
        <div className="py-20 text-center text-lc-muted">No {status.toLowerCase()} contests.</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((contest) => (
          <ContestCard key={contest.id} contest={contest} />
        ))}
      </div>

      <div className="mt-6">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
