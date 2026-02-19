import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./home/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  // --- ADD THIS BLOCK HERE ---
  {
    path: 'enroll',
    loadChildren: () => import('./home/enroll/enroll.module').then( m => m.EnrollPageModule)
  },
  // ---------------------------
  {
    path: 'attendance',
    loadChildren: () => import('./home/attendance/attendance.module').then( m => m.AttendancePageModule)
  },
  {
    path: 'onsite-attendance',
    loadChildren: () => import('./home/onsite-attendance/onsite-attendance.module').then( m => m.OnsiteAttendancePageModule)
  },
  {
    path: 'patrol-logs',
    loadChildren: () => import('./home/patrol-logs/patrol-logs.module').then( m => m.PatrolLogsPageModule)
  },
  {
    path: 'incidents',
    loadChildren: () => import('./home/incidents/incidents.module').then( m => m.IncidentsPageModule)
  },
  {
    path: 'new-incident',
    loadChildren: () => import('./home/new-incident/new-incident.module').then( m => m.NewIncidentPageModule)
  },
  {
    path: 'patrol-active',
    loadChildren: () => import('./home/patrol-active/patrol-active.module').then(m => m.PatrolActivePageModule)
  },
  {
  path: 'incident-detail/:id',
  loadChildren: () => import('./home/incident-detail/incident-detail.module').then(m => m.IncidentDetailPageModule)
},
  {
    path: 'signup-details',
    loadChildren: () => import('./home/signup-details/signup-details.module').then( m => m.SignupDetailsPageModule)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }