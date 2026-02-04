

// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { NavController, AlertController, ToastController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';

// @Component({
//   selector: 'app-patrol-logs',
//   templateUrl: './patrol-logs.page.html',
//   styleUrls: ['./patrol-logs.page.scss'],
//   standalone: false
// })
// export class PatrolLogsPage implements OnInit {
//   public patrolLogs: any[] = [];
//   private apiUrl = 'http://localhost:3000/api/patrol';

//   constructor(
//     private navCtrl: NavController,
//     private router: Router,
//     private http: HttpClient,
//     private alertCtrl: AlertController,
//     private toastCtrl: ToastController
//   ) { }

//   ngOnInit() { }

//   ionViewWillEnter() {
//     this.loadPatrolLogs();
//   }

//   loadPatrolLogs() {
//     const rangerId = localStorage.getItem('ranger_id');
//     if (!rangerId) return;

//     this.http.get(`${this.apiUrl}/my-logs/${rangerId}`)
//       .subscribe({
//         next: (data: any) => { this.patrolLogs = data; },
//         error: (err) => { console.error('Error fetching patrol logs', err); }
//       });
//   }

//   // --- POP UP LOGIC ---
//   async startNewPatrol() {
//     const alert = await this.alertCtrl.create({
//       header: 'Start Trip?',
//       message: 'Do you want to begin a new patrol session?',
//       buttons: [
//         { text: 'Cancel', role: 'cancel' },
//         {
//           text: 'OK',
//           handler: () => {
//             // Save the start time in localStorage to use it later when ending the trip
//             localStorage.setItem('patrol_start_time', new Date().toISOString());
//             this.router.navigate(['/patrol-active']);
//           }
//         }
//       ]
//     });
//     await alert.present();
//   }

//   goBack() { this.navCtrl.back(); }

//   formatDateTime(start: string, end: string) {
//     if (!start || !end) return 'Time N/A';
//     const s = new Date(start);
//     const e = new Date(end);
//     return `${s.toLocaleDateString()}, ${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${e.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
//   }
// }

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, AlertController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-patrol-logs',
  templateUrl: './patrol-logs.page.html',
  styleUrls: ['./patrol-logs.page.scss'],
  standalone: false
})
export class PatrolLogsPage implements OnInit {
  public patrolLogs: any[] = [];
  // FIXED: Changed 'patrol' to 'patrols' to match index.mjs
  private apiUrl = 'http://localhost:3000/api/patrols';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadPatrolLogs();
  }

  loadPatrolLogs() {
    const rangerId = localStorage.getItem('ranger_id');
    if (!rangerId) return;

    // This correctly requests only THIS ranger's logs
    this.http.get(`${this.apiUrl}/my-logs/${rangerId}`)
      .subscribe({
        next: (data: any) => { this.patrolLogs = data; },
        error: (err) => { console.error('Error fetching patrol logs', err); }
      });
  }

  async startNewPatrol() {
    const alert = await this.alertCtrl.create({
      header: 'Start Trip?',
      message: 'Do you want to begin a new patrol session?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: () => {
            localStorage.setItem('patrol_start_time', new Date().toISOString());
            this.router.navigate(['/patrol-active']);
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() { this.navCtrl.back(); }

  formatDateTime(start: string, end: string) {
    if (!start || !end) return 'Time N/A';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString()}, ${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${e.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }
}