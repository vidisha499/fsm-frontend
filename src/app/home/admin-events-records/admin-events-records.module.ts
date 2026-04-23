import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminEventsRecordsPageRoutingModule } from './admin-events-records-routing.module';

import { AdminEventsRecordsPage } from './admin-events-records.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminEventsRecordsPageRoutingModule
  ],
  declarations: [AdminEventsRecordsPage]
})
export class AdminEventsRecordsPageModule {}
