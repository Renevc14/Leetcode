import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Loader2,
  Play,
  PanelRightClose,
  PanelRightOpen,
  Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { problemsApi } from '@/api/problems';
import { submissionsApi } from '@/api/submissions';
import { extractErrorMessage } from '@/api/client';
import { useSubmissionPolling } from '@/hooks/usePolling';
import { useAuthStore } from '@/store/useAuthStore';
import type { Language, ProblemLanguage, Submission } from '@/types';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { VerdictBadge } from '@/components/VerdictBadge';
import { VerdictBanner } from '@/components/VerdictBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils';

/** problems-service usa minúsculas; submissions-service usa MAYÚSCULAS */
const TO_SUBMISSION_LANGUAGE: Record<ProblemLanguage, Language> = {
  python: 'PYTHON',
  java: 'JAVA',
  cpp: 'CPP',
  javascript: 'JAVASCRIPT',
  typescript: 'TYPESCRIPT',
};

const LANGUAGE_LABEL: Record<ProblemLanguage, string> = {
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

const TEMPLATES: Record<ProblemLanguage, string> = {
  python:
    '# Write your solution here\n\ndef solve():\n    pass\n\n\nif __name__ == "__main__":\n    solve()\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  javascript: '// Write your solution here\n\nfunction solve() {\n}\n\nsolve();\n',
  typescript: '// Write your solution here\n\nfunction solve(): void {\n}\n\nsolve();\n',
};

function SubmissionRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const codeQuery = useQuery({
    queryKey: ['submission-code', submission.id],
    queryFn: () => submissionsApi.getCode(submission.id),
    enabled: expanded,
  });

  return (
    <div className="border-b border-lc-border/60">
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-lc-panel-hover"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-lc-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-lc-muted" />
        )}
        <div className="min-w-0 flex-1">
          <VerdictBadge verdict={submission.verdict} />
          <div className="text-xs text-lc-muted">{formatDateTime(submission.createdAt)}</div>
        </div>
        <div className="text-right text-xs text-lc-muted">
          <div>{submission.language}</div>
          <div className="font-mono">
            {submission.runtimeMs != null ? `${submission.runtimeMs} ms` : '—'}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="bg-lc-bg px-3 py-2">
          {codeQuery.isLoading ? (
            <div className="py-2 text-xs text-lc-muted">Loading code…</div>
          ) : codeQuery.data ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-lc-text">
              {codeQuery.data.sourceCode}
            </pre>
          ) : (
            <div className="py-2 text-xs text-lc-red">Could not load source code.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const problemId = id!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();

  const [language, setLanguage] = useState<ProblemLanguage>('python');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<ProblemLanguage, string>>({
    ...TEMPLATES,
  });
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [activeKind, setActiveKind] = useState<'run' | 'submit'>('run');
  const [resultsOpen, setResultsOpen] = useState(true);

  const code = codeByLanguage[language];

  const problemQuery = useQuery({
    queryKey: ['problem', problemId],
    queryFn: () => problemsApi.get(problemId),
  });

  const problem = problemQuery.data;
  const allowedLanguages = problem?.allowedLanguages?.length
    ? problem.allowedLanguages
    : (Object.keys(LANGUAGE_LABEL) as ProblemLanguage[]);

  // Si el lenguaje seleccionado no está permitido en este problema, usar el primero.
  useEffect(() => {
    if (problem && !allowedLanguages.includes(language)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(allowedLanguages[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  const mySubmissionsQuery = useQuery({
    queryKey: ['submissions', { problemId, userId: user?.id }],
    queryFn: () => submissionsApi.list({ problemId, userId: user?.id, page: 1, pageSize: 20 }),
    enabled: !!user,
  });

  const polling = useSubmissionPolling(activeSubmissionId);
  const activeSubmission = polling.data;

  useEffect(() => {
    if (activeSubmission?.status === 'DONE') {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    }
  }, [activeSubmission?.status, queryClient]);

  const runMutation = useMutation({
    mutationFn: () =>
      submissionsApi.run({
        problemId,
        language: TO_SUBMISSION_LANGUAGE[language],
        sourceCode: code,
      }),
    onSuccess: () => {
      setActiveKind('run');
      setActiveSubmissionId(null);
      setResultsOpen(true);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submissionsApi.submit({
        problemId,
        language: TO_SUBMISSION_LANGUAGE[language],
        sourceCode: code,
      }),
    onSuccess: ({ submissionId }) => {
      setActiveKind('submit');
      setActiveSubmissionId(submissionId);
      setResultsOpen(true);
    },
  });

  const requireAuth = (action: () => void) => {
    if (!token) {
      navigate('/login', { state: { from: `/problems/${problemId}` } });
      return;
    }
    action();
  };

  const isJudging =
    runMutation.isPending ||
    submitMutation.isPending ||
    (!!activeSubmission && activeSubmission.status !== 'DONE');

  if (problemQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-lc-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading problem…
      </div>
    );
  }

  if (problemQuery.isError || !problem) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-lc-red">
        Failed to load problem. {extractErrorMessage(problemQuery.error)}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left panel: description + submissions */}
      <div className="flex w-[38%] min-w-[320px] flex-col overflow-hidden border-r border-lc-border bg-lc-panel">
        <Tabs defaultValue="description" className="flex h-full flex-col">
          <div className="border-b border-lc-border px-3 pt-2">
            <TabsList className="bg-transparent p-0">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="description" className="mt-0 flex-1 overflow-y-auto p-4">
            <h1 className="mb-2 text-lg font-semibold">{problem.title}</h1>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              {(problem.categories ?? []).map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
              <span className="font-mono text-xs text-lc-muted">
                {problem.acceptanceRate.toFixed(1)}% AC
              </span>
            </div>

            <div className="mb-4 flex gap-3 text-xs text-lc-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {problem.timeLimitMs} ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5" /> {problem.memoryLimitMb} MB
              </span>
            </div>

            <div className="markdown-body text-sm text-[#c5c5c5]">
              <ReactMarkdown>{problem.statementMarkdown}</ReactMarkdown>
            </div>

            {problem.constraints && (
              <div className="mt-5">
                <h2 className="mb-2 text-sm font-semibold text-lc-text">Constraints</h2>
                <div className="markdown-body text-sm text-[#c5c5c5]">
                  <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                </div>
              </div>
            )}

            {problem.publicTestCases.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-semibold text-lc-text">Examples</h2>
                {problem.publicTestCases.map((tc, i) => (
                  <div key={i} className="rounded-md bg-lc-bg p-3">
                    <div className="mb-1 text-xs font-medium text-lc-muted">Example {i + 1}</div>
                    <div className="space-y-1 font-mono text-xs">
                      <div>
                        <span className="text-lc-muted">Input: </span>
                        <span className="whitespace-pre-wrap text-lc-text">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-lc-muted">Output: </span>
                        <span className="whitespace-pre-wrap text-lc-text">
                          {tc.expectedOutput}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="mt-0 flex-1 overflow-y-auto">
            {!user ? (
              <div className="p-4 text-sm text-lc-muted">
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>{' '}
                to view your submissions.
              </div>
            ) : mySubmissionsQuery.isLoading ? (
              <div className="p-4 text-sm text-lc-muted">Loading submissions…</div>
            ) : mySubmissionsQuery.data?.items.length ? (
              <div>
                {mySubmissionsQuery.data.items.map((s) => (
                  <SubmissionRow key={s.id} submission={s} />
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-lc-muted">No submissions yet.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Center panel: editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-lc-border bg-lc-panel px-3 py-2">
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as ProblemLanguage)}
            className="h-8 text-xs"
            aria-label="Language"
          >
            {allowedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABEL[lang] ?? lang}
              </option>
            ))}
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isJudging}
              onClick={() => requireAuth(() => runMutation.mutate())}
            >
              <Play className="h-3.5 w-3.5" /> Run
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={isJudging}
              onClick={() => requireAuth(() => submitMutation.mutate())}
            >
              <Upload className="h-3.5 w-3.5" /> Submit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setResultsOpen((o) => !o)}
              aria-label={resultsOpen ? 'Hide results panel' : 'Show results panel'}
            >
              {resultsOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={(value) =>
              setCodeByLanguage((prev) => ({ ...prev, [language]: value ?? '' }))
            }
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 12 },
            }}
          />
        </div>
      </div>

      {/* Right panel: results (collapsible) */}
      {resultsOpen && (
        <div className="flex w-[26%] min-w-[280px] flex-col overflow-hidden border-l border-lc-border bg-lc-panel">
          <div className="border-b border-lc-border px-4 py-2.5 text-sm font-medium">
            {activeKind === 'submit' ? 'Submission Result' : 'Run Result'}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {runMutation.isError || submitMutation.isError ? (
              <div className="text-sm text-lc-red">
                {extractErrorMessage(runMutation.error ?? submitMutation.error)}
              </div>
            ) : activeKind === 'run' && runMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-lc-muted">
                <Loader2 className="h-4 w-4 animate-spin text-lc-orange" /> Running…
              </div>
            ) : activeKind === 'run' && runMutation.data ? (
              <VerdictBanner submission={runMutation.data} />
            ) : !activeSubmissionId ? (
              <div className="text-sm text-lc-muted">
                Run or submit your code to see results here.
              </div>
            ) : polling.isLoading || !activeSubmission ? (
              <div className="flex items-center gap-2 text-sm text-lc-muted">
                <Loader2 className="h-4 w-4 animate-spin text-lc-orange" /> Sending…
              </div>
            ) : (
              <VerdictBanner submission={activeSubmission} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
