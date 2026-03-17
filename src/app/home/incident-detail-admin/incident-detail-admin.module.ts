import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IncidentDetailAdminPageRoutingModule } from './incident-detail-admin-routing.module';

import { IncidentDetailAdminPage } from './incident-detail-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IncidentDetailAdminPageRoutingModule
  ],
  declarations: [IncidentDetailAdminPage]
})
export class IncidentDetailAdminPageModule {}
