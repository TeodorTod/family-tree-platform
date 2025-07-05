import { Routes } from '@angular/router';
import { OwnerComponent } from './owner/owner.component';
import { GrandparentsComponent } from './grandparents/grandparents.component';
import { ParentsComponent } from './parents/parents.component';

export const familyOnboardingRoutes: Routes = [
  { path: 'owner', component: OwnerComponent },
  { path: 'parents', component: ParentsComponent },
  { path: 'grandparents', component: GrandparentsComponent },
];
