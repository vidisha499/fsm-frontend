import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PatrolLogsPageRoutingModule } from './patrol-logs-routing.module';

import { PatrolLogsPage } from './patrol-logs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatrolLogsPageRoutingModule,
    TranslateModule
  ],
  declarations: [PatrolLogsPage]
})
export class PatrolLogsPageModule {}
