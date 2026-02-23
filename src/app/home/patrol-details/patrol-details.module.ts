import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatrolDetailsPageRoutingModule } from './patrol-details-routing.module';

import { PatrolDetailsPage } from './patrol-details.page';
import { TranslateModule } from '@ngx-translate/core'
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatrolDetailsPageRoutingModule,
       TranslateModule
  ],
  declarations: [PatrolDetailsPage]
})
export class PatrolDetailsPageModule {}
