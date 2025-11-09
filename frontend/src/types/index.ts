export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  type: 'student' | 'teacher';
}

export interface Conversation {
  id: string;
  userId: string;
  character: 'teo' | 'jojo';
  messages: Message[];
  createdAt: Date;
  score?: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: Date;
}

export interface Student {
  id: string;
  name: string;
  lastName: string;
  email: string;
  conversations: Conversation[];
  averageScore: number;
}