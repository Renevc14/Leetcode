import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contestsApi } from '@/api/contests';
import { problemsApi } from '@/api/problems';
import { extractErrorMessage } from '@/api/client';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminContestFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const problemsQuery = useQuery({
    queryKey: ['problems', { scope: 'all-for-contest' }],
    queryFn: () => problemsApi.list({ page: 1, pageSize: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      contestsApi.create({
        title: title.trim(),
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        problemIds: selectedIds,
      }),
    onSuccess: (contest) => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      navigate(`/contests/${contest.id}`);
    },
  });

  const toggleProblem = (problemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(problemId) ? prev.filter((pid) => pid !== problemId) : [...prev, problemId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (new Date(endTime) <= new Date(startTime)) {
      setValidationError('End time must be after start time.');
      return;
    }
    if (selectedIds.length === 0) {
      setValidationError('Select at least one problem.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Create Contest</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                placeholder="Weekly Contest 42"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                rows={4}
                placeholder="What this contest is about…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Problems{' '}
              <span className="font-normal text-lc-muted">({selectedIds.length} selected)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {problemsQuery.isLoading ? (
              <div className="py-6 text-center text-sm text-lc-muted">Loading problems…</div>
            ) : problemsQuery.data?.items.length ? (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-lc-border bg-lc-bg p-2">
                {problemsQuery.data.items.map((problem) => (
                  <label
                    key={problem.id}
                    className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-lc-panel-hover"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#FFA116]"
                      checked={selectedIds.includes(problem.id)}
                      onChange={() => toggleProblem(problem.id)}
                    />
                    <span className="flex-1 text-sm">{problem.title}</span>
                    <DifficultyBadge difficulty={problem.difficulty} className="text-xs" />
                  </label>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-lc-muted">
                No problems available. Create one first.
              </div>
            )}
          </CardContent>
        </Card>

        {(validationError || mutation.isError) && (
          <p className="text-sm text-lc-red">
            {validationError ?? extractErrorMessage(mutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Contest'}
          </Button>
        </div>
      </form>
    </div>
  );
}
