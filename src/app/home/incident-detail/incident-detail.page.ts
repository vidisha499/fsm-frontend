
// import { Component, OnInit } from '@angular/core';
// import { DataService } from '../../data.service';
// import { ActivatedRoute } from '@angular/router'; // Added
// import { NavController, ToastController } from '@ionic/angular';
// import { TranslateService } from '@ngx-translate/core';
// import { HttpClient } from '@angular/common/http'; // Added
// import { environment } from 'src/environments/environment';

// @Component({
//   selector: 'app-incident-detail',
//   templateUrl: './incident-detail.page.html',
//   styleUrls: ['./incident-detail.page.scss'],
//   standalone: false
// })
// export class IncidentDetailPage implements OnInit {
//   incident: any;
//   currentRanger: string = 'Ranger';
//   isSubmitting: boolean = false;
//   selectedZoomImage: string | null = null;
//   // readonly API_URL = 'http://localhost:3000/incidents'; // Update to your NestJS URL
//   private googleApiKey: string = 'AIzaSyB3vWehpSsEW0GKMTITfzB_1wDJGNxJ5Fw';
//   private apiUrl: string = `${environment.apiUrl}/incidents`;

//   constructor(
//     private dataService: DataService,
//     private navCtrl: NavController,
//     public toastCtrl: ToastController,
//     private translate: TranslateService,
//     private route: ActivatedRoute,
//     private http: HttpClient,
//     //  private apiUrl: string = `${environment.apiUrl}/onsite-attendance`;
//   ) { }


//   openZoom(photo: string) {
//   this.selectedZoomImage = photo;
// }

// closeZoom() {
//   this.selectedZoomImage = null;
// }
//   // Change ngOnInit to ionViewWillEnter
// ionViewWillEnter() {
//   // 1. Get the ID from the URL
//   const id = this.route.snapshot.paramMap.get('id');
  
//   // 2. Clear previous data so you don't see the old incident
//   this.incident = null;

//   // 3. Fetch fresh data
//   if (id) {
//     this.fetchIncidentFromBackend(id);
//   }
// }

//   ngOnInit() {
//     // Try to get from DataService first (for speed)
//     this.incident = this.dataService.getSelectedIncident();

//     // If DataService is empty (e.g. on page refresh), fetch from NestJS
//     if (!this.incident) {
//       const id = this.route.snapshot.paramMap.get('id');
//       if (id) {
//         this.fetchIncidentFromBackend(id);
//       }
//     }

//     const storedName = localStorage.getItem('ranger_username');
//     if (storedName) {
//       this.currentRanger = storedName;
//     }
//   }

// fetchIncidentFromBackend(id: string) {
//   this.http.get(`${this.apiUrl}/${id}`).subscribe({
//     next: (data: any) => {
//       // 1. Handle JSON string to Array conversion
//       let parsedPhotos = [];
//       if (data.photos) {
//         parsedPhotos = Array.isArray(data.photos) 
//           ? data.photos 
//           : JSON.parse(data.photos); 
//       }

//       // 2. Final Mapping
//       this.incident = {
//         ...data,
//         criteria: data.incidentCriteria,
//         priority: data.responsePriority,
//         observation: data.fieldObservation,
//         cause: data.rootCause,
//         // Ensure this is a clean array for the [src] bindings
//         photos: parsedPhotos.length > 0 ? parsedPhotos : (data.photo ? [data.photo] : []),
//         photo: data.photo || parsedPhotos[0]
//       };
      
//       console.log('Final Mapped Incident:', this.incident);
//     },
//     error: (err) => {
//       console.error('Error fetching data', err);
//       this.presentToast('Failed to load incident details', 'danger');
//     }
//   });
// }

// // Add this helper if it's missing in your file
// async presentToast(message: string, color: string) {
//   const toast = await this.toastCtrl.create({
//     message, duration: 2000, color, position: 'bottom'
//   });
//   toast.present();
// }


//   goBack() {
//     this.navCtrl.navigateRoot('/home/incidents');
//   }

//   async markAsResolved() {
//     if (this.isSubmitting) return;
//     this.isSubmitting = true;

//     // Call NestJS to update status if needed
//     setTimeout(async () => {
//       this.isSubmitting = false;
//       const toast = await this.toastCtrl.create({
//         message: 'PROTOCOL RESOLVED',
//         duration: 2000,
//         color: 'success',
//         position: 'bottom',
//         icon: 'checkmark-double'
//       });
//       await toast.present();
//       this.navCtrl.back();
//     }, 2000);
//   }
//   viewDetails(incident: any) {
//   this.dataService.setSelectedIncident(incident); // Set it here!
//   this.navCtrl.navigateForward(['/home/incident-detail', incident.id]);
// }

// // Ye function DB ki value ko translation key mein convert karega
// getTranslationKey(value: string | undefined): string {
//   if (!value) return '';
//   // Sab kuch uppercase karke space ko underscore bana do (e.g., 'High Priority' -> 'HIGH_PRIORITY')
//   return value.toUpperCase().replace(/\s+/g, '_');
// }
// }


import { Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.page.html',
  styleUrls: ['./incident-detail.page.scss'],
  standalone: false
})
export class IncidentDetailPage implements OnInit {
  incident: any;
  currentRanger: string = 'Ranger';
  isSubmitting: boolean = false;
  selectedZoomImage: string | null = null;
  private apiUrl: string = `${environment.apiUrl}/incidents`;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController,
    public toastCtrl: ToastController,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit() {
    // Try DataService first for speed
    this.incident = this.dataService.getSelectedIncident();

    const id = this.route.snapshot.paramMap.get('id');
    if (!this.incident && id) {
      this.fetchIncidentFromBackend(id);
    }

    const storedName = localStorage.getItem('ranger_username');
    if (storedName) {
      this.currentRanger = storedName;
    }
  }

  ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fetchIncidentFromBackend(id);
    }
  }

  fetchIncidentFromBackend(id: string) {
    this.http.get(`${this.apiUrl}/${id}`).subscribe({
      next: (data: any) => {
        let parsedPhotos = [];
        if (data.photos) {
          try {
            parsedPhotos = Array.isArray(data.photos) ? data.photos : JSON.parse(data.photos);
          } catch (e) {
            parsedPhotos = [];
          }
        }

        this.incident = {
          ...data,
          criteria: data.incidentCriteria,
          priority: data.responsePriority,
          observation: data.fieldObservation,
          cause: data.rootCause,
          photos: parsedPhotos.length > 0 ? parsedPhotos : (data.photo ? [data.photo] : []),
          photo: data.photo || parsedPhotos[0]
        };
      },
      error: async (err) => {
        const msg = await this.translate.get('INCIDENT.SYNC_ERROR').toPromise();
        this.presentToast(msg, 'danger');
      }
    });
  }

  // Translation Helper for DB Values
getTranslationKey(value: string | undefined | null): string {
  // Check 'value' instead of 'val' to fix the "Cannot find name" error
  if (!value) { 
    return 'UNKNOWN'; 
  }
  
  // Safe conversion to string to handle 'null' or 'undefined' types
  return value.toString().trim().toUpperCase().replace(/\s+/g, '_');
}

  async markAsResolved() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    setTimeout(async () => {
      this.isSubmitting = false;
      const msg = await this.translate.get('INCIDENT.SUCCESS_RESOLVED').toPromise();
      this.presentToast(msg, 'success');
      this.navCtrl.back();
    }, 2000);
  }

  openZoom(photo: string) { this.selectedZoomImage = photo; }
  closeZoom() { this.selectedZoomImage = null; }
  goBack() { this.navCtrl.navigateRoot('/home/incidents'); }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2000, color, position: 'bottom'
    });
    toast.present();
  }
}