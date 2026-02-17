import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SightingsPage } from './sightings.page';

const routes: Routes = [
  {
    path: '',
    component: SightingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SightingsPageRoutingModule {}
