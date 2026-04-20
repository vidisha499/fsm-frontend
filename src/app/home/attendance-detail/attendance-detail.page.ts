import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../data.service'; // Path apne hisaab se check kar lein

@Component({
  selector: 'app-attendance-detail',
  templateUrl: './attendance-detail.page.html',
  styleUrls: ['./attendance-detail.page.scss'],
  standalone: false
})
export class AttendanceDetailPage implements OnInit {
  attendance: any;

  constructor(
    private dataService: DataService,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // 1. URL se ID check karein (Agar Direct Link ya Refresh hai toh)
    const id = this.route.snapshot.paramMap.get('id');
    
    // 2. DataService se selected record uthao
    this.attendance = this.dataService.getSelectedAttendance();

    // 3. Agar selectedData nahi hai aur ID hai, toh fetch karein
    if (!this.attendance && id) {
      this.dataService.getAttendanceRequestDetails(id).subscribe({
        next: (res: any) => {
          const raw = res.data || res.attendance || res;
          
          // Normalize Keys for Template
          this.attendance = {
            ...raw,
            geofence: raw.geo_name || raw.geofence || 'General Area',
            region: raw.site_name || raw.region || 'Forest Region',
            rangerName: raw.name || raw.rangerName || 'Ranger',
            createdAt: raw.timestamp || raw.entryDateTime || raw.created_at || raw.createdAt
          };
        },
        error: (err) => {
          console.error("Could not load attendance details", err);
          this.navCtrl.navigateBack('/home/attendance-list');
        }
      });
    } else if (!this.attendance) {
      this.navCtrl.navigateBack('/home/attendance-list');
    }
  }

  // Back Button Logic (Header ke glass-btn ke liye)
  goBack() {
    this.navCtrl.back();
  }
}