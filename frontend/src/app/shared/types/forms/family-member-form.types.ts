import type {
  AbstractControl,
  FormControl,
  FormGroup,
} from '@angular/forms';
import type { BirthDeathDateMode } from '../../enums/birth-death-date.enum';
import type { PartnerStatus } from '../../enums/partner-status.enum';

export type FamilyMemberFormControls = {
  firstName: FormControl<string | null>;
  middleName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  gender: FormControl<string | null>;

  dobMode: FormControl<BirthDeathDateMode>;
  dob: FormControl<Date | null>;
  birthYear: FormControl<number | null>;
  birthYearDate: FormControl<Date | null>;
  birthNote: FormControl<string | null>;

  dodMode: FormControl<BirthDeathDateMode>;
  dod: FormControl<Date | null>;
  deathYear: FormControl<number | null>;
  deathYearDate: FormControl<Date | null>;
  deathNote: FormControl<string | null>;

  isAlive: FormControl<boolean | null>;
  translatedRole: FormControl<string | null>;
  partnerStatus: FormControl<PartnerStatus | null>;
};

export type FamilyMemberFormGroup<
  TExtraControls extends Record<string, AbstractControl<any, any>> = Record<
    never,
    never
  >
> = FormGroup<FamilyMemberFormControls & TExtraControls>;
