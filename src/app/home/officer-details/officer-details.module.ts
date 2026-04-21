import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OfficerDetailsPageRoutingModule } from './officer-details-routing.module';
import { OfficerDetailsPage } from './officer-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OfficerDetailsPageRoutingModule
  ],
  declarations: [OfficerDetailsPage]
})
export class OfficerDetailsPageModule {}
