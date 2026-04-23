import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminEventsRecordsPage } from './admin-events-records.page';

const routes: Routes = [
  {
    path: '',
    component: AdminEventsRecordsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminEventsRecordsPageRoutingModule {}
