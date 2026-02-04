import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OnsiteAttendancePage } from './onsite-attendance.page';

const routes: Routes = [
  {
    path: '',
    component: OnsiteAttendancePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnsiteAttendancePageRoutingModule {}