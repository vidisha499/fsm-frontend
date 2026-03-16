import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EventsTriggeredAdminPage } from './events-triggered-admin.page';

const routes: Routes = [
  {
    path: '',
    component: EventsTriggeredAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventsTriggeredAdminPageRoutingModule {}
