

// import { Component, OnInit } from '@angular/core';
// import { NavController } from '@ionic/angular';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-incident',
//   templateUrl: './incidents.page.html',
//   styleUrls: ['./incidents.page.scss'],
//   standalone: false
// })
// export class IncidentsPage implements OnInit {
//   public statusFilter: string = 'pending';
//   public isModalOpen: boolean = false;

//   constructor(
//     private navCtrl: NavController,
//     private router: Router
    
//   ) {}

//   ngOnInit() { }

//   goBack() {
//     this.navCtrl.back();
//   }

//   triggerCamera() {
//     console.log('Capture incident photo...');
//     // Add logic for Capacitor Camera here
//   }



// goToNewIncident() {
//   // You can add logic here before navigating
//   this.router.navigate(['/new-incident']);
// }
// }

import { Component } from '@angular/core';
import { NavController, AlertController, ToastController } from '@ionic/angular'; // Added Alert and Toast
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-incident',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  standalone: false,
  
})
export class IncidentsPage {
  public statusFilter: string = 'pending';
  public incidents: any[] = []; 

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ionViewWillEnter() {
    this.loadIncidents();
  }

  loadIncidents() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    this.http.get(`http://localhost:3000/api/incidents/my-reports/${rangerId}`)
      .subscribe({
        next: (data: any) => { this.incidents = data; },
        error: (err) => { console.error('Fetch failed', err); }
      });
  }

  // --- DELETE LOGIC ---
  async confirmDelete(incidentId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to remove this report?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => { this.deleteIncident(incidentId); }
        }
      ]
    });
    await alert.present();
  }

  deleteIncident(id: number) {
    // this.http.delete(`http://localhost:3000/api/incidents/delete/${id}`)
    // Remove the '/delete' part of the string
this.http.delete(`http://localhost:3000/api/incidents/${id}`)
      .subscribe({
        next: async (res: any) => {
          // Remove from local array to update UI immediately
          this.incidents = this.incidents.filter(item => item.id !== id);
          
          const toast = await this.toastCtrl.create({
            message: 'Incident deleted successfully',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          toast.present();
        },
        error: (err) => { console.error('Delete failed', err); }
      });
  }

  goBack() { this.navCtrl.back(); }

  formatDate(dateString: string) {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
}