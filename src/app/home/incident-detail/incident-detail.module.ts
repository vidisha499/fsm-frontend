import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IncidentDetailPageRoutingModule } from './incident-detail-routing.module';

import { IncidentDetailPage } from './incident-detail.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IncidentDetailPageRoutingModule,
    TranslateModule
  ],
  declarations: [IncidentDetailPage]
})
export class IncidentDetailPageModule {}
