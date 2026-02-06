import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit {
  // ✅ All properties must be declared here
  public isEntry: boolean = true;
  public capturedPhoto: string = '';
  public rangerName: string = 'Loading...';
  public rangerRegion: string = 'Washim'; // Added missing property
  public selectedSite: string = 'panna';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load data from storage
    this.rangerName = localStorage.getItem('ranger_username') || 'Ranger';
    const storedRegion = localStorage.getItem('ranger_region');
    this.rangerRegion = storedRegion ? storedRegion : 'Washim';
  }

  goBack() {
    this.navCtrl.back();
  }

  setMode(entry: boolean) {
    this.isEntry = entry;
  }

  

 // attendance.page.ts
async captureImage() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      // ✅ Change this from 'Prompt' to 'Camera' to force the lens to open
      source: CameraSource.Camera 
    });

    if (image.base64String) {
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
    }
  } catch (error) {
    console.warn('Camera closed');
  }
}
  async submitAttendance() {
    const rangerId = localStorage.getItem('ranger_id');

    if (!rangerId) {
      this.presentToast('Error: No Ranger ID found.', 'danger');
      return;
    }

    if (!this.capturedPhoto) {
      this.presentToast('Please capture ID photo first!', 'warning');
      return;
    }

    // ✅ Fixed Syntax: Using commas (,) not semicolons (;) inside objects
    const attendanceData = {
      ranger_id: Number(rangerId),
      photo: this.capturedPhoto,
      rangerName: this.rangerName,
      region: this.rangerRegion,
      geofence: this.selectedSite,
      type: this.isEntry ? 'ENTRY' : 'EXIT',
      timestamp: new Date()
    };

    this.http.post('http://localhost:3000/api/attendance', attendanceData)
      .subscribe({
        next: async (res: any) => {
          await this.presentToast('Attendance Marked Successfully!', 'success');
          setTimeout(() => this.navCtrl.back(), 2000);
        },
        error: async (err) => {
          console.error('API Error:', err);
          this.presentToast('Database Sync Failed.', 'danger');
        }
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color,
      mode: 'ios'
    });
    toast.present();
  }
}