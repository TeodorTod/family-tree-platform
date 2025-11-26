import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ContactTopic, ContactMessageDto } from '../../../shared/types/contact.types';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  // 👇 Form lives here (pattern like AuthService)
  contactForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    topic: ['' as '' | ContactTopic, [Validators.required]],
    message: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    ],
    consent: [false, [Validators.requiredTrue]],
  });

  send(payload: ContactMessageDto): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/support/contact`, payload);
  }
}
