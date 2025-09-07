import { FormControl, FormGroup } from '@angular/forms';

export type EduFormValue = {
  name: string;
  qualification: string | null;
  completed: boolean;
  startYearDate: Date | null;
  endYearDate: Date | null;
  notes: string | null;
};

export type EduForm = FormGroup<{
  name: FormControl<EduFormValue['name']>;
  qualification: FormControl<EduFormValue['qualification']>;
  completed: FormControl<EduFormValue['completed']>;
  startYearDate: FormControl<EduFormValue['startYearDate']>;
  endYearDate: FormControl<EduFormValue['endYearDate']>;
  notes: FormControl<EduFormValue['notes']>;
}>;