import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DynamicLabelsPageRoutingModule } from './dynamic-labels-routing.module';

import { DynamicLabelsPage } from './dynamic-labels.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DynamicLabelsPageRoutingModule,
    SharedModule
  ],
  declarations: [DynamicLabelsPage]
})
export class DynamicLabelsPageModule {}
