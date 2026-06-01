import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AssignSitePage } from './assign-site.page';

const routes: Routes = [
  {
    path: '',
    component: AssignSitePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssignSitePageRoutingModule {}
