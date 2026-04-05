import { Routes } from '@angular/router';
import { HomeShellComponent } from './home-shell.component';
import { HomeComponent } from './home.component';

export const homeRoutes: Routes = [
  {
    path: '',
    component: HomeShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chart' },
      { path: 'chart', component: HomeComponent },
      { path: 'table', component: HomeComponent },
    ],
  },
];
