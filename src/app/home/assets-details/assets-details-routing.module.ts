import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AssetsDetailsPage } from './assets-details.page';

const routes: Routes = [
  {
    path: '',
    component: AssetsDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssetsDetailsPageRoutingModule {}
