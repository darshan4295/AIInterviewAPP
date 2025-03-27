export interface Candidate {
  id: string;
  name: string;
  email: string;
  linkedinUrl?: string;
  githubUrl?: string;
  resume?: string;
  skills: string[];
  experience: number;
  status: 'screening' | 'video_interview' | 'technical_assessment' | 'managerial_round' | 'completed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Interview {
  id: string;
  candidateId: string;
  type: 'video' | 'technical' | 'managerial';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledAt: Date;
  feedback?: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}