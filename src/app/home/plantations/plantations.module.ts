import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PlantationsPageRoutingModule } from './plantations-routing.module';
import { PlantationsPage } from './plantations.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlantationsPageRoutingModule,
    TranslateModule.forChild()
  ],
  declarations: [PlantationsPage],
  exports: [PlantationsPage]
})
export class PlantationsPageModule {}
