import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OnsiteAttendanceLogsPageRoutingModule } from './onsite-attendance-logs-routing.module';

import { OnsiteAttendanceLogsPage } from './onsite-attendance-logs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnsiteAttendanceLogsPageRoutingModule
  ],
  declarations: [OnsiteAttendanceLogsPage]
})
export class OnsiteAttendanceLogsPageModule {}
