import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TodaysPatrolsAdminPageRoutingModule } from './todays-patrols-admin-routing.module';

import { TodaysPatrolsAdminPage } from './todays-patrols-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TodaysPatrolsAdminPageRoutingModule
  ],
  declarations: [TodaysPatrolsAdminPage]
})
export class TodaysPatrolsAdminPageModule {}
