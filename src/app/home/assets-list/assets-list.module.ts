import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AssetsListPageRoutingModule } from './assets-list-routing.module';

import { AssetsListPage } from './assets-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AssetsListPageRoutingModule
  ],
  declarations: [AssetsListPage]
})
export class AssetsListPageModule {}
