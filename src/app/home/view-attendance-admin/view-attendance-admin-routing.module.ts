import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewAttendanceAdminPage } from './view-attendance-admin.page';

const routes: Routes = [
  {
    path: '',
    component: ViewAttendanceAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewAttendanceAdminPageRoutingModule {}
