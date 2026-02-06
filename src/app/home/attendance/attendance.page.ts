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
  public isEntry: boolean = true;
  public capturedPhoto: string | undefined = undefined;
  public rangerName: string = 'Ranger';
  public selectedGeofence: string = 'Panna Site';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const storedName = localStorage.getItem('ranger_name');
    if (storedName) {
      this.rangerName = storedName;
    }
  }

  goBack() { this.navCtrl.back(); }
  setMode(entry: boolean) { this.isEntry = entry; }

async captureImage() {
  try {
    const image = await Camera.getPhoto({
      quality: 30, // Low quality to prevent "413 Request Entity Too Large"
      allowEditing: false, // Set to true if you want rangers to crop the photo
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera, // ✅ FORCES the native camera to open
      promptLabelHeader: 'Capture Attendance Photo',
      promptLabelPhoto: 'From Gallery', // Optional: if you want to allow gallery
      promptLabelPicture: 'Take Photo'  // Optional: labels for the prompt
    });

    if (image.base64String) {
      this.capturedPhoto = `data:image/jpeg;base64,${image.base64String}`;
      this.presentToast('Photo captured successfully!', 'success');
    }
  } catch (error) {
    console.error('Camera error:', error);
    // This catches when the user cancels or denies permission
    this.presentToast('Camera access was cancelled.', 'warning');
  }
}

  async submitAttendance() {
    const rangerId = localStorage.getItem('ranger_id');

    if (!this.capturedPhoto) {
      this.presentToast('Please capture a photo first!', 'warning');
      return;
    }

    const attendanceData = {
      ranger_id: Number(rangerId), // Ensure it's a number
      photo: this.capturedPhoto, 
      ranger: this.rangerName,
      geofence: this.selectedGeofence,
      // Ensure your backend entity has a column for 'type' if you send this:
      type: this.isEntry ? 'ENTRY' : 'EXIT' 
    };

    // Note: localhost:3000 only works on browser. 
    // Use your IP address if testing on a real phone!
    this.http.post('http://localhost:3000/api/attendance/beat-attendance', attendanceData)
      .subscribe({
        next: (res) => {
          this.presentToast('Attendance saved successfully!', 'success');
          setTimeout(() => this.navCtrl.back(), 1500);
        },
        error: (err) => {
          console.error(err);
          this.presentToast('Upload failed. Check server limits.', 'danger');
        }
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}