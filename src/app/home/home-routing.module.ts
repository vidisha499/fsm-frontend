import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'attendance',
    loadChildren: () => import('./attendance/attendance.module').then( m => m.AttendancePageModule)
  },
  {
    path: 'onsite-attendance',
    loadChildren: () => import('./onsite-attendance/onsite-attendance.module').then( m => m.OnsiteAttendancePageModule)
  },
  {
    path: 'patrol-logs',
    loadChildren: () => import('./patrol-logs/patrol-logs.module').then( m => m.PatrolLogsPageModule)
  },
  {
    path: 'incidents',
    loadChildren: () => import('./incidents/incidents.module').then( m => m.IncidentsPageModule)
  },
  {
    path: 'new-incident',
    loadChildren: () => import('./new-incident/new-incident.module').then( m => m.NewIncidentPageModule)
  },
  {
    path: 'patrol-active',
    loadChildren: () => import('./patrol-active/patrol-active.module').then( m => m.PatrolActivePageModule)
  },
  {
    path: 'enroll',
    loadChildren: () => import('./enroll/enroll.module').then( m => m.EnrollPageModule)
  },  {
    path: 'incident-detail',
    loadChildren: () => import('./incident-detail/incident-detail.module').then( m => m.IncidentDetailPageModule)
  },
  {
    path: 'sightings',
    loadChildren: () => import('./sightings/sightings.module').then( m => m.SightingsPageModule)
  },

 
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
