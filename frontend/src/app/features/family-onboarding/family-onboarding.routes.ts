import { Routes } from '@angular/router';
import { OwnerComponent } from './owner/owner.component';
import { MotherComponent } from './mother/mother.component';
import { FatherComponent } from './father/father.component';
import { MaternalGrandparentsComponent } from './maternal-grandparents/maternal-grandparents.component';
import { PaternalGrandparentsComponent } from './paternal-grandparents/paternal-grandparents.component';

export const familyOnboardingRoutes: Routes = [
  { path: 'owner', component: OwnerComponent },
  { path: 'mother', component: MotherComponent },
  { path: 'maternal-grandparents', component: MaternalGrandparentsComponent },
  { path: 'father', component: FatherComponent },
  { path: 'paternal-grandparents', component: PaternalGrandparentsComponent },
];
