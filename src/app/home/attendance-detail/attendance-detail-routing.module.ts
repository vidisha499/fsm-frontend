import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AttendanceDetailPage } from './attendance-detail.page';

const routes: Routes = [
  {
    path: '',
    component: AttendanceDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceDetailPageRoutingModule {}
