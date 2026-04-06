import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ForestEventsPageRoutingModule } from './forest-events-routing.module';

import { ForestEventsPage } from './forest-events.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ForestEventsPageRoutingModule
  ],
  declarations: [ForestEventsPage]
})
export class ForestEventsPageModule {}
