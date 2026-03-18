import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AttendanceRequestsPageRoutingModule } from './attendance-requests-routing.module';

import { AttendanceRequestsPage } from './attendance-requests.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AttendanceRequestsPageRoutingModule
  ],
  declarations: [AttendanceRequestsPage]
})
export class AttendanceRequestsPageModule {}
