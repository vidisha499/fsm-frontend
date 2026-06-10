import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClient } from '@angular/common/http';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DataService } from 'src/app/data.service';
import moment from 'moment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-signup-details',
  templateUrl: './signup-details.page.html',
  styleUrls: ['./signup-details.page.scss'],
  standalone: false
})
export class SignupDetailsPage implements OnInit {
  verifiedData: any = {};
  profileImage: any = null;
  firstName: string = '';
  lastName: string = '';
  dob: string = ''; 
  email: string = '';
  mobile: string = '';
  address: string = ''; 
  password: string = '';
  confirmPassword: string = '';
  passwordType: string = 'password';
  passwordIcon: string = 'eye-off';
  confirmPasswordType: string = 'password';
  confirmPasswordIcon: string = 'eye-off';
  range: string = '';
  beat: string = '';
  gender: string = '';
  shift: string = '';
  weeklyOff: string = '';

  layers: any[] = [];
  layerEntities: { [key: string]: any[] } = {};
  hierarchySelections: any[] = [];
  assignedPath: any[] = [];
  selectedAssignments: any[] = [];
  maxLayerIndexToShow: number = 999;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private dataService: DataService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params['special']) {
        const data = JSON.parse(params['special']);
        this.verifiedData = data; 
        
        console.log("%c📥 [SIGNUP] Starting Merged Hierarchy Sync (VerifyUser + Org API)", "color: #00ff00; font-weight: bold;");

        this.mobile = data.mobile || '';
        
        // Robust Name Extraction: Prioritize individual fields, fallback to splitting 'name'
        const rawFirstName = data.firstName || '';
        const rawLastName = data.lastName || '';
        const fullName = data.name || '';

        if (rawFirstName.trim() || rawLastName.trim()) {
          this.firstName = rawFirstName;
          this.lastName = rawLastName;
        } else if (fullName.trim()) {
          const nameParts = fullName.trim().split(/\s+/);
          this.firstName = nameParts[0];
          this.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        }

        console.log(`👤 [NAME SYNC] Extracted -> First: "${this.firstName}", Last: "${this.lastName}"`);

        const rawLayers = data.hierarchy_layers || [];
        this.assignedPath = data.entity_path || [];

        if (Array.isArray(rawLayers) && rawLayers.length > 0) {
          this.layers = rawLayers.sort((a: any, b: any) => Number(a.rank) - Number(b.rank));
          this.hierarchySelections = new Array(this.layers.length).fill(null);
          
          // Initialize selected assignments from dynamic_entities (pre-assigned nodes)
          if (data.dynamic_entities && Array.isArray(data.dynamic_entities)) {
            this.selectedAssignments = data.dynamic_entities.map((e: any) => {
              const matchedLayer = this.layers.find((l: any) => String(l.id) === String(e.layer_id));
              return {
                id: e.id,
                name: e.name,
                layerId: e.layer_id,
                layerName: matchedLayer ? matchedLayer.name : (e.layer?.name || 'Entity')
              };
            });
          } else if (data.dynamic_entity) {
            const e = data.dynamic_entity;
            const matchedLayer = this.layers.find((l: any) => String(l.id) === String(e.layer_id));
            this.selectedAssignments = [{
              id: e.id,
              name: e.name,
              layerId: e.layer_id,
              layerName: matchedLayer ? matchedLayer.name : (e.layer?.name || 'Entity')
            }];
          } else {
            this.selectedAssignments = [];
          }
          console.log("📍 [SIGNUP] Initialized Pre-assigned Selected Assignments:", this.selectedAssignments);

          // Compute max layer index to show (to restrict rendering Beat/Geofence if only Range is assigned)
          this.maxLayerIndexToShow = this.layers.length - 1; // Default: show all
          if (this.selectedAssignments && this.selectedAssignments.length > 0) {
            let maxIdx = -1;
            this.selectedAssignments.forEach(item => {
              const idx = this.layers.findIndex((l: any) => String(l.id) === String(item.layerId));
              if (idx > maxIdx) {
                maxIdx = idx;
              }
            });
            if (maxIdx !== -1) {
              this.maxLayerIndexToShow = maxIdx;
            }
          }
          console.log("📍 [SIGNUP] Max layer index to show:", this.maxLayerIndexToShow);

          this.loadMergedHierarchy(0, null);
        }
      }
    });
  }

  loadMergedHierarchy(index: number, parentId: any) {
    if (index >= this.layers.length) return;
    if (index > this.maxLayerIndexToShow) return;
    const layer = this.layers[index];
    const companyId = this.verifiedData.company_id || 64;

    console.log(`\n🔍 [SYNC] Level ${index+1}: ${layer.name} (ID: ${layer.id})`);

    // Fetching from BOTH APIs
    forkJoin({
      legacy: this.dataService.listOrgEntities(layer.id, companyId).pipe(catchError(() => of([]))),
      v2: this.dataService.listV2Entities(layer.id, parentId, true, companyId).pipe(catchError(() => of([])))
    }).subscribe(({ legacy, v2 }: any) => {
      const legacyData = legacy?.data || legacy || [];
      const v2Data = v2?.data || v2 || [];

      // Unified Map to match IDs
      const mergedMap = new Map();
      
      // Step 1: Process Legacy Entities
      legacyData.forEach((item: any) => {
        if (item && item.id) mergedMap.set(String(item.id), { ...item, _source: 'Legacy' });
      });

      // Step 2: Process V2 and Match IDs
      v2Data.forEach((item: any) => {
        if (item && item.id) {
          const idStr = String(item.id);
          if (mergedMap.has(idStr)) {
            mergedMap.set(idStr, { ...mergedMap.get(idStr), ...item, _source: 'Merged' });
          } else {
            mergedMap.set(idStr, { ...item, _source: 'V2' });
          }
        }
      });

      // Step 3: MASTER MERGE - Check against selectedAssignments or verifyUser assignedPath
      const matchedSelected = this.selectedAssignments.find(ent => String(ent.layerId) === String(layer.id));
      if (matchedSelected) {
        const idStr = String(matchedSelected.id);
        if (mergedMap.has(idStr)) {
          console.log(`   ✅ MATCHED SELECTED FOUND (VerifyUser + APIs): ${idStr} (${matchedSelected.name})`);
          mergedMap.set(idStr, { ...mergedMap.get(idStr), _matched: true });
        } else {
          console.log(`   📍 Selected ID ${idStr} (${matchedSelected.name}) missing from APIs, forced entry.`);
          mergedMap.set(idStr, { id: matchedSelected.id, name: matchedSelected.name, layer_id: matchedSelected.layerId, _source: 'VerifyUser', _forced: true });
        }

        // AUTO-SELECT the matched/forced node
        this.hierarchySelections[index] = matchedSelected.id;
        console.log(`   🎯 Selected: ${matchedSelected.name} (ID: ${idStr})`);
        
        // Recursive load next level
        this.loadMergedHierarchy(index + 1, matchedSelected.id);
      } else {
        const assignedNode = this.assignedPath.find(n => String(n.layer_id) === String(layer.id));
        if (assignedNode) {
          const idStr = String(assignedNode.id);
          if (mergedMap.has(idStr)) {
            console.log(`   ✅ ID MATCH FOUND (VerifyUser + APIs): ${idStr} (${assignedNode.name})`);
            mergedMap.set(idStr, { ...mergedMap.get(idStr), ...assignedNode, _matched: true });
          } else {
            console.log(`   📍 Assigned ID ${idStr} (${assignedNode.name}) missing from APIs, forced entry.`);
            mergedMap.set(idStr, { ...assignedNode, _source: 'VerifyUser', _forced: true });
          }
          
          // AUTO-SELECT the matched/forced node
          this.hierarchySelections[index] = assignedNode.id;
          console.log(`   🎯 Selected: ${assignedNode.name} (ID: ${idStr})`);
          
          // Recursive load next level
          this.loadMergedHierarchy(index + 1, assignedNode.id);
        }
      }

      let finalOptions = Array.from(mergedMap.values());

      // Filter by parent for hierarchy consistency
      if (parentId) {
        finalOptions = finalOptions.filter((e: any) => String(e.parent_id) === String(parentId));
      }

      this.layerEntities[layer.id] = finalOptions;
      this.cdr.detectChanges();
    });
  }

  onLayerChange(index: number) {
    const selectedId = this.hierarchySelections[index];
    for (let i = index + 1; i < this.layers.length; i++) {
      this.hierarchySelections[i] = null;
      this.layerEntities[this.layers[i].id] = [];
    }
    if (selectedId && index + 1 < this.layers.length) {
      this.loadMergedHierarchy(index + 1, selectedId);
    }
  }

  getDeepestSelectedEntity(): any {
    if (!this.layers || this.layers.length === 0) return null;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const entId = this.hierarchySelections[i];
      if (entId && entId !== 'null' && entId !== null) {
        const ent = this.layerEntities[this.layers[i].id]?.find(e => String(e.id) === String(entId));
        if (ent) {
          return {
            id: entId,
            name: ent.name,
            layerName: this.layers[i].name
          };
        }
      }
    }
    return null;
  }

  addSelectedAssignment() {
    const selected = this.getDeepestSelectedEntity();
    if (!selected) {
      this.presentToast('Please select a range or beat first', 'warning');
      return;
    }
    
    const exists = this.selectedAssignments.some(item => String(item.id) === String(selected.id));
    if (exists) {
      this.presentToast('This assignment is already added', 'warning');
      return;
    }

    this.selectedAssignments.push(selected);
    this.presentToast(`Added: ${selected.name} (${selected.layerName})`, 'success');

    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
        this.hierarchySelections[i] = null;
        break;
      }
    }
    this.cdr.detectChanges();
  }

  removeSelectedAssignment(index: number) {
    this.selectedAssignments.splice(index, 1);
    this.cdr.detectChanges();
  }

  isAssignmentSelected(entId: any): boolean {
    if (!this.selectedAssignments || this.selectedAssignments.length === 0) {
      return false;
    }
    return this.selectedAssignments.some(selected => String(selected.id) === String(entId));
  }

  togglePassword(field: string) {
    if (field === 'pw') {
      this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
      this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
    } else {
      this.confirmPasswordType = this.confirmPasswordType === 'password' ? 'text' : 'password';
      this.confirmPasswordIcon = this.confirmPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
    }
  }

  async captureImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 70, resultType: CameraResultType.DataUrl, source: CameraSource.Camera, width: 800 
      });
      this.profileImage = image.dataUrl;
    } catch (error) {
      console.error('Camera error:', error);
    }
  }

  shouldShowHierarchy(): boolean {
    return this.layers.length > 0;
  }

  getRoleName(id: any): string {
    const rId = Number(id);
    if (rId === 1) return 'SUPER ADMIN';
    if (rId === 2) return 'FORESTER';
    if (rId === 3) return 'GUARD / RANGER';
    if (rId === 4) return 'FORESTER';
    if (rId === 7) return 'ADMIN';
    return '';
  }

  async onSignup() {
    if (!this.profileImage) return this.presentToast('Photo is required.', 'warning');
    if (!this.firstName || !this.lastName) return this.presentToast('Name is required.', 'warning');

    const loader = await this.loadingCtrl.create({ message: 'Creating Profile...', spinner: 'crescent' });
    await loader.present();

    // Gather all entity IDs from selectedAssignments
    const assignedEntityIds: string[] = [];
    if (this.selectedAssignments && this.selectedAssignments.length > 0) {
      this.selectedAssignments.forEach(item => {
        assignedEntityIds.push(String(item.id));
      });
    }

    // Also include any selection currently in hierarchySelections dropdowns if not already added
    let deepestDropdownEntityId: any = null;
    let deepestDropdownEntityName = '';
    for (let i = this.hierarchySelections.length - 1; i >= 0; i--) {
      if (this.hierarchySelections[i] && this.hierarchySelections[i] !== 'null') {
        deepestDropdownEntityId = this.hierarchySelections[i];
        const layerId = this.layers[i].id;
        const ent = this.layerEntities[layerId]?.find(e => String(e.id) === String(deepestDropdownEntityId));
        deepestDropdownEntityName = ent?.name || '';
        break;
      }
    }

    if (deepestDropdownEntityId) {
      const alreadyAdded = assignedEntityIds.some(id => String(id) === String(deepestDropdownEntityId));
      if (!alreadyAdded) {
        assignedEntityIds.push(String(deepestDropdownEntityId));
      }
    }

    // The deepest entity (used for user profile)
    let deepestEntityId: any = null;
    let deepestEntityName = '';
    if (assignedEntityIds.length > 0) {
      deepestEntityId = assignedEntityIds[assignedEntityIds.length - 1];
      
      // Try to find the name of the deepest entity
      if (deepestEntityId === String(deepestDropdownEntityId)) {
        deepestEntityName = deepestDropdownEntityName;
      } else {
        const found = this.selectedAssignments.find(item => String(item.id) === String(deepestEntityId));
        if (found) {
          deepestEntityName = found.name;
        } else {
          for (let layer of this.layers) {
            const ent = this.layerEntities[layer.id]?.find(e => String(e.id) === String(deepestEntityId));
            if (ent) {
              deepestEntityName = ent.name || '';
              break;
            }
          }
        }
      }
    }

    // Collect all assigned entity names
    let assignedNames: string[] = [];
    if (this.selectedAssignments && this.selectedAssignments.length > 0) {
      assignedNames = this.selectedAssignments.map(item => item.name);
    } else {
      assignedEntityIds.forEach(id => {
        let found = false;
        for (let layer of this.layers) {
          const ent = this.layerEntities[layer.id]?.find(e => String(e.id) === String(id));
          if (ent) {
            assignedNames.push(ent.name);
            found = true;
            break;
          }
        }
        if (!found) {
          assignedNames.push(String(id));
        }
      });
    }
    const combinedSiteName = assignedNames.length > 0 ? assignedNames.join(', ') : (deepestEntityName || this.verifiedData.site_name || '');

    // Double-stringify permissions to prevent Laravel Array to string conversion DB exception
    let doubleStringifiedPermissions: string;
    try {
      const rawPermissions = this.verifiedData.permissions || [];
      if (typeof rawPermissions === 'string') {
        const parsed = JSON.parse(rawPermissions);
        if (typeof parsed === 'string') {
          doubleStringifiedPermissions = rawPermissions;
        } else {
          doubleStringifiedPermissions = JSON.stringify(rawPermissions);
        }
      } else {
        doubleStringifiedPermissions = JSON.stringify(JSON.stringify(rawPermissions));
      }
    } catch (e) {
      doubleStringifiedPermissions = JSON.stringify(JSON.stringify(this.verifiedData.permissions || []));
    }

    const payload: any = {
      api_token: localStorage.getItem('api_token') || this.verifiedData?.api_token || '', 
      name: `${this.firstName} ${this.lastName}`.trim(),
      mobile: String(this.mobile).trim(),
      email: this.email || '',
      password: this.password,
      gender: this.gender,
      dob: this.dob,
      address: this.address,
      role_id: String(this.verifiedData.role_id || 3),
      custom_role_id: String(this.verifiedData.custom_role_id || this.verifiedData.role_id || 3), 
      dynamic_role_id: String(this.verifiedData.custom_role_id || this.verifiedData.role_id || 3),
      permissions: doubleStringifiedPermissions, 
      company_id: String(this.verifiedData.company_id || '64'),
      company_name: this.verifiedData.company_name || '', 
      entity_id: assignedEntityIds,
      // entity_ids: assignedEntityIds,
      site_id: deepestEntityId, 
      site_name: combinedSiteName,
      designation: this.getRoleName(this.verifiedData.role_id) || this.verifiedData.designation || this.verifiedData.role_name || deepestEntityName || 'Officer', 
      attendance_type: 'multiple', 
      shift_name: this.shift || 'General Shift',
      shift: this.shift || 'General Shift',
      weekly_off: this.weeklyOff || 'Sunday',
      weekoff: this.weeklyOff || 'Sunday',
      date_range: moment().format("YYYY-MM-DD") + " to " + moment().add(1, 'year').format("YYYY-MM-DD"),
      emp_id: "FSM-" + Math.floor(100000+Math.random()*900000),
      photo: this.profileImage
    };

    console.log("📝 [SIGNUP] Final Payload being sent to Backend:", payload);
    console.log("🔒 [SIGNUP] Permissions for this user:", payload.permissions);

    this.dataService.addUser(payload).subscribe({
      next: async (res: any) => {
        const newUserId = res?.data?.id || res?.id;
        
        // 🚀 After user is created, LINK them to Hierarchy and Role
        if (newUserId && Array.isArray(payload.entity_id) && payload.entity_id.length > 0) {
          payload.entity_id.forEach((assignedId: string) => {
            const assignmentPayload = {
              user_id: newUserId,
              role_id: payload.role_id,
              custom_role_id: payload.custom_role_id,
              entity_id: assignedId,
              company_id: payload.company_id,
              permissions: doubleStringifiedPermissions,
              role_name: payload.designation
            };

            this.dataService.saveV2Assignment(assignmentPayload).subscribe({
              next: (assignRes: any) => console.log("🔗 [SIGNUP] V2 Assignment Linked (multi):", assignRes),
              error: (assignErr: any) => console.error("❌ [SIGNUP] V2 Assignment Failed (multi):", assignErr)
            });
          });
        } else if (newUserId) {
          const assignmentPayload = {
            user_id: newUserId,
            role_id: payload.role_id,
            custom_role_id: payload.custom_role_id,
            entity_id: payload.site_id,
            company_id: payload.company_id,
            permissions: doubleStringifiedPermissions,
            role_name: payload.designation
          };

          this.dataService.saveV2Assignment(assignmentPayload).subscribe({
            next: (assignRes: any) => console.log("🔗 [SIGNUP] V2 Assignment Linked (fallback):", assignRes),
            error: (assignErr: any) => console.error("❌ [SIGNUP] V2 Assignment Failed (fallback):", assignErr)
          });
        }

        // 🔥 SAVE ALL IMPORTANT DATA TO LOCALSTORAGE
        localStorage.setItem('user_role', String(payload.role_id));
        localStorage.setItem('user_custom_role_id', String(payload.custom_role_id));
        localStorage.setItem('user_role_name', String(payload.designation || ''));
        localStorage.setItem('user_permissions', String(payload.permissions));
        localStorage.setItem('user_entity_id', String(payload.entity_id || ''));
        localStorage.setItem('user_site_id', String(payload.site_id || ''));
        localStorage.setItem('user_site_name', String(payload.site_name || ''));

        console.log("💾 [SIGNUP] Saved to LocalStorage:");
        console.log("   Role ID:", payload.role_id);
        console.log("   Custom Role ID:", payload.custom_role_id);
        console.log("   Role Name:", payload.designation);
        console.log("   Permissions:", payload.permissions);
        console.log("   Entity ID:", payload.entity_id);
        console.log("   Site ID:", payload.site_id);
        console.log("   Site Name:", payload.site_name);

        await loader.dismiss();
        this.presentToast('Registration Successful!', 'success');
        this.navCtrl.navigateRoot('/login');
      },
      error: async (err) => {
        await loader.dismiss();
        this.presentToast(err.error?.message || 'Registration failed.', 'danger');
      }
    });
  }

  async presentToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, color: color, duration: 3000, position: 'bottom' });
    t.present();
  }

  navToLogin() { this.navCtrl.navigateBack('/login'); }
}