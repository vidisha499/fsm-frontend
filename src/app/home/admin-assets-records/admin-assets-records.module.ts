import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAssetsRecordsPageRoutingModule } from './admin-assets-records-routing.module';

import { AdminAssetsRecordsPage } from './admin-assets-records.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAssetsRecordsPageRoutingModule
  ],
  declarations: [AdminAssetsRecordsPage]
})
export class AdminAssetsRecordsPageModule {}
