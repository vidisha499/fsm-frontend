import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IncidentService } from '../../services/incident.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-events-triggered-admin',
  templateUrl: './events-triggered-admin.page.html',
  styleUrls: ['./events-triggered-admin.page.scss'],
  standalone: false
})
export class EventsTriggeredAdminPage implements OnInit {

  activeTab: string = 'all';
  
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  incidents: any[] = [];
 
  
  filters = {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString()
  };

  eventLogs = [
    { title: 'Fence Breach Alert', category: 'SECURITY', location: 'North Sector', time: '10:30 AM', level: 'Critical', icon: 'shield-outline' },
    { title: 'Routine Patrol Start', category: 'PATROL', location: 'East Gate', time: '09:45 AM', level: 'Info', icon: 'walk-outline' },
    { title: 'Temperature Warning', category: 'SENSORS', location: 'Core Forest', time: '08:15 AM', level: 'Warning', icon: 'thermometer-outline' },
    { title: 'Animal Movement', category: 'MONITORING', location: 'Zone B', time: '07:30 AM', level: 'Info', icon: 'paw-outline' },
  ];

  constructor(private modalCtrl: ModalController,
    private navCtrl: NavController,
    private router: Router,
    private incidentService: IncidentService) { }

  ngOnInit() {
    this.loadIncidents();
  }

  // This ensures data refreshes every time the admin opens this specific view
 ionViewWillEnter() {
  this.loadIncidents();
}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  applyFilters() {
    this.isModalOpen = false;
  }

  resetFilters() {
    this.isModalOpen = false;
  }

  // loadIncidents() {
  //   const companyId = localStorage.getItem('company_id');
  //   if (companyId) {
  //     this.incidentService.getCompanyIncidents(Number(companyId)).subscribe({
  //       next: (data) => {
  //         this.incidents = data;
  //         this.isLoading = false;
  //       },
  //       error: (err) => {
  //         console.error('Error fetching admin incidents:', err);
  //         this.isLoading = false;
  //       }
  //     });
  //   }
  // }

loadIncidents() {
  const companyId = localStorage.getItem('company_id');
  if (companyId) {
    this.isLoading = true;
    this.incidentService.getCompanyIncidents(Number(companyId)).subscribe({
     // Inside your loadIncidents() function:
next: (data) => {
  // Sort here so the newest incident (like ID 15) is always at the TOP
  this.incidents = data.sort((a, b) => b.id - a.id); 
  this.isLoading = false;
  console.log('Incidents loaded:', data);
},
      error: (err) => {
        this.isLoading = false;
      }
    });
  }
}

  doRefresh(event: any) {
    const companyId = localStorage.getItem('company_id');
    this.incidentService.getCompanyIncidents(Number(companyId)).subscribe({
      next: (data) => {
        this.incidents = data.sort((a, b) => b.id - a.id);
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }

// async openIncidentDetail(incident: any) {
//   if (incident && incident.id) {
//     // 1. Close the current Modal so the user can see the transition
//     await this.modalCtrl.dismiss(); 
    
//     // 2. Now navigate to the details page
//     this.router.navigate(['/incident-detail-admin', incident.id]);
//   }
// }

async openIncidentDetail(incident: any) {
  if (incident && incident.id) {
    // This removes the "Triggered Events" modal overlay
    await this.modalCtrl.dismiss(); 
    
    // This tells the app to transition to the detail page on the main screen
    this.router.navigate(['/incident-detail-admin', incident.id]);
  }
}

}