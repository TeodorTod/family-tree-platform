import { AchievementCategory } from '../enums/achievement-category.enum';
import { AchievementLevel } from '../enums/achievement-level.enum';
import { BirthDeathDateMode } from '../enums/birth-death-date.enum';

export interface AchievementItem {
  id: string;
  title: string;                          // required
  category: AchievementCategory;          // required
  dateMode: BirthDeathDateMode;           // required

  // date variants (one of these by mode)
  exactDate: string | null;               // ISO 8601 if EXACT
  year: number | null;                    // if YEAR
  freeDate: string | null;                // if NOTE

  // optional
  organization?: string | null;
  location?: string | null;
  level?: AchievementLevel | null;

  createdAt: string;                      // for sort / display
}
