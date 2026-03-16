import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EventsTriggeredAdminPageRoutingModule } from './events-triggered-admin-routing.module';

import { EventsTriggeredAdminPage } from './events-triggered-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EventsTriggeredAdminPageRoutingModule
  ],
  declarations: [EventsTriggeredAdminPage]
})
export class EventsTriggeredAdminPageModule {}
