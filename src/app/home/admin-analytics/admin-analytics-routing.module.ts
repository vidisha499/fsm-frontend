import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAnalyticsPage } from './admin-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAnalyticsPageRoutingModule {}
