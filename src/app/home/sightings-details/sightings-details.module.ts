import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SightingsDetailsPageRoutingModule } from './sightings-details-routing.module';

import { SightingsDetailsPage } from './sightings-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SightingsDetailsPageRoutingModule
  ],
  declarations: [SightingsDetailsPage]
})
export class SightingsDetailsPageModule {}
