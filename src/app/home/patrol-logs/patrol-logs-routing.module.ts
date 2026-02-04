import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PatrolLogsPage } from './patrol-logs.page';

const routes: Routes = [
  {
    path: '',
    component: PatrolLogsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatrolLogsPageRoutingModule {}
