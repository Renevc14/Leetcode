import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Loader2, Trophy, Users } from 'lucide-react';
import { contestsApi } from '@/api/contests';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/useAuthStore';
import { CountdownTimer } from '@/components/CountdownTimer';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';

const LEADERBOARD_PAGE_SIZE = 25;

export function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const contestId = id!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  const contestQuery = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId),
  });

  const problemsQuery = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: () => contestsApi.problems(contestId),
  });

  const leaderboardQuery = useQuery({
    queryKey: ['contest-leaderboard', contestId, leaderboardPage],
    queryFn: () =>
      contestsApi.leaderboard(contestId, {
        page: leaderboardPage,
        pageSize: LEADERBOARD_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const contest = contestQuery.data;

  const enrollMutation = useMutation({
    mutationFn: () =>
      contest?.isEnrolled ? contestsApi.unenroll(contestId) : contestsApi.enroll(contestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
    },
  });

  const handleEnrollToggle = () => {
    if (!token) {
      navigate('/login', { state: { from: `/contests/${contestId}` } });
      return;
    }
    enrollMutation.mutate();
  };

  if (contestQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-lc-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading contest…
      </div>
    );
  }

  if (contestQuery.isError || !contest) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-lc-red">
        Failed to load contest. {extractErrorMessage(contestQuery.error)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 rounded-lg border border-lc-border bg-lc-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{contest.title}</h1>
              {contest.status === 'LIVE' ? (
                <Badge variant="green">Live</Badge>
              ) : contest.status === 'UPCOMING' ? (
                <Badge variant="orange">Upcoming</Badge>
              ) : (
                <Badge>Finished</Badge>
              )}
            </div>
            <p className="mb-3 max-w-2xl text-sm text-lc-muted">{contest.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-lc-muted">
              <span>
                {formatDateTime(contest.startTime)} → {formatDateTime(contest.endTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {contest.participantCount} participants
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {contest.status === 'UPCOMING' && (
              <CountdownTimer
                target={contest.startTime}
                prefix="Starts in"
                className="text-xl font-semibold text-lc-orange"
              />
            )}
            {contest.status === 'LIVE' && (
              <CountdownTimer
                target={contest.endTime}
                prefix="Ends in"
                className="text-xl font-semibold text-lc-green"
              />
            )}

            {contest.status !== 'FINISHED' && (
              <Button
                variant={contest.isEnrolled ? 'outline' : 'default'}
                disabled={enrollMutation.isPending}
                onClick={handleEnrollToggle}
              >
                {enrollMutation.isPending ? 'Saving…' : contest.isEnrolled ? 'Unenroll' : 'Enroll'}
              </Button>
            )}
            {enrollMutation.isError && (
              <p className="text-xs text-lc-red">{extractErrorMessage(enrollMutation.error)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="problems">
        <TabsList className="bg-lc-panel">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-3.5 w-3.5" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="problems">
          <div className="rounded-lg border border-lc-border bg-lc-panel">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-32">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problemsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-lc-muted">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {problemsQuery.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-lc-muted">
                      No problems in this contest.
                    </TableCell>
                  </TableRow>
                )}
                {problemsQuery.data?.items
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((p) => (
                    <TableRow key={p.problemId}>
                      <TableCell className="text-lc-muted">{p.order}</TableCell>
                      <TableCell>
                        <Link
                          to={`/problems/${p.problemId}`}
                          className="font-medium text-lc-text hover:text-lc-orange"
                        >
                          {p.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <div className="rounded-lg border border-lc-border bg-lc-panel">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Solved</TableHead>
                  <TableHead className="text-right">Penalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-lc-muted">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {leaderboardQuery.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-lc-muted">
                      No participants on the board yet.
                    </TableCell>
                  </TableRow>
                )}
                {leaderboardQuery.data?.items.map((entry) => (
                  <TableRow key={entry.userId}>
                    <TableCell
                      className={entry.rank <= 3 ? 'font-semibold text-lc-orange' : 'text-lc-muted'}
                    >
                      {entry.rank}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/profile/${entry.userId}`}
                        className="font-medium text-lc-text hover:text-lc-orange"
                      >
                        {entry.username}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">{entry.score}</TableCell>
                    <TableCell className="text-right font-mono">{entry.solvedCount}</TableCell>
                    <TableCell className="text-right font-mono text-lc-muted">
                      {entry.penalty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Pagination
              page={leaderboardPage}
              pageSize={LEADERBOARD_PAGE_SIZE}
              total={leaderboardQuery.data?.total ?? 0}
              onPageChange={setLeaderboardPage}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
