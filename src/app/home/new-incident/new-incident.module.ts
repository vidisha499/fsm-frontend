import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NewIncidentPageRoutingModule } from './new-incident-routing.module';

import { NewIncidentPage } from './new-incident.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NewIncidentPageRoutingModule,
    TranslateModule
  ],
  declarations: [NewIncidentPage]
})
export class NewIncidentPageModule {}
