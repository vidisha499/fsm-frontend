import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminCriminalRecordsPage } from './admin-criminal-records.page';

const routes: Routes = [
  {
    path: '',
    component: AdminCriminalRecordsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminCriminalRecordsPageRoutingModule {}
