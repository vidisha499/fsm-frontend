import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AddPlantationPage } from './add-plantation.page';

const routes: Routes = [
  {
    path: '',
    component: AddPlantationPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [AddPlantationPage],
  exports: [AddPlantationPage]
})
export class AddPlantationPageModule {}
