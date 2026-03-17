import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IncidentDetailAdminPage } from './incident-detail-admin.page';

const routes: Routes = [
  {
    path: '',
    component: IncidentDetailAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncidentDetailAdminPageRoutingModule {}
