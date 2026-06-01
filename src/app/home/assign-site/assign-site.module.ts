import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AssignSitePageRoutingModule } from './assign-site-routing.module';

import { AssignSitePage } from './assign-site.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AssignSitePageRoutingModule
  ],
  declarations: [AssignSitePage]
})
export class AssignSitePageModule {}
