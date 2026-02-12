import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // 1. Import this
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AttendancePageRoutingModule } from './attendance-routing.module';
import { AttendancePage } from './attendance.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AttendancePageRoutingModule,
    TranslateModule.forChild()
   
  ],
  declarations: [AttendancePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // 2. Add this line here
})
export class AttendancePageModule {}