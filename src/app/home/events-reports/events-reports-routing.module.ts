import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EventsReportsPage } from './events-reports.page';

const routes: Routes = [
  {
    path: '',
    component: EventsReportsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventsReportsPageRoutingModule {}
