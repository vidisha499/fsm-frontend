import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OnsiteAttendanceDetailsPageRoutingModule } from './onsite-attendance-details-routing.module';

import { OnsiteAttendanceDetailsPage } from './onsite-attendance-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnsiteAttendanceDetailsPageRoutingModule
  ],
  declarations: [OnsiteAttendanceDetailsPage]
})
export class OnsiteAttendanceDetailsPageModule {}
