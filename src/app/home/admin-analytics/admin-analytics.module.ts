import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAnalyticsPageRoutingModule } from './admin-analytics-routing.module';

import { AdminAnalyticsPage } from './admin-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAnalyticsPageRoutingModule
  ],
  declarations: [AdminAnalyticsPage]
})
export class AdminAnalyticsPageModule {}
