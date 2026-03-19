import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TodaysPatrolsDetailsAdminPage } from './todays-patrols-details-admin.page';

const routes: Routes = [
  {
    path: '',
    component: TodaysPatrolsDetailsAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TodaysPatrolsDetailsAdminPageRoutingModule {}