import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GeofencesPageRoutingModule } from './geofences-routing.module';

import { GeofencesPage } from './geofences.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GeofencesPageRoutingModule
  ],
  declarations: [GeofencesPage]
})
export class GeofencesPageModule {}
