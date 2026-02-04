import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OnsiteAttendancePageRoutingModule } from './onsite-attendance-routing.module';
import { OnsiteAttendancePage } from './onsite-attendance.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnsiteAttendancePageRoutingModule
  ],
  declarations: [OnsiteAttendancePage]
})
export class OnsiteAttendancePageModule {}