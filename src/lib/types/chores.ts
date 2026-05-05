export interface Chore {
  id: string;
  title: string;
  assignedToMemberId: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChoreRequest {
  title: string;
  assignedToMemberId: string;
  dueDate?: string | null;
}

export interface UpdateChoreRequest {
  completed: boolean;
}
