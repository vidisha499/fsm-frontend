// import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

// import { IonicModule } from '@ionic/angular';

// import { IncidentsPageRoutingModule } from './incidents-routing.module';

// import { IncidentsPage } from './incidents.page';

// @NgModule({
//   imports: [
//     CommonModule,
//     FormsModule,
//     IonicModule,
//     IncidentsPageRoutingModule
//   ],
//   declarations: [IncidentsPage]
// })
//  export class IncidentsPageModule {}




import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IncidentsPageRoutingModule } from './incidents-routing.module';
import { IncidentsPage } from './incidents.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IncidentsPageRoutingModule,
    TranslateModule
  ],
  declarations: [IncidentsPage]
})
export class IncidentsPageModule {}