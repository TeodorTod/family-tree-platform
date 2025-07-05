import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyService } from '../../../core/services/family.service';

@Component({
  selector: 'app-owner',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './owner.component.html',
  styleUrl: './owner.component.scss',
})
export class OwnerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private familyService = inject(FamilyService);
  private router = inject(Router);

  photoUrl: string | null = null;
  genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  form = this.fb.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    gender: ['', Validators.required],
    dob: ['', Validators.required],
    biography: [''],
    dod: [''],
  });

  ngOnInit(): void {}

  onPhotoUpload(event: any) {
    const file = event.files[0];
    this.familyService.uploadPhoto(file).subscribe((res) => {
      this.photoUrl = res.url;
    });
  }

  next() {
    if (this.form.invalid || !this.photoUrl) return;

    const memberData = {
      ...this.form.value,
      photoUrl: this.photoUrl,
      isAlive: true,
    };

    this.familyService.createFamilyMember(memberData).subscribe(() => {
      this.router.navigate(['/onboarding/parents']);
    });
  }
}
