import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OrgManagementPage } from './org-management.page';

const routes: Routes = [
  {
    path: '',
    component: OrgManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrgManagementPageRoutingModule {}
