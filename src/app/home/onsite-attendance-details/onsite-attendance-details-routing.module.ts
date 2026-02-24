import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OnsiteAttendanceDetailsPage } from './onsite-attendance-details.page';

const routes: Routes = [
  {
    path: '',
    component: OnsiteAttendanceDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnsiteAttendanceDetailsPageRoutingModule {}
