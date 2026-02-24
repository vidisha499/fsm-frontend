import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SightingsDetailsPage } from './sightings-details.page';

const routes: Routes = [
  {
    path: '',
    component: SightingsDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SightingsDetailsPageRoutingModule {}
