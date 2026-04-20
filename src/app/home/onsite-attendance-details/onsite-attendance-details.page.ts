import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-onsite-attendance-details',
  templateUrl: './onsite-attendance-details.page.html',
  styleUrls: ['./onsite-attendance-details.page.scss'],
  standalone: false 
})
export class OnsiteAttendanceDetailsPage implements OnInit {
  public attendanceData: any;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dataService: DataService
  ) {}

  ngOnInit() {
    const log = this.dataService.getSelectedAttendance();
    if (log) {
      this.attendanceData = {
        ...log,
        geofence: log.geo_name || log.geofence || 'Verified Location',
        region: log.site_name || log.region || 'Onsite',
        rangerName: log.name || log.rangerName || 'Ranger',
        createdAt: log.timestamp || log.entryDateTime || log.created_at || log.createdAt || new Date(),
        type: log.type || 'ONSITE',
        photo: log.photo
      };
    } else {
      // Get ID from Query Params as fallback
      this.route.queryParams.subscribe(params => {
        if (params['id']) {
          this.loadDetails(params['id']);
        }
      });
    }
  }

  // 2. Update loadDetails to trigger the map if the page is already active
  loadDetails(id: string) {
    this.dataService.getAttendanceRequestDetails(id).subscribe({
      next: (res: any) => {
        // Sir's API data normalization
        const raw = res.data || res.attendance || res;
        
        this.attendanceData = {
          ...raw,
          geofence: raw.geo_name || raw.geofence || 'Verified Location',
          region: raw.site_name || raw.region || 'Onsite',
          rangerName: raw.name || raw.rangerName || 'Ranger',
          createdAt: raw.timestamp || raw.entryDateTime || raw.created_at || new Date(),
          type: raw.type || 'ONSITE',
          photo: raw.photo
        };
      },
      error: (err) => console.error('Error loading details via Sir\'s API', err)
    });
  }

  goBack() { this.navCtrl.back(); }
}