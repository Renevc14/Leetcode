import type {
  CreateProblemData,
  ProblemAggregate,
  ProblemListResult,
  UpdateProblemData,
} from '../domain/problem.js';
import type { Difficulty } from '@leetcode/problems-server-sdk';

export interface ListProblemsFilters {
  cursor?: string;
  limit: number;
  difficulty?: Difficulty;
  category?: string;
  problemIdIn?: string[];
  problemIdNotIn?: string[];
}

export interface ProblemsRepository {
  listPublished(filters: ListProblemsFilters): Promise<ProblemListResult>;
  listNonDeleted(filters: ListProblemsFilters): Promise<ProblemListResult>;
  listAll(filters: ListProblemsFilters): Promise<ProblemListResult>;
  findPublishedById(id: string): Promise<ProblemAggregate | null>;
  findById(id: string): Promise<ProblemAggregate | null>;
  categoryNamesExist(names: string[]): Promise<boolean>;
  create(data: CreateProblemData): Promise<ProblemAggregate>;
  update(data: UpdateProblemData): Promise<ProblemAggregate | null>;
  softDelete(id: string): Promise<boolean>;
}
