import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NewIncidentPageRoutingModule } from './new-incident-routing.module';

import { NewIncidentPage } from './new-incident.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NewIncidentPageRoutingModule
  ],
  declarations: [NewIncidentPage]
})
export class NewIncidentPageModule {}
