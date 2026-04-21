import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OfficerDetailsPage } from './officer-details.page';

const routes: Routes = [
  {
    path: '',
    component: OfficerDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OfficerDetailsPageRoutingModule {}
