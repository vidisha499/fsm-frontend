// import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { IonicModule } from '@ionic/angular';
// import { OnsiteAttendancePageRoutingModule } from './onsite-attendance-routing.module';
// import { OnsiteAttendancePage } from './onsite-attendance.page';

// @NgModule({
//   imports: [
//     CommonModule,
//     FormsModule,
//     IonicModule,
//     OnsiteAttendancePageRoutingModule
//   ],
//   declarations: [OnsiteAttendancePage]
// })
// export class OnsiteAttendancePageModule {}

import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // ✅ Import this
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
  declarations: [OnsiteAttendancePage],
  // ✅ Add this schemas array to allow capacitor-google-map
  schemas: [CUSTOM_ELEMENTS_SCHEMA] 
})
export class OnsiteAttendancePageModule {}