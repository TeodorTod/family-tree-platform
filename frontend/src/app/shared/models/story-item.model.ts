import { BirthDeathDateMode } from "../enums/birth-death-date.enum";

export interface StoryItem {
  id: string;
  title: string;
  dateMode: BirthDeathDateMode;
  exactDate?: string | null;
  year?: number | null;
  freeDate?: string | null;
  includedMemberIds: string[];
  content?: string | null;
  createdAt: string;
}