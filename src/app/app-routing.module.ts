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
  {
    path: 'attendance-list',
    loadChildren: () => import('./home/attendance-list/attendance-list.module').then(m => m.AttendanceListPageModule)
  },
  {
    path: 'attendance-detail/:id',
    loadChildren: () => import('./home/attendance-detail/attendance-detail.module').then(m => m.AttendanceDetailPageModule)
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
  path: 'patrol-details/:id', // Add the :id parameter here
  loadChildren: () => import('./home/patrol-details/patrol-details.module').then(m => m.PatrolDetailsPageModule)
},
  {
  path: 'incident-detail/:id',
  loadChildren: () => import('./home/incident-detail/incident-detail.module').then(m => m.IncidentDetailPageModule)
},
  {
    path: 'signup-details',
    loadChildren: () => import('./home/signup-details/signup-details.module').then( m => m.SignupDetailsPageModule)
  },
  {
    // ADD THIS BLOCK
    path: 'location',
    loadChildren: () => import('./home/location/location.module').then(m => m.LocationPageModule)
  },
{
  path: 'onsite-attendance-logs',
  loadChildren: () => import('./home/onsite-attendance-logs/onsite-attendance-logs.module').then(m => m.OnsiteAttendanceLogsPageModule)
},
{
  path: 'onsite-attendance-details',
  loadChildren: () => import('./home/onsite-attendance-details/onsite-attendance-details.module').then(m => m.OnsiteAttendanceDetailsPageModule)
},
{
  path: 'sightings-details/:id',
  loadChildren: () => import('./home/sightings-details/sightings-details.module').then(m => m.SightingsDetailsPageModule)
},
{
path:'admin',
loadChildren:() => import('./home/admin/admin.module').then( m => m.AdminPageModule)
},

{
    path: 'attendance-requests',
    loadChildren: () => import('./home/attendance-requests/attendance-requests.module').then(m => m.AttendanceRequestsPageModule)
},

{
  path: 'assets',
  loadChildren: () => import('./home/assets/assets.module').then( m => m.AssetsPageModule)
},
{
  path: 'assets-list',
  loadChildren: () => import('./home/assets-list/assets-list.module').then( m => m.AssetsListPageModule)
},
{
  path: 'assets-details',
  loadChildren: () => import('./home/assets-details/assets-details.module').then( m => m.AssetDetailsPageModule)
},


  {
    path: 'admin-analytics',
    loadChildren: () => import('./home/admin-analytics/admin-analytics.module').then(m => m.AdminAnalyticsPageModule)
  },
  {
    path: 'admin-settings',
    loadChildren: () => import('./home/admin-settings/admin-settings.module').then(m => m.AdminSettingsPageModule)
  },
  {
  path: 'forest-events',
  loadChildren: () => import('./home/forest-events/forest-events.module').then(m => m.ForestEventsPageModule)
},

{
  path: 'events-fields/:title/:category', // Dono parameters add kar diye
  loadChildren: () => import('./home/events-fields/events-fields.module').then(m => m.EventsFieldsPageModule)
},
{
    path: 'category',
    loadChildren: () => import('./home/category/category.module').then( m => m.CategoryPageModule)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }