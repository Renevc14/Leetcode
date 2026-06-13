import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { problemsApi } from '@/api/problems';
import type { Difficulty } from '@/types';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

export function ProblemsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['problems', { difficulty, page }],
    queryFn: () =>
      problemsApi.list({
        difficulty: difficulty || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Problems</h1>
        <Select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as Difficulty | '');
            setPage(1);
          }}
          aria-label="Filter by difficulty"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
      </div>

      <div className="rounded-lg border border-lc-border bg-lc-panel">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Difficulty</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="w-28 text-right">Acceptance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-lc-muted">
                  Loading problems…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-lc-red">
                  Failed to load problems. Is the problems-service running?
                </TableCell>
              </TableRow>
            )}
            {data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-lc-muted">
                  No problems found.
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((problem, idx) => (
              <TableRow
                key={problem.id}
                className="cursor-pointer"
                onClick={() => navigate(`/problems/${problem.id}`)}
              >
                <TableCell className="text-lc-muted">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                <TableCell className="font-medium text-lc-text hover:text-lc-orange">
                  {problem.title}
                </TableCell>
                <TableCell>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(problem.categories ?? []).slice(0, 3).map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-lc-muted">
                  {problem.acceptanceRate.toFixed(1)}%
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
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
