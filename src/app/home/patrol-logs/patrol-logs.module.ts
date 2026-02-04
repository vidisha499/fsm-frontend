import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatrolLogsPageRoutingModule } from './patrol-logs-routing.module';

import { PatrolLogsPage } from './patrol-logs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatrolLogsPageRoutingModule
  ],
  declarations: [PatrolLogsPage]
})
export class PatrolLogsPageModule {}
