import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OrgManagementPageRoutingModule } from './org-management-routing.module';

import { OrgManagementPage } from './org-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OrgManagementPageRoutingModule
  ],
  declarations: [OrgManagementPage]
})
export class OrgManagementPageModule {}
