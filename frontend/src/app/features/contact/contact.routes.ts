import { Routes } from '@angular/router';
import { ContactUsComponent } from './contact-us/contact-us.component';

export const contactRoutes: Routes = [
  {
    path: '',
    component: ContactUsComponent,
    title: 'Contact Us • FamilyTree',
  },
];
