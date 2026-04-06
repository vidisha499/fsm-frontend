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
  },
  {
    path: 'incident-detail',
    loadChildren: () => import('./incident-detail/incident-detail.module').then( m => m.IncidentDetailPageModule)
  },
  {
    path: 'sightings',
    loadChildren: () => import('./sightings/sightings.module').then( m => m.SightingsPageModule)
  },
  {
    path: 'patrol-details',
    loadChildren: () => import('./patrol-details/patrol-details.module').then( m => m.PatrolDetailsPageModule)
  },
  {
    path: 'signup-details',
    loadChildren: () => import('./signup-details/signup-details.module').then( m => m.SignupDetailsPageModule)
  },
  {
    path: 'location',
    loadChildren: () => import('./location/location.module').then( m => m.LocationPageModule)
  },
  {

    path: 'onsite-attendance-logs',
    loadChildren: () => import('./onsite-attendance-logs/onsite-attendance-logs.module').then( m => m.OnsiteAttendanceLogsPageModule)
  },
  {
    path: 'onsite-attendance-details',
    loadChildren: () => import('./onsite-attendance-details/onsite-attendance-details.module').then( m => m.OnsiteAttendanceDetailsPageModule)
  },
  {
    path: 'attendance-list',
    loadChildren: () => import('./attendance-list/attendance-list.module').then( m => m.AttendanceListPageModule)
  },
  {
    path: 'attendance-detail',
    loadChildren: () => import('./attendance-detail/attendance-detail.module').then( m => m.AttendanceDetailPageModule)

  },
  {
    path: 'sightings-details',
    loadChildren: () => import('./sightings-details/sightings-details.module').then( m => m.SightingsDetailsPageModule)
  },
 
{
path:'admin',
loadChildren:() => import('./admin/admin.module').then( m => m.AdminPageModule)
},

  {
    path: 'attendance-requests',
    loadChildren: () => import('./attendance-requests/attendance-requests.module').then( m => m.AttendanceRequestsPageModule)
  },

  {
    path: 'category',
    loadChildren: () => import('./category/category.module').then( m => m.CategoryPageModule)
  },
  {
    path: 'admin-analytics',
    loadChildren: () => import('./admin-analytics/admin-analytics.module').then( m => m.AdminAnalyticsPageModule)
  },
  {
    path: 'admin-settings',
    loadChildren: () => import('./admin-settings/admin-settings.module').then( m => m.AdminSettingsPageModule)
  },
  {
    path: 'assets',
    loadChildren: () => import('./assets/assets.module').then( m => m.AssetsPageModule)
  },
  {
    path: 'assets-list',
    loadChildren: () => import('./assets-list/assets-list.module').then( m => m.AssetsListPageModule)
  },
  {
    path: 'assets-details',
    loadChildren: () => import('./assets-details/assets-details.module').then( m => m.AssetDetailsPageModule)
  },  {
    path: 'forest-events',
    loadChildren: () => import('./forest-events/forest-events.module').then( m => m.ForestEventsPageModule)
  },
  {
    path: 'events-fields',
    loadChildren: () => import('./events-fields/events-fields.module').then( m => m.EventsFieldsPageModule)
  },


 



 
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
