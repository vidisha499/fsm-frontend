import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlantationsPage } from './plantations.page';

const routes: Routes = [
  {
    path: '',
    component: PlantationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlantationsPageRoutingModule {}
