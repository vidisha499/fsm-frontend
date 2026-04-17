import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { EventsReportsPageRoutingModule } from './events-reports-routing.module';
import { EventsReportsPage } from './events-reports.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    EventsReportsPageRoutingModule
  ],
  declarations: [EventsReportsPage]
})
export class EventsReportsPageModule {}
