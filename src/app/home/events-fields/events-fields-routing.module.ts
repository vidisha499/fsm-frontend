import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EventsFieldsPage } from './events-fields.page';

const routes: Routes = [
  {
    path: '',
    component: EventsFieldsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventsFieldsPageRoutingModule {}
