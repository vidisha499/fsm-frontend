import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EventsFieldsPageRoutingModule } from './events-fields-routing.module';

import { EventsFieldsPage } from './events-fields.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EventsFieldsPageRoutingModule
  ],
  declarations: [EventsFieldsPage]
})
export class EventsFieldsPageModule {}
