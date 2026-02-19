import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignupDetailsPageRoutingModule } from './signup-details-routing.module';

import { SignupDetailsPage } from './signup-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignupDetailsPageRoutingModule
  ],
  declarations: [SignupDetailsPage]
})
export class SignupDetailsPageModule {}
