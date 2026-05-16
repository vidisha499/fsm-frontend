import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ForestEventsPageRoutingModule } from './forest-events-routing.module';

import { ForestEventsPage } from './forest-events.page';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ForestEventsPageRoutingModule,
    TranslateModule.forChild()
  ],
  declarations: [ForestEventsPage]
})
export class ForestEventsPageModule {}
