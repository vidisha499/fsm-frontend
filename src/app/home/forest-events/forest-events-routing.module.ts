import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ForestEventsPage } from './forest-events.page';

const routes: Routes = [
  {
    path: '',
    component: ForestEventsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ForestEventsPageRoutingModule {}
