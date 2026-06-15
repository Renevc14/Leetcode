import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Plus, Trash2 } from 'lucide-react';
import { problemsApi } from '@/api/problems';
import type { CreateProblemInput } from '@/api/problems';
import { extractErrorMessage } from '@/api/client';
import type { Difficulty, ProblemLanguage, TestCaseInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EMPTY_TEST_CASE: TestCaseInput = { input: '', expectedOutput: '', isPublic: true };

const ALL_LANGUAGES: { value: ProblemLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
];

export function AdminProblemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [statementMarkdown, setStatementMarkdown] = useState('');
  const [constraints, setConstraints] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [timeLimitMs, setTimeLimitMs] = useState(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [allowedLanguages, setAllowedLanguages] = useState<ProblemLanguage[]>([
    'python',
    'javascript',
  ]);
  const [testCases, setTestCases] = useState<TestCaseInput[]>([
    { ...EMPTY_TEST_CASE },
    { ...EMPTY_TEST_CASE, isPublic: false },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const problemQuery = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.get(id!),
    enabled: isEdit,
  });

  // Prefill al editar. Nota: la API solo devuelve los casos PÚBLICOS
  // (los ocultos nunca se exponen), así que al editar hay que recrear los ocultos.
  useEffect(() => {
    const problem = problemQuery.data;
    if (!problem) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(problem.title);
    setDifficulty(problem.difficulty);
    setStatementMarkdown(problem.statementMarkdown);
    setConstraints(problem.constraints);
    setCategoriesInput((problem.categories ?? []).join(', '));
    setTimeLimitMs(problem.timeLimitMs);
    setMemoryLimitMb(problem.memoryLimitMb);
    setAllowedLanguages(problem.allowedLanguages ?? []);
    setTestCases(
      problem.publicTestCases?.length
        ? problem.publicTestCases.map((tc) => ({ ...tc, isPublic: true }))
        : [{ ...EMPTY_TEST_CASE }],
    );
  }, [problemQuery.data]);

  const mutation = useMutation({
    mutationFn: (data: CreateProblemInput) =>
      isEdit ? problemsApi.update(id!, data) : problemsApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem', result.id] });
      navigate(`/problems/${result.id}`);
    },
  });

  const toggleLanguage = (lang: ProblemLanguage) => {
    setAllowedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const updateTestCase = (index: number, patch: Partial<TestCaseInput>) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (allowedLanguages.length === 0) {
      setValidationError('Selecciona al menos un lenguaje permitido.');
      return;
    }
    // El backend exige al menos un caso público y uno oculto.
    if (!testCases.some((tc) => tc.isPublic) || !testCases.some((tc) => !tc.isPublic)) {
      setValidationError(
        'El backend requiere al menos un caso público y uno oculto (toggle "Public").',
      );
      return;
    }
    if (timeLimitMs < 100 || timeLimitMs > 10000) {
      setValidationError('El límite de tiempo debe estar entre 100 y 10000 ms.');
      return;
    }
    if (memoryLimitMb < 16 || memoryLimitMb > 1024) {
      setValidationError('El límite de memoria debe estar entre 16 y 1024 MB.');
      return;
    }

    mutation.mutate({
      title: title.trim(),
      statementMarkdown,
      constraints,
      difficulty,
      categories: categoriesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      timeLimitMs,
      memoryLimitMb,
      allowedLanguages,
      testCases,
    });
  };

  if (isEdit && problemQuery.isLoading) {
    return <div className="py-20 text-center text-lc-muted">Loading problem…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{isEdit ? 'Edit Problem' : 'Create Problem'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,160px]">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  placeholder="Two Sum"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  id="difficulty"
                  className="w-full"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement">Statement (Markdown)</Label>
              <Textarea
                id="statement"
                required
                rows={10}
                className="font-mono text-xs"
                placeholder={'Given an array of integers `nums`…'}
                value={statementMarkdown}
                onChange={(e) => setStatementMarkdown(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints</Label>
              <Textarea
                id="constraints"
                required
                rows={3}
                className="font-mono text-xs"
                placeholder={'- 1 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9'}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories (comma separated)</Label>
              <Input
                id="categories"
                placeholder="array, hash-table, two-pointers"
                value={categoriesInput}
                onChange={(e) => setCategoriesInput(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (ms, 100–10000)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min={100}
                  max={10000}
                  required
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryLimit">Memory Limit (MB, 16–1024)</Label>
                <Input
                  id="memoryLimit"
                  type="number"
                  min={16}
                  max={1024}
                  required
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed Languages</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_LANGUAGES.map((lang) => (
                  <label
                    key={lang.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-lc-border bg-lc-bg px-3 py-1.5 text-sm transition-colors hover:bg-lc-panel-hover"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#FFA116]"
                      checked={allowedLanguages.includes(lang.value)}
                      onChange={() => toggleLanguage(lang.value)}
                    />
                    {lang.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Test Cases</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setTestCases((prev) => [...prev, { ...EMPTY_TEST_CASE, isPublic: false }])
              }
            >
              <Plus className="h-4 w-4" /> Add Case
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-lc-border bg-lc-bg p-3 text-xs text-lc-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              El backend exige al menos un caso público (visible en el editor) y uno oculto (solo
              para evaluación).
              {isEdit &&
                ' Al editar, la API solo devuelve los casos públicos: vuelve a definir los ocultos.'}
            </div>

            {testCases.map((tc, i) => (
              <div key={i} className="rounded-md border border-lc-border bg-lc-bg p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-lc-muted">Case #{i + 1}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-lc-muted">
                      Public
                      <Switch
                        checked={tc.isPublic}
                        onCheckedChange={(checked) => updateTestCase(i, { isPublic: checked })}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-lc-red"
                      disabled={testCases.length === 1}
                      onClick={() => setTestCases((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove test case ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-lc-muted">Input</Label>
                    <Textarea
                      rows={3}
                      required
                      className="font-mono text-xs"
                      value={tc.input}
                      onChange={(e) => updateTestCase(i, { input: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-lc-muted">Expected Output</Label>
                    <Textarea
                      rows={3}
                      required
                      className="font-mono text-xs"
                      value={tc.expectedOutput}
                      onChange={(e) => updateTestCase(i, { expectedOutput: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
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
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Problem'}
          </Button>
        </div>
      </form>
    </div>
  );
}
