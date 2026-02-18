import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PatrolDetailsPage } from './patrol-details.page';

const routes: Routes = [
  {
    path: '',
    component: PatrolDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatrolDetailsPageRoutingModule {}
