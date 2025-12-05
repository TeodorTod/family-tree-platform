import type { FormControl } from '@angular/forms';
import type {
  FamilyMemberFormControls,
  FamilyMemberFormGroup,
} from '../../types/forms/family-member-form.types';

type AddRelativeFormExtras = {
  relation: FormControl<string | null>;
  useImported: FormControl<boolean>;
  importedId: FormControl<string | null>;
};

export type AddRelativeFormControls = FamilyMemberFormControls &
  AddRelativeFormExtras;

export type AddRelativeFormGroup = FamilyMemberFormGroup<AddRelativeFormExtras>;
