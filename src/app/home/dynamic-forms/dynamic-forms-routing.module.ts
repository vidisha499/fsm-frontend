import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DynamicFormsPage } from './dynamic-forms.page';

const routes: Routes = [
  {
    path: '',
    component: DynamicFormsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DynamicFormsPageRoutingModule {}
