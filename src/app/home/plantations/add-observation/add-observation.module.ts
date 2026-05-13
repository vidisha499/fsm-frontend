import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddObservationPageRoutingModule } from './add-observation-routing.module';
import { AddObservationPage } from './add-observation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddObservationPageRoutingModule
  ],
  declarations: [AddObservationPage]
})
export class AddObservationPageModule {}
