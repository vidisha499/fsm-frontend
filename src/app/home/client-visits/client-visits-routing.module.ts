import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClientVisitsPage } from './client-visits.page';

const routes: Routes = [
  {
    path: '',
    component: ClientVisitsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientVisitsPageRoutingModule {}
