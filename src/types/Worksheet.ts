export interface Problem {
  question: string;
  answer: string;
  type: 'addition' | 'subtraction' | 'multiplication' | 'division';
}

export interface Worksheet {
  id?: string;
  title: string;
  problems: Problem[];
  createdAt: string;
}