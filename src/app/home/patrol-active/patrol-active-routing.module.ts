import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PatrolActivePage } from './patrol-active.page';

const routes: Routes = [
  {
    path: '',
    component: PatrolActivePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatrolActivePageRoutingModule {}
