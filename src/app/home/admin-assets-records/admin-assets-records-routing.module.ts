import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAssetsRecordsPage } from './admin-assets-records.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAssetsRecordsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAssetsRecordsPageRoutingModule {}
