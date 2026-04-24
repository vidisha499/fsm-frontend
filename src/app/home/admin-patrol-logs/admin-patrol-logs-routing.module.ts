import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminPatrolLogsPage } from './admin-patrol-logs.page';

const routes: Routes = [
  {
    path: '',
    component: AdminPatrolLogsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPatrolLogsPageRoutingModule {}
