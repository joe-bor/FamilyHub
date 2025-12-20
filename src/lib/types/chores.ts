export interface ChoreItem {
  id: string;
  title: string;
  assignedTo: string;
  completed: boolean;
  dueDate: Date;
  recurring?: "daily" | "weekly" | "monthly";
}
