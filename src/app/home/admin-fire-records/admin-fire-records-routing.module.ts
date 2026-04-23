import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminFireRecordsPage } from './admin-fire-records.page';

const routes: Routes = [
  {
    path: '',
    component: AdminFireRecordsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminFireRecordsPageRoutingModule {}
