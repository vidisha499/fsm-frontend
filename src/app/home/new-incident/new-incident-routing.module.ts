import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NewIncidentPage } from './new-incident.page';

const routes: Routes = [
  {
    path: '',
    component: NewIncidentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewIncidentPageRoutingModule {}
