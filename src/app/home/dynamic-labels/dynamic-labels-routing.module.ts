import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DynamicLabelsPage } from './dynamic-labels.page';

const routes: Routes = [
  {
    path: '',
    component: DynamicLabelsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DynamicLabelsPageRoutingModule {}
