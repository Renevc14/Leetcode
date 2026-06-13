import {
  ValidationException,
  type Language,
  type TestCaseInput,
} from '@leetcode/problems-server-sdk';

export interface NormalizedTestCase {
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

export function requireString(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw new ValidationException({ message: `Missing required field '${fieldName}'.` });
  }
  return value;
}

export function requireNumber(value: number | undefined, fieldName: string): number {
  if (value === undefined) {
    throw new ValidationException({ message: `Missing required field '${fieldName}'.` });
  }
  return value;
}

export function requireValue<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined) {
    throw new ValidationException({ message: `Missing required field '${fieldName}'.` });
  }
  return value;
}

export function normalizeTestCases(testCases: TestCaseInput[] | undefined): NormalizedTestCase[] {
  const normalized = (testCases ?? []).map((testCase, index) => ({
    input: requireString(testCase.input, `testCases[${index}].input`),
    expectedOutput: requireString(testCase.expectedOutput, `testCases[${index}].expectedOutput`),
    isSample: requireValue(testCase.isSample, `testCases[${index}].isSample`),
  }));

  validateHasPublicAndHiddenTestCases(normalized);
  return normalized;
}

export function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return 20;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ValidationException({ message: 'limit must be a positive integer.' });
  }

  return Math.min(limit, 100);
}

export function ensureCategoriesProvided(categories: string[] | undefined): string[] {
  const safeCategories = categories?.filter((category) => category.trim().length > 0) ?? [];
  if (safeCategories.length === 0) {
    throw new ValidationException({ message: 'categories must include at least one value.' });
  }

  return Array.from(new Set(safeCategories));
}

export function ensureLanguagesProvided(languages: Language[] | undefined): Language[] {
  if (!languages || languages.length === 0) {
    throw new ValidationException({ message: 'allowedLanguages must include at least one value.' });
  }

  return Array.from(new Set(languages));
}

function validateHasPublicAndHiddenTestCases(testCases: NormalizedTestCase[]) {
  const hasPublic = testCases.some((testCase) => testCase.isSample);
  const hasHidden = testCases.some((testCase) => !testCase.isSample);
  if (!hasPublic || !hasHidden) {
    throw new ValidationException({
      message: 'A problem must have at least one public and one hidden test case.',
    });
  }
}

export function validateKnownCategories(
  categories: string[] | undefined,
  allExist: boolean,
  fieldName: 'categories' = 'categories',
) {
  if (categories && categories.length > 0 && !allExist) {
    throw new ValidationException({
      message: `Some values in '${fieldName}' do not exist in the categories catalog.`,
    });
  }
}
