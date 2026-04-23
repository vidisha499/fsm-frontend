import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminFireRecordsPageRoutingModule } from './admin-fire-records-routing.module';

import { AdminFireRecordsPage } from './admin-fire-records.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminFireRecordsPageRoutingModule
  ],
  declarations: [AdminFireRecordsPage]
})
export class AdminFireRecordsPageModule {}
