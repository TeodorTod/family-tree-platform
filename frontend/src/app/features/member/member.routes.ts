import { Routes } from "@angular/router";
import { MemberInfoComponent } from "./member-info/member-info.component";

export const memberRoutes: Routes = [
  {
    path: ':role',
    component: MemberInfoComponent,
  },
];