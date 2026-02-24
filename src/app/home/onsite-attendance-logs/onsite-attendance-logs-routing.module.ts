import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OnsiteAttendanceLogsPage } from './onsite-attendance-logs.page';

const routes: Routes = [
  {
    path: '',
    component: OnsiteAttendanceLogsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnsiteAttendanceLogsPageRoutingModule {}
