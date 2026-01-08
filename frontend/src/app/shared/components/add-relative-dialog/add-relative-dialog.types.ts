import type { FormControl } from '@angular/forms';
import type {
  FamilyMemberFormControls,
  FamilyMemberFormGroup,
} from '../../types/forms/family-member-form.types';
import type { SanitizedShareTargetDto } from '../../../core/services/sharing-dto-sanitizer.service';

type AddRelativeFormExtras = {
  relation: FormControl<string | null>;
  useImported: FormControl<boolean>;
  importedId: FormControl<string | null>;
};

export type AddRelativeFormControls = FamilyMemberFormControls &
  AddRelativeFormExtras;

export type AddRelativeFormGroup = FamilyMemberFormGroup<AddRelativeFormExtras>;

export type AddRelativeImportedOption = {
  label: string;
  value: string;
  meta: SanitizedShareTargetDto;
};

export type ImportedPatchSource = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dob?: string | Date | null;
  birthYear?: number | null;
  birthNote?: string | null;
  dod?: string | Date | null;
  deathYear?: number | null;
  deathNote?: string | null;
};
