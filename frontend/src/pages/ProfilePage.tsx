import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { submissionsApi } from '@/api/submissions';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { VerdictBadge } from '@/components/VerdictBadge';
import { Pagination } from '@/components/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 15;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-lc-muted">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-lc-text">{value}</div>
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [page, setPage] = useState(1);
  const sessionUser = useAuthStore((s) => s.user);
  const isOwnProfile = sessionUser?.id === userId;

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUser(userId!),
    enabled: !!userId,
  });

  // Endpoint real: GET /v1/users/{userId}/stats
  const statsQuery = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => usersApi.getStats(userId!),
    enabled: !!userId,
  });

  const submissionsQuery = useQuery({
    queryKey: ['submissions', { userId, page }],
    queryFn: () => submissionsApi.list({ userId, page, pageSize: PAGE_SIZE }),
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });

  const user = userQuery.data;
  const stats = statsQuery.data;
  const solved = stats
    ? stats.solvedByDifficulty.easy +
      stats.solvedByDifficulty.medium +
      stats.solvedByDifficulty.hard
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {userQuery.isError ? (
        <div className="py-20 text-center text-lc-red">User not found.</div>
      ) : (
        <>
          <div className="mb-8 flex items-center gap-5">
            <Avatar name={user?.username ?? '?'} size="lg" />
            <div>
              <h1 className="text-2xl font-semibold">{user?.username ?? '…'}</h1>
              {isOwnProfile && sessionUser?.email && (
                <p className="text-sm text-lc-muted">{sessionUser.email}</p>
              )}
              <p className="mt-1 text-xs text-lc-muted">Joined {formatDate(user?.createdAt)}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Submissions" value={stats?.totalSubmissions ?? '—'} />
            <StatCard label="Problems Solved" value={stats ? solved : '—'} />
            <StatCard label="Acceptance" value={stats ? `${stats.acceptanceRate}%` : '—'} />
            <StatCard label="Contests Played" value={stats?.contestsPlayed ?? '—'} />
          </div>

          {stats && (
            <Card className="mb-8">
              <CardContent className="flex flex-wrap items-center gap-6 p-4">
                <span className="text-xs uppercase tracking-wide text-lc-muted">
                  Solved by difficulty
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-lc-green">Easy</span>{' '}
                  <span className="font-mono">{stats.solvedByDifficulty.easy}</span>
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-lc-orange">Medium</span>{' '}
                  <span className="font-mono">{stats.solvedByDifficulty.medium}</span>
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-lc-red">Hard</span>{' '}
                  <span className="font-mono">{stats.solvedByDifficulty.hard}</span>
                </span>
              </CardContent>
            </Card>
          )}

          <h2 className="mb-3 text-lg font-semibold">Recent Submissions</h2>
          <div className="rounded-lg border border-lc-border bg-lc-panel">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Problem</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-right">Runtime</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-lc-muted">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {submissionsQuery.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-lc-muted">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                )}
                {submissionsQuery.data?.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        to={`/problems/${s.problemId}`}
                        className="font-mono text-xs text-lc-orange hover:underline"
                      >
                        {s.problemId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={s.verdict} />
                    </TableCell>
                    <TableCell className="text-lc-muted">{s.language}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-lc-muted">
                      {s.runtimeMs != null ? `${s.runtimeMs} ms` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-lc-muted">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={submissionsQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
