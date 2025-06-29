import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);

  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });

  register() {
    console.log('Registering with form:', this.form.value);
    
    // if (this.form.invalid) return;

    const { email, password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.error.set('Паролите не съвпадат');
      return;
    }

    this.auth.register(email!, password!, confirmPassword!).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) =>
        this.error.set(err.error?.message ?? 'Регистрацията се провали'),
    });
  }
}
