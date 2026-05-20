import type { FamilyColor } from "./family";

export type ChoreCadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type ChoreScope = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

export interface ChoreBoardItem {
  templateId: string;
  title: string;
  cadence: ChoreCadence;
  assignedToMemberId: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ChoreAssigneeGroup {
  member: {
    id: string;
    name: string;
    color: FamilyColor;
  };
  summary: {
    total: number;
    completed: number;
    remaining: number;
  };
  chores: ChoreBoardItem[];
}

export interface ChoreScopeBoard {
  scope: ChoreScope;
  periodStartDate: string;
  periodEndDate: string;
  summary: {
    total: number;
    completed: number;
    remaining: number;
  };
  assignees: ChoreAssigneeGroup[];
}

export interface ChoresBoard {
  timezone: string;
  today: ChoreScopeBoard;
  thisWeek: ChoreScopeBoard;
  thisMonth: ChoreScopeBoard;
}

export interface CreateChoreTemplateRequest {
  title: string;
  assignedToMemberId: string;
  cadence: ChoreCadence;
  activeFrom: string;
}

export interface UpdateChoreTemplateRequest {
  title?: string;
  assignedToMemberId?: string;
  cadence?: ChoreCadence;
  activeFrom?: string;
  archived?: boolean;
}

export interface ChoreTemplate {
  id: string;
  title: string;
  assignedToMemberId: string;
  cadence: ChoreCadence;
  activeFrom: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCurrentPeriodCompletionRequest {
  scope: ChoreScope;
  periodStartDate: string;
}

export interface ChoreCurrentPeriodState {
  scope: ChoreScope;
  periodStartDate: string;
  periodEndDate: string;
  item: ChoreBoardItem;
}
