import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DailyUpdatesPageRoutingModule } from './daily-updates-routing.module';

import { DailyUpdatesPage } from './daily-updates.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DailyUpdatesPageRoutingModule
  ],
  declarations: [DailyUpdatesPage]
})
export class DailyUpdatesPageModule {}
