import type { FormControl, FormGroup } from '@angular/forms';
import type { FamilyService } from '../../../core/services/family.service';

export type FamilyFormGroup = ReturnType<
  FamilyService['createFamilyMemberForm']
>;

export type FamilyFormControls = FamilyFormGroup['controls'];

export type AddRelativeFormControls = FamilyFormControls & {
  relation: FormControl<string | null>;
  useImported: FormControl<boolean>;
  importedId: FormControl<string | null>;
};

export type AddRelativeFormGroup = FormGroup<AddRelativeFormControls>;
