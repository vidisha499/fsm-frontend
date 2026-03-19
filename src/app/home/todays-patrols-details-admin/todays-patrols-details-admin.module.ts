import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TodaysPatrolsDetailsAdminPageRoutingModule } from './todays-patrols-details-admin-routing.module';
import { TodaysPatrolsDetailsAdminPage } from './todays-patrols-details-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, // This fixes the 'ion-content' error
    TodaysPatrolsDetailsAdminPageRoutingModule
  ],
  declarations: [TodaysPatrolsDetailsAdminPage]
})
export class TodaysPatrolsDetailsAdminPageModule {}