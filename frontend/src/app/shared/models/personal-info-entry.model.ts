import { BloodType } from '../enums/blood-type.enum';
import { Handedness } from '../enums/handedness.enum';
import { SmokingStatus } from '../enums/smoking-status.enum';

export interface PersonalInfoEntry {
  religion: string | null;
  nameDay: Date | null;
  heightCm: number | null;
  weightKg: number | null;
  bloodType: BloodType | null;
  handedness: Handedness | null;
  smokingStatus: SmokingStatus | null;
  allergies: string | null;
  conditions: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
}
