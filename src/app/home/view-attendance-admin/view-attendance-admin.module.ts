import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewAttendanceAdminPageRoutingModule } from './view-attendance-admin-routing.module';

import { ViewAttendanceAdminPage } from './view-attendance-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewAttendanceAdminPageRoutingModule
  ],
  declarations: [ViewAttendanceAdminPage]
})
export class ViewAttendanceAdminPageModule {}
