import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { IonicModule } from '@ionic/angular';

import { AttendanceListPageRoutingModule } from './attendance-list-routing.module';

import { AttendanceListPage } from './attendance-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AttendanceListPageRoutingModule,
    TranslateModule
  ],
  declarations: [AttendanceListPage]
})
export class AttendanceListPageModule {}
