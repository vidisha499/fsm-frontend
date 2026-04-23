import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminCriminalRecordsPageRoutingModule } from './admin-criminal-records-routing.module';

import { AdminCriminalRecordsPage } from './admin-criminal-records.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminCriminalRecordsPageRoutingModule
  ],
  declarations: [AdminCriminalRecordsPage]
})
export class AdminCriminalRecordsPageModule {}
