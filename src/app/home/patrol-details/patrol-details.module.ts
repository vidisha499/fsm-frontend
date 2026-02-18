import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatrolDetailsPageRoutingModule } from './patrol-details-routing.module';

import { PatrolDetailsPage } from './patrol-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatrolDetailsPageRoutingModule
  ],
  declarations: [PatrolDetailsPage]
})
export class PatrolDetailsPageModule {}
