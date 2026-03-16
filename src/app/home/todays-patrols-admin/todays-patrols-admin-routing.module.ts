import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TodaysPatrolsAdminPage } from './todays-patrols-admin.page';

const routes: Routes = [
  {
    path: '',
    component: TodaysPatrolsAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TodaysPatrolsAdminPageRoutingModule {}
