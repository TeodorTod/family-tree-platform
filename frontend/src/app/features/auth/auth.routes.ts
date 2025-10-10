import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { noAuthGuard } from '../../core/guards/no-auth.guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

export const authRoutes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [noAuthGuard],
  },
  { path: 'callback', component: LoginComponent, canActivate: [noAuthGuard] },
  {
    path: 'forgot',
    component: ForgotPasswordComponent,
    canActivate: [noAuthGuard],
  },
  {
    path: 'reset',
    component: ResetPasswordComponent,
    canActivate: [noAuthGuard],
  },
];
