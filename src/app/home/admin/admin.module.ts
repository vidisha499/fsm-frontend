import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// This name must match Line 17 of your admin-routing.module.ts
import { AdminPageRoutingModule } from './admin-routing.module'; 
import { AdminPage } from './admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminPageRoutingModule // Ensure this matches the import above
  ],
  declarations: [AdminPage]
})
export class AdminPageModule {} // Change this from SuperAdminPageModule