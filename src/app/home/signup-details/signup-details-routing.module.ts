import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SignupDetailsPage } from './signup-details.page';

const routes: Routes = [
  {
    path: '',
    component: SignupDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupDetailsPageRoutingModule {}
