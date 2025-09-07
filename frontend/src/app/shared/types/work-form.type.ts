import { FormControl, FormGroup } from '@angular/forms';

export type WorkFormValue = {
  employerName: string;
  profession: string | null;
  completed: boolean;
  startYearDate: Date | null;
  endYearDate: Date | null;
  notes: string | null;
};

export type WorkForm = FormGroup<{
  employerName: FormControl<WorkFormValue['employerName']>;
  profession: FormControl<WorkFormValue['profession']>;
  completed: FormControl<WorkFormValue['completed']>;
  startYearDate: FormControl<WorkFormValue['startYearDate']>;
  endYearDate: FormControl<WorkFormValue['endYearDate']>;
  notes: FormControl<WorkFormValue['notes']>;
}>;
