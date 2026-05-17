export interface User {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  classId?: string;
  lastActive: Date;
  school_id?: string;
  image_url?: string;
}