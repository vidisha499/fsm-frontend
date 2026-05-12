import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlantationDetailPage } from './plantation-detail.page';

const routes: Routes = [
  {
    path: '',
    component: PlantationDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlantationDetailPageRoutingModule {}
