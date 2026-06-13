export interface UserAggregate {
  id: string;
  authentikId: string;
  userName: string;
  displayName: string;
  email: string;
  bio: string | undefined;
  avatarUrl: string | undefined;
  countryCode: string | undefined;
  isActive: boolean;
}

export interface UserProblemStatusItem {
  problemId: string;
  status: 'ATTEMPTED' | 'SOLVED';
  updatedAt: Date;
}
