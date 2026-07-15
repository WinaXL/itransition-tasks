export type Role = "CANDIDATE" | "RECRUITER" | "ADMIN";
export type AttributeType = "STRING" | "TEXT" | "IMAGE" | "NUMERIC" | "DATE" | "PERIOD" | "BOOLEAN" | "SELECT";
export type CvStatus = "DRAFT" | "PUBLISHED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  language: "en" | "ru";
  theme: "light" | "dark";
}

export interface Category {
  id: number;
  name: string;
}

export interface Attribute {
  id: string;
  name: string;
  description: string;
  type: AttributeType;
  options: string[];
  builtIn: boolean;
  categoryId: number;
  category?: Category;
  version: number;
}

export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  version: number;
  attribute: Attribute;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  description: string;
  version: number;
  tags: { tag: Tag }[];
}

export interface AccessRule {
  id?: string;
  attributeId: string;
  operator: string;
  value: string;
  attribute?: Attribute;
}

export interface Position {
  id: string;
  title: string;
  shortDescription: string;
  company: string;
  level: string;
  isPublic: boolean;
  maxProjects: number;
  version: number;
  updatedAt: string;
  cvCount?: number;
  accessible?: boolean;
  canEdit?: boolean;
  myCvId?: string | null;
  attributes?: { attribute: Attribute; sortOrder: number }[];
  projectTags?: { tag: Tag }[];
  accessRules?: AccessRule[];
  _count?: { cvs: number; comments?: number };
}

export interface CvSection {
  attribute: Attribute;
  value: string;
  version: number | null;
  category: string;
}

export interface CvData {
  id: string;
  status: CvStatus;
  version: number;
  updatedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  position: { id: string; title: string; company: string; level: string; shortDescription: string };
  editable: boolean;
  likes: number;
  likedByMe: boolean;
  sections: CvSection[];
  projects: Project[];
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface ProfileData {
  user: { id: string; name: string; email: string; avatarUrl: string | null; role: Role };
  editable: boolean;
  builtIns: Attribute[];
  values: AttributeValue[];
  projects: Project[];
  cvs: {
    id: string;
    status: CvStatus;
    updatedAt: string;
    position: { id: string; title: string; company: string };
    _count: { likes: number };
  }[];
}
