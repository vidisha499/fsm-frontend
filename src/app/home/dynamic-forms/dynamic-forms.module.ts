import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DynamicFormsPageRoutingModule } from './dynamic-forms-routing.module';

import { DynamicFormsPage } from './dynamic-forms.page';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DynamicFormsPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [DynamicFormsPage]
})
export class DynamicFormsPageModule {}
