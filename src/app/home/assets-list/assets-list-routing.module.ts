import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AssetsListPage } from './assets-list.page';

const routes: Routes = [
  {
    path: '',
    component: AssetsListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssetsListPageRoutingModule {}
