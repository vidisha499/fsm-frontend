import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GeofencesPage } from './geofences.page';

const routes: Routes = [
  {
    path: '',
    component: GeofencesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeofencesPageRoutingModule {}
