/** What the side drawer is showing. `title` comes from the list that was clicked. */
export type DrawerItem = {
  kind: "deadline" | "task" | "case";
  id: number;
  caseId: number;
  title: string;
};
