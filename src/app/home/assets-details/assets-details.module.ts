import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AssetsDetailsPageRoutingModule } from './assets-details-routing.module';

import { AssetsDetailsPage } from './assets-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AssetsDetailsPageRoutingModule
  ],
  declarations: [AssetsDetailsPage]
})
export class AssetsDetailsPageModule {}
