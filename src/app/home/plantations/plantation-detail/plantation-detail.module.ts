import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PlantationDetailPageRoutingModule } from './plantation-detail-routing.module';
import { PlantationDetailPage } from './plantation-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlantationDetailPageRoutingModule
  ],
  declarations: [PlantationDetailPage]
})
export class PlantationDetailPageModule {}
