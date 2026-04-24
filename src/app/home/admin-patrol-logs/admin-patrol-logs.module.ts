import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminPatrolLogsPageRoutingModule } from './admin-patrol-logs-routing.module';

import { AdminPatrolLogsPage } from './admin-patrol-logs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminPatrolLogsPageRoutingModule
  ],
  declarations: [AdminPatrolLogsPage]
})
export class AdminPatrolLogsPageModule {}
