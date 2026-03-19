import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AttendanceRequestsPage } from './attendance-requests.page';

const routes: Routes = [
  {
    path: '',
    component: AttendanceRequestsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRequestsPageRoutingModule {}
