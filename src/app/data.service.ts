import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable, of, Subject, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DataService {
  private baseApiUrl = environment.apiUrl;
  private selectedIncident: any;
  private selectedAttendance: any;
  private selectedAsset: any;
  private userDisplayCache = new Map<
    string,
    { range: string; beat: string; reporterName: string; isDynamic: boolean }
  >();

  // Bridge for Sidebar Refresh
  public loginSuccess$ = new Subject<void>();
  public syncCompleted$ = new Subject<void>();
  public userProfileUpdated$ = new Subject<any>(); // 🚀 NEW: Notify all dashboards when profile changes
  public permissionsUpdated$ = new Subject<void>(); // 🚀 NEW: Notify when permissions are synced

  constructor(private http: HttpClient) {}

  getApiUrl() { return this.baseApiUrl; }

  private isInvalidBeatLabel(label: string): boolean {
    const s = String(label || '').trim().toLowerCase();
    if (!s) return true;
    const blocked = [
      'current location', 'on location', 'onsite', 'general', 'unknown',
      'unknown entity', 'unknown beat', 'not assigned', 'loading', 'fetching'
    ];
    return blocked.some(b => s === b || s.includes(b));
  }

  private isInvalidRangeLabel(label: string): boolean {
    const s = String(label || '').trim().toLowerCase();
    if (!s) return true;
    return ['general', 'general range', 'unknown', 'not assigned'].includes(s);
  }

  /** Pick first valid range/beat from multiple sources (static + dynamic). */
  pickBestHierarchy(...sources: { range: string; beat: string }[]): { range: string; beat: string } {
    let beat = '';
    let range = '';
    for (const s of sources) {
      if (!beat && !this.isInvalidBeatLabel(s?.beat)) beat = String(s.beat).trim();
      if (!range && !this.isInvalidRangeLabel(s?.range)) range = String(s.range).trim();
    }
    return { range, beat };
  }

  mergeHierarchyLabels(
    fromAssign: { range: string; beat: string },
    fromProfile: { range: string; beat: string }
  ): { range: string; beat: string } {
    return this.pickBestHierarchy(fromAssign, fromProfile);
  }

  /** Only use a site row that belongs to this user — never sites[0] from full company list. */
  private parseSitesHierarchy(res: any, userId: string | number): { range: string; beat: string } {
    const data = res?.data ?? res;
    const sites = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : [];
    if (!sites.length) return { range: '', beat: '' };

    const uid = String(userId);
    let match = sites.find((s: any) => {
      const rowUser = String(s.user_id || s.guard_id || s.ranger_id || s.applicant_id || '');
      return rowUser !== '' && rowUser === uid;
    });

    // getSites(user_id) may return assigned sites without repeating user_id on each row
    if (!match && sites.length === 1) {
      match = sites[0];
    }

    if (!match) return { range: '', beat: '' };

    return {
      beat: String(
        match.site_name || match.name || match.beat_name || match.beat || match.site || ''
      ).trim(),
      range: String(
        match.client_name || match.range_name || match.range || match.division_name || ''
      ).trim()
    };
  }

  fetchUserSitesFromApi(
    userId: string | number,
    companyId: string | number
  ): Observable<{ range: string; beat: string }> {
    const token = localStorage.getItem('api_token') || '';
    const cId = String(companyId || localStorage.getItem('company_id') || '');
    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', cId);
    formData.append('user_id', String(userId));
    return this.http.post(`${this.baseApiUrl}/getSites`, formData).pipe(
      map((res: any) => this.parseSitesHierarchy(res, userId)),
      catchError(() => of({ range: '', beat: '' }))
    );
  }

  fetchGuardSiteHierarchy(userId: string | number): Observable<{ range: string; beat: string }> {
    const token = localStorage.getItem('api_token') || '';
    const uid = String(userId);
    return this.getGuardSite({
      guard_id: userId,
      user_id: userId,
      api_token: token
    }).pipe(
      map((res: any) => {
        if (res?.status === 'ERROR' || res?.success === false) {
          return { range: '', beat: '' };
        }
        const site = res?.data || res;
        if (!site || typeof site !== 'object' || Array.isArray(site)) {
          return { range: '', beat: '' };
        }
        const beat = String(
          site.site_name || site.name || site.beat_name || site.beat || ''
        ).trim();
        const range = String(
          site.client_name || site.range_name || site.range || site.division_name || ''
        ).trim();
        if (this.isInvalidBeatLabel(beat)) return { range: '', beat: '' };
        return { range, beat };
      }),
      catchError(() => of({ range: '', beat: '' }))
    );
  }

  /** True when user is on V2 dynamic beat assignment (not fixed static site). */
  isUserDynamic(u: any): boolean {
    if (!u) return false;
    return !!(
      u.dynamic_assignment?.entity_id ||
      u.dynamic_assignment?.entity?.id ||
      u.is_dynamic === true ||
      u.is_dynamic === 1 ||
      String(u.user_type || '').toLowerCase() === 'dynamic' ||
      String(u.assignment_type || '').toLowerCase() === 'dynamic'
    );
  }

  /** Range/beat from user profile (static site_name or dynamic_assignment entity). */
  getUserHierarchyLabels(u: any): {
    range: string;
    beat: string;
    entityId: string;
    parentId: string;
  } {
    if (!u) return { range: '', beat: '', entityId: '', parentId: '' };

    const hasDynamic = !!(
      u.dynamic_assignment?.entity?.name ||
      u.dynamic_assignment?.entity_id
    );

    const staticBeat =
      u.site_name ||
      u.beat_name ||
      u.beat ||
      u.assigned_beat_name ||
      u.site?.name ||
      u.assigned_site?.name ||
      u.guard_site?.site_name ||
      '';
    const staticRange =
      u.range_name ||
      u.range ||
      u.division_name ||
      u.division ||
      u.client_name ||
      u.site?.client_name ||
      u.guard_site?.client_name ||
      '';

    const dynamicBeat = u.dynamic_assignment?.entity?.name || '';
    const dynamicRange =
      u.dynamic_assignment?.parent?.name || u.dynamic_assignment?.range_name || '';

    const beat = hasDynamic
      ? (dynamicBeat || staticBeat)
      : (staticBeat || dynamicBeat);
    const range = hasDynamic
      ? (dynamicRange || staticRange)
      : (staticRange || dynamicRange);

    const entityId = String(
      u.dynamic_assignment?.entity?.id ||
      u.dynamic_assignment?.entity_id ||
      u.assigned_entity_id ||
      u.entity_id ||
      ''
    ).trim();
    const parentId = String(
      u.dynamic_assignment?.entity?.parent_id ||
      u.dynamic_assignment?.parent?.id ||
      u.dynamic_assignment?.parent_id ||
      ''
    ).trim();

    return {
      range: String(range || '').trim(),
      beat: String(beat || '').trim(),
      entityId,
      parentId
    };
  }

  resolveRangeNameForBeat(beatName: string, companyId: string): Observable<string> {
    if (!beatName || !companyId) return of('');
    const normalized = String(beatName).toLowerCase().trim();
    return this.getHierarchyForFilters(companyId).pipe(
      map(h => {
        // 1. Try Exact Match first (highly reliable)
        let match = h.beats.find(b => {
          const n = String(b.name || '').toLowerCase().trim();
          return n === normalized || n.replace(/^beat\s+/i, '') === normalized.replace(/^beat\s+/i, '');
        });

        // 2. Try clean boundary match if no exact match is found
        if (!match) {
          match = h.beats.find(b => {
            const n = String(b.name || '').toLowerCase().trim();
            const cleanN = n.replace(/^beat\s+/i, '');
            const cleanNorm = normalized.replace(/^beat\s+/i, '');
            
            if (cleanN === cleanNorm) return true;

            const matchIndex = cleanN.indexOf(cleanNorm);
            if (matchIndex !== -1) {
              const charAfter = cleanN.charAt(matchIndex + cleanNorm.length);
              const charBefore = matchIndex > 0 ? cleanN.charAt(matchIndex - 1) : '';
              
              // Ensure we are not matching parts of larger numbers (e.g. "geo 2" matching "geo 20")
              const isDigitAfter = /\d/.test(charAfter);
              const isDigitBefore = /\d/.test(charBefore);
              if (!isDigitAfter && !isDigitBefore) {
                return true;
              }
            }

            const reverseMatchIndex = cleanNorm.indexOf(cleanN);
            if (reverseMatchIndex !== -1) {
              const charAfter = cleanNorm.charAt(reverseMatchIndex + cleanN.length);
              const charBefore = reverseMatchIndex > 0 ? cleanNorm.charAt(reverseMatchIndex - 1) : '';
              const isDigitAfter = /\d/.test(charAfter);
              const isDigitBefore = /\d/.test(charBefore);
              if (!isDigitAfter && !isDigitBefore) {
                return true;
              }
            }
            
            return false;
          });
        }

        return match?.parentName || '';
      }),
      catchError(() => of(''))
    );
  }

  private orgEntitiesCache: { companyId: string; entities: any[] } | null = null;

  private loadOrgEntities(companyId: string): Observable<any[]> {
    const cId = String(companyId || '');
    if (
      this.orgEntitiesCache &&
      this.orgEntitiesCache.companyId === cId &&
      this.orgEntitiesCache.entities.length
    ) {
      return of(this.orgEntitiesCache.entities);
    }
    return this.listOrgEntities('', cId).pipe(
      map((res: any) => {
        const entities = res?.data ?? res;
        const list = Array.isArray(entities) ? entities : [];
        if (list.length) {
          this.orgEntitiesCache = { companyId: cId, entities: list };
        }
        return list;
      }),
      catchError(() => of([]))
    );
  }

  /** Resolve range name from beat entity id or explicit parent id in org tree. */
  resolveRangeFromOrgEntity(
    entityId: string | number,
    parentId: string | number,
    companyId: string | number
  ): Observable<string> {
    const eId = entityId != null && String(entityId) !== '' && String(entityId) !== '0'
      ? String(entityId)
      : '';
    const pId = parentId != null && String(parentId) !== '' && String(parentId) !== '0'
      ? String(parentId)
      : '';
    if (!eId && !pId) return of('');

    return this.loadOrgEntities(String(companyId)).pipe(
      map(entities => {
        if (pId) {
          const parent = entities.find((e: any) => String(e.id) === pId);
          if (parent?.name && !this.isInvalidRangeLabel(parent.name)) {
            return String(parent.name).trim();
          }
        }
        if (eId) {
          const entity = entities.find((e: any) => String(e.id) === eId);
          if (!entity) return '';
          const pid = entity.parent_id ?? entity.parentId;
          if (pid) {
            const parent = entities.find((p: any) => String(p.id) === String(pid));
            if (parent?.name && !this.isInvalidRangeLabel(parent.name)) {
              return String(parent.name).trim();
            }
          }
        }
        return '';
      }),
      catchError(() => of(''))
    );
  }

  /** V2 assignments API — authoritative beat/range for a user (not report entity). */
  parseAssignmentHierarchy(assignments: any[]): {
    range: string;
    beat: string;
    entityId: string;
    parentId: string;
  } {
    const list = Array.isArray(assignments)
      ? assignments
      : assignments && typeof assignments === 'object'
        ? (assignments as any).data || [(assignments as any)]
        : [];
    if (!list.length) return { range: '', beat: '', entityId: '', parentId: '' };

    // 🔥 V2 Multi-Assignment Sync: Collect all assigned entity IDs & parent IDs
    const entityIds = list.map((a: any) => {
      const entity = a?.entity || a?.assigned_entity || a?.beat || {};
      return String(entity.id || a.entity_id || a.assigned_entity_id || a.beat_id || a.site_id || '').trim();
    }).filter((id: string) => id !== '' && id !== '0');
    
    const parentIds = list.map((a: any) => {
      const entity = a?.entity || a?.assigned_entity || a?.beat || {};
      return String(entity.parent?.id || entity.parent_id || a.parent_id || a.range_id || '').trim();
    }).filter((id: string) => id !== '' && id !== '0');

    const allAssignedIds = [...new Set([...entityIds, ...parentIds])];
    if (allAssignedIds.length > 0) {
      localStorage.setItem('direct_assigned_entity_ids', JSON.stringify(allAssignedIds));
      console.log("📂 [V2 MULTI-ASSIGNMENT] Saved Direct Assigned Entity IDs:", allAssignedIds);
      this.syncExpandedAssignedEntities(allAssignedIds);
    } else {
      localStorage.removeItem('direct_assigned_entity_ids');
      localStorage.removeItem('assigned_entity_ids');
    }

    const active =
      list.find((a: any) => a.is_active === true || a.is_active === 1) ||
      list.find((a: any) => a.is_active !== false && a.is_active !== 0) ||
      list[0];
    const entity = active?.entity || active?.assigned_entity || active?.beat || {};
    const beat = String(
      entity.name ||
      active.entity_name ||
      active.beat_name ||
      active.site_name ||
      active.beat ||
      ''
    ).trim();
    const range = String(
      entity.parent?.name ||
      entity.parent_name ||
      active.parent_name ||
      active.range_name ||
      entity.range_name ||
      active.range ||
      ''
    ).trim();
    const entityId = String(
      entity.id ||
      active.entity_id ||
      active.assigned_entity_id ||
      active.beat_id ||
      active.site_id ||
      ''
    ).trim();
    const parentId = String(
      entity.parent?.id ||
      entity.parent_id ||
      entity.parentId ||
      active.parent_id ||
      active.range_id ||
      ''
    ).trim();
    return { range, beat, entityId, parentId };
  }

  syncExpandedAssignedEntities(assignedIds: string[]) {
    if (!assignedIds || assignedIds.length === 0) return;
    
    const companyId = localStorage.getItem('company_id') || '';
    this.listOrgEntities('all', companyId).subscribe({
      next: (res: any) => {
        const entities = res?.data ?? res;
        const list = Array.isArray(entities) ? entities : [];
        if (!list.length) return;

        // Build parent-to-children mapping
        const parentToChildren = new Map<string, string[]>();
        list.forEach((e: any) => {
          const eId = String(e.id || '').trim();
          const pId = String(e.parent_id ?? e.parentId ?? (e.parent ? e.parent.id : '') ?? '').trim();
          if (eId && pId && pId !== '0') {
            if (!parentToChildren.has(pId)) {
              parentToChildren.set(pId, []);
            }
            parentToChildren.get(pId)!.push(eId);
          }
        });

        // Run BFS/DFS to find all descendants
        const expandedSet = new Set<string>(assignedIds.map(id => String(id).trim()));
        const queue = assignedIds.map(id => String(id).trim());
        while (queue.length > 0) {
          const current = queue.shift()!;
          const children = parentToChildren.get(current);
          if (children) {
            children.forEach(child => {
              if (!expandedSet.has(child)) {
                expandedSet.add(child);
                queue.push(child);
              }
            });
          }
        }

        const expandedList = Array.from(expandedSet);
        const currentStored = localStorage.getItem('assigned_entity_ids');
        const nextStored = JSON.stringify(expandedList);
        if (currentStored !== nextStored) {
          localStorage.setItem('assigned_entity_ids', nextStored);
          console.log("📂 [V2 MULTI-ASSIGNMENT] Expanded and Saved Assigned Entity IDs:", expandedList);
          // Notify components that permissions / assignments are synced
          this.permissionsUpdated$.next();
        } else {
          console.log("📂 [V2 MULTI-ASSIGNMENT] Expanded Assigned Entity IDs are unchanged. Skipping sync notification.");
        }
      },
      error: (err) => {
        console.error("❌ [V2 MULTI-ASSIGNMENT] Failed to expand assigned entities:", err);
      }
    });
  }

  isNameMatching(n1: any, n2: any): boolean {
    if (n1 === undefined || n1 === null || n2 === undefined || n2 === null) return false;
    const s1 = String(n1).toLowerCase().trim().replace(/^beat\s+/i, '');
    const s2 = String(n2).toLowerCase().trim().replace(/^beat\s+/i, '');
    if (!s1 || !s2) return false;
    if (s1 === s2) return true;

    // Boundary check for partial matching (so "geo 2" doesn't match "geo 20")
    const matchIndex = s1.indexOf(s2);
    if (matchIndex !== -1) {
      const charAfter = s1.charAt(matchIndex + s2.length);
      const charBefore = matchIndex > 0 ? s1.charAt(matchIndex - 1) : '';
      const isDigitAfter = /\d/.test(charAfter);
      const isDigitBefore = /\d/.test(charBefore);
      if (!isDigitAfter && !isDigitBefore) {
        return true;
      }
    }

    const reverseMatchIndex = s2.indexOf(s1);
    if (reverseMatchIndex !== -1) {
      const charAfter = s2.charAt(reverseMatchIndex + s1.length);
      const charBefore = reverseMatchIndex > 0 ? s2.charAt(reverseMatchIndex - 1) : '';
      const isDigitAfter = /\d/.test(charAfter);
      const isDigitBefore = /\d/.test(charBefore);
      if (!isDigitAfter && !isDigitBefore) {
        return true;
      }
    }
    return false;
  }

  /** Exposes strict region filtering based on V2 Multi-Assignments */
  isRecordVisible(recordEntityId: any): boolean {
    const userRole = localStorage.getItem('user_role') || '3';
    // Super Admins (1) and Admins (2) and Specialized Admins (7) always have global visibility
    if (userRole === '1' || userRole === '2' || userRole === '7') {
      return true;
    }
    
    const assignedIdsStr = localStorage.getItem('assigned_entity_ids');
    if (!assignedIdsStr) {
      // Fallback to true if no explicit assignments exist (so we do not break general users)
      return true;
    }

    try {
      const assignedIds = JSON.parse(assignedIdsStr);
      if (!Array.isArray(assignedIds) || assignedIds.length === 0) {
        return true;
      }
      if (recordEntityId === undefined || recordEntityId === null || String(recordEntityId).trim() === '') {
        // Records without an entity ID are considered global/general
        return true;
      }
      return assignedIds.map(id => String(id).trim()).includes(String(recordEntityId).trim());
    } catch (e) {
      return true;
    }
  }

  private pickAssignmentEntityMeta(
    ...sources: { entityId?: string; parentId?: string; beat?: string }[]
  ): { entityId: string; parentId: string } {
    for (const s of sources) {
      if ((s.entityId || s.parentId) && !this.isInvalidBeatLabel(s.beat || '')) {
        return { entityId: s.entityId || '', parentId: s.parentId || '' };
      }
    }
    for (const s of sources) {
      if (s.entityId || s.parentId) {
        return { entityId: s.entityId || '', parentId: s.parentId || '' };
      }
    }
    return { entityId: '', parentId: '' };
  }

  private fetchAssignmentsForUser(
    userId: string | number
  ): Observable<{ range: string; beat: string; entityId: string; parentId: string }> {
    return this.getUserAssignments(userId).pipe(
      map((res: any) => {
        const list = res?.data ?? res?.assignments ?? res;
        return this.parseAssignmentHierarchy(Array.isArray(list) ? list : []);
      }),
      catchError(() => of({ range: '', beat: '', entityId: '', parentId: '' }))
    );
  }

  private finishHierarchyLabels(
    labels: { range: string; beat: string },
    companyId: string | number,
    trustedBeat?: string,
    entityMeta?: { entityId?: string; parentId?: string }
  ): Observable<{ range: string; beat: string }> {
    const entityId = entityMeta?.entityId || '';
    
    if (!entityId || !companyId) {
      const beatForLookup = trustedBeat || labels.beat;
      if (!beatForLookup) {
        return of(labels);
      }
      return this.resolveRangeNameForBeat(beatForLookup, String(companyId)).pipe(
        map(parentRange => ({
          range: parentRange || labels.range,
          beat: labels.beat
        })),
        catchError(() => of(labels))
      );
    }

    return this.loadOrgEntities(String(companyId)).pipe(
      map(entities => {
        let resolvedRange = labels.range;
        let resolvedBeat = labels.beat;

        const entity = entities.find((e: any) => String(e.id) === String(entityId));
        if (entity) {
          const eName = String(entity.name || entity.label || '').trim();
          const pid = entity.parent_id ?? entity.parentId;
          const parent = pid ? entities.find((p: any) => String(p.id) === String(pid)) : null;
          
          if (parent) {
            const pName = String(parent.name || parent.label || '').trim();
            const ppid = parent.parent_id ?? parent.parentId;
            
            // If parent has a parent, or parent name doesn't contain 'division', parent is range and entity is beat
            if (ppid || !pName.toLowerCase().includes('division')) {
              resolvedRange = pName;
              resolvedBeat = eName;
            } else {
              // Parent is division, so entity itself is the range
              resolvedRange = eName;
              if (!resolvedBeat || this.isInvalidBeatLabel(resolvedBeat)) {
                resolvedBeat = '';
              }
            }
          } else {
            // No parent, treat entity itself as range
            resolvedRange = eName;
          }
        }

        if ((!resolvedBeat || this.isInvalidBeatLabel(resolvedBeat)) && trustedBeat && !this.isInvalidBeatLabel(trustedBeat)) {
          resolvedBeat = trustedBeat;
        }

        return {
          range: resolvedRange && !this.isInvalidRangeLabel(resolvedRange) ? resolvedRange : labels.range,
          beat: resolvedBeat && !this.isInvalidBeatLabel(resolvedBeat) ? resolvedBeat : labels.beat
        };
      }),
      catchError(() => {
        const beatForLookup = trustedBeat || labels.beat;
        if (!beatForLookup) return of(labels);
        return this.resolveRangeNameForBeat(beatForLookup, String(companyId)).pipe(
          map(parentRange => ({
            range: parentRange || labels.range,
            beat: labels.beat
          })),
          catchError(() => of(labels))
        );
      })
    );
  }

  private getUserDetailsWithFallback(
    userId: string | number,
    companyId: string | number
  ): Observable<any> {
    return this.getUserDetails(userId, companyId).pipe(
      catchError(() =>
        this.getV2UserDetails(userId).pipe(
          catchError(() =>
            this.getProfileById(userId).pipe(catchError(() => of(null)))
          )
        )
      )
    );
  }

  resolveUserAssignmentLabels(
    userId: string | number,
    companyId: string | number
  ): Observable<{ range: string; beat: string }> {
    return this.resolveUserDisplayInfo(userId, companyId).pipe(
      map(({ range, beat }) => ({ range, beat }))
    );
  }

  resolveUserDisplayInfo(
    userId: string | number,
    companyId: string | number,
    _reportContext?: { beat?: string; range?: string }
  ): Observable<{ range: string; beat: string; reporterName: string; isDynamic: boolean }> {
    const cId = companyId || localStorage.getItem('company_id') || '0';

    return this.getUserDetailsWithFallback(userId, cId).pipe(
      switchMap((profileRes: any) => {
        const u = profileRes?.data || profileRes?.user || profileRes || {};
        const isDynamic = this.isUserDynamic(u);
        const idCandidates = [u.id, u.user_id, userId, u.staff_id, u.guard_id, u.ranger_id]
          .filter((id) => id != null && String(id) !== '' && String(id) !== '0')
          .map((id) => String(id));
        const uniqueIds = [...new Set(idCandidates)];
        const assignmentCalls = uniqueIds.map((id) => this.fetchAssignmentsForUser(id));

        return forkJoin({
          assignmentResults: assignmentCalls.length
            ? forkJoin(assignmentCalls)
            : of([] as { range: string; beat: string; entityId: string; parentId: string }[]),
          guardSite: this.fetchGuardSiteHierarchy(userId),
          sites: this.fetchUserSitesFromApi(userId, cId),
          profileSites: uniqueIds[0]
            ? this.fetchUserSitesFromApi(uniqueIds[0], cId)
            : of({ range: '', beat: '' })
        }).pipe(
          switchMap(({ assignmentResults, guardSite, sites, profileSites }) => {
            const assignments = this.pickBestHierarchy(...assignmentResults);
            const fromProfile = this.getUserHierarchyLabels(u);
            const merged = this.pickBestHierarchy(
              assignments,
              fromProfile,
              guardSite,
              sites,
              profileSites
            );

            const entityMeta = this.pickAssignmentEntityMeta(
              ...assignmentResults,
              fromProfile
            );

            const reporterName = String(
              u?.name ||
              u?.full_name ||
              u?.user_name ||
              u?.ranger_name ||
              u?.guard_name ||
              u?.username ||
              ''
            ).trim();

            const trustedBeat = !this.isInvalidBeatLabel(assignments.beat)
              ? assignments.beat
              : !this.isInvalidBeatLabel(fromProfile.beat)
                ? fromProfile.beat
                : !this.isInvalidBeatLabel(guardSite.beat)
                  ? guardSite.beat
                  : '';

            return this.finishHierarchyLabels(merged, cId, trustedBeat, entityMeta).pipe(
              map((labels) => ({ 
                ...labels, 
                reporterName, 
                isDynamic, 
                entityId: entityMeta?.entityId || '', 
                parentId: entityMeta?.parentId || '' 
              }))
            );
          })
        );
      }),
      catchError(() =>
        forkJoin({
          assignments: this.fetchAssignmentsForUser(userId),
          guardSite: this.fetchGuardSiteHierarchy(userId),
          sites: this.fetchUserSitesFromApi(userId, cId)
        }).pipe(
          switchMap(({ assignments, guardSite, sites }) => {
            const merged = this.pickBestHierarchy(assignments, guardSite, sites);
            const trustedBeat = !this.isInvalidBeatLabel(assignments.beat) ? assignments.beat : '';
            const entityMeta = {
              entityId: assignments.entityId,
              parentId: assignments.parentId
            };
            return this.finishHierarchyLabels(merged, cId, trustedBeat, entityMeta).pipe(
              map((labels) => ({ 
                ...labels, 
                reporterName: '', 
                isDynamic: false, 
                entityId: entityMeta?.entityId || '', 
                parentId: entityMeta?.parentId || '' 
              }))
            );
          }),
          catchError(() => of({ range: '', beat: '', reporterName: '', isDynamic: false, entityId: '', parentId: '' }))
        )
      )
    );
  }

  getCachedUserDisplayInfo(
    userId: string | number,
    companyId: string | number,
    reportContext?: { beat?: string; range?: string }
  ): Observable<{ range: string; beat: string; reporterName: string; isDynamic: boolean }> {
    const ctxKey = reportContext
      ? `${reportContext.beat || ''}:${reportContext.range || ''}`
      : '';
    const key = `v6:${userId}:${companyId}:${ctxKey}`;
    const hit = this.userDisplayCache.get(key);
    if (hit && (hit.beat || hit.range)) return of(hit);
    return this.resolveUserDisplayInfo(userId, companyId, reportContext).pipe(
      tap((info) => {
        if (info.beat || info.range || info.reporterName) {
          this.userDisplayCache.set(key, info);
        }
      })
    );
  }

  getCachedUserAssignmentLabels(
    userId: string | number,
    companyId: string | number
  ): Observable<{ range: string; beat: string }> {
    return this.getCachedUserDisplayInfo(userId, companyId).pipe(
      map(({ range, beat }) => ({ range, beat }))
    );
  }

  private attachReportDisplayHierarchy(
    report: any,
    info: { range: string; beat: string; reporterName?: string; isDynamic?: boolean; entityId?: string; parentId?: string }
  ) {
    const reporter =
      info.reporterName ||
      report.name ||
      report.staff_name ||
      report.ranger_name ||
      report.user_name ||
      report.userName ||
      report.applicant_name ||
      report.guard_name ||
      '';
    const reportRange = String(report.range_name || report.range || '').trim();
    const reportBeat = String(report.beat_name || report.beat || report.site_name || '').trim();
    const assignRange = String(info.range || '').trim();
    const assignBeat = String(info.beat || '').trim();
    const hasAssignRange = assignRange && !this.isInvalidRangeLabel(assignRange);
    const hasAssignBeat = assignBeat && !this.isInvalidBeatLabel(assignBeat);
    const isDynamic = info.isDynamic === true;

    let displayRange: string;
    let displayBeat: string;
    if (isDynamic) {
      displayRange = hasAssignRange ? assignRange : reportRange || 'Not assigned';
      displayBeat = hasAssignBeat ? assignBeat : reportBeat || 'Not assigned';
    } else {
      displayRange = hasAssignRange ? assignRange : reportRange || '—';
      displayBeat = hasAssignBeat ? assignBeat : reportBeat || '—';
    }

    return {
      ...report,
      displayRange,
      displayBeat,
      displayReporter: reporter,
      reporterIsDynamic: isDynamic,
      reporter_entity_id: info.entityId || '',
      reporter_parent_id: info.parentId || ''
    };
  }

  enrichReportsWithReporterHierarchy(
    reports: any[],
    companyId: string | number
  ): Observable<any[]> {
    if (!reports?.length) return of([]);

    const company = companyId || localStorage.getItem('company_id') || '0';
    const rows = reports.map(report => {
      const uId =
        report.applicant_id ||
        report.staff_id ||
        report.ranger_id ||
        report.guard_id ||
        report.user_id ||
        report.reporter_id ||
        report.logged_by ||
        report.submitted_by ||
        report.created_by;
      return { report, userId: uId ? String(uId) : '' };
    });

    const uniqueIds = [...new Set(rows.map(r => r.userId).filter(id => id))];
    if (uniqueIds.length === 0) {
      return of(
        reports.map(r =>
          this.attachReportDisplayHierarchy(r, {
            range: '',
            beat: '',
            reporterName: '',
            isDynamic: false
          })
        )
      );
    }

    return forkJoin(
      rows.map(({ report, userId }) => {
        if (!userId) {
          return of({
            userId,
            info: {
              range: '',
              beat: '',
              reporterName: '',
              isDynamic: false
            }
          });
        }
        return this.getCachedUserDisplayInfo(userId, company).pipe(
          catchError(() => of({ range: '', beat: '', reporterName: '', isDynamic: false })),
          map((info) => ({ userId, info }))
        );
      })
    ).pipe(
      map(pairs => {
        const infoMap = new Map(pairs.map(p => [p.userId, p.info]));
        return rows.map(({ report, userId }) =>
          this.attachReportDisplayHierarchy(
            report,
            infoMap.get(userId) || {
              range: '',
              beat: '',
              reporterName: '',
              isDynamic: false
            }
          )
        );
      })
    );
  }

  // --- PERMISSION UTILITIES ---
  isFeatureEnabled(feature: string): boolean {
    const roleId = localStorage.getItem('user_role');
    const userDataStr = localStorage.getItem('user_data');
    let userRoleStr = '';
    if (userDataStr) {
      try {
        const parsed = JSON.parse(userDataStr);
        userRoleStr = (parsed.role_name || '').toLowerCase();
      } catch (e) {}
    }

    // Superadmin and Admin always bypass
    if (roleId === '1' || roleId === '2' || roleId === '7' || userRoleStr === 'superadmin' || userRoleStr === 'admin') {
      return true;
    }

    const permsStr = localStorage.getItem('user_permissions');
    const featuresStr = localStorage.getItem('user_features');
    
    if (!permsStr && !featuresStr) {
      return true; // Fallback
    }

    try {
      let perms: any[] = [];
      if (permsStr) {
        perms = JSON.parse(permsStr);
        // 🔥 SECONDARY PARSE: If it returned a string instead of array, parse again
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { perms = []; }
        }
      }

      if ((!Array.isArray(perms) || perms.length === 0) && featuresStr) {
        const features = JSON.parse(featuresStr);
        return features.some((f: any) => 
          (f.module_key === feature || f.name?.toLowerCase().includes(feature.toLowerCase()) || String(f).toLowerCase().includes(feature.toLowerCase()))
        );
      }
      
      if (!Array.isArray(perms)) perms = [];
      
      const aliasMap: any = {
        'patrol': ['Patrolling'],
        'attendance': ['Attendance'],
        'patrol_report': ['Forest Events', 'Forest Reports'],
        'reports': ['Forest Reports', 'Reports'],
        'attendance_request': ['Attendance'],
        'asset_management': ['Asset', 'Asset Management', 'Assets'],
        'forest_events': ['Forest Events', 'Incidence', 'Forest Reports', 'Forest Report', 'forest_reports'],
        'know_your_area': ['Know Your Area'],
        'plantations': ['Plantation'],
        'chat': ['Chat'],
        'daily_updates': ['Daily Updates'],
        'client_visits': ['Visits'],
        'user_management': ['User Management'],
        'org_management': ['Organization', 'Role Management', 'Dynamic Hierarchy'],
        'hierarchy': ['Dynamic Hierarchy'],
        'roles': ['Role Management'],
        'tasks': ['Tasks', 'Task Management']
      };

      const keyToCheck = feature.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
      const aliases = (aliasMap[feature.toLowerCase()] || [feature.toLowerCase()]).map((a: string) => 
        a.toLowerCase().replace(/_/g, '').replace(/\s/g, '')
      );

      // Add 'patrol_report' as an alias for 'forest_events' internally for legacy support
      if (keyToCheck === 'forestevents') {
        aliases.push('patrolreport');
      }

      return perms.some((p: any) => {
        const rawP = String(p.module_key || p.name || p.module || p || '').toLowerCase();
        const pStr = rawP.replace(/_/g, '').replace(/\s/g, '');
        
        return aliases.some((alias: string) => pStr.includes(alias) || alias.includes(normKey(pStr)));
      });

      function normKey(s: string) { return s.split('.')[0] || s; }
    } catch (e) {
      return false;
    }
  }

  refreshPermissions() {
    console.log("🛡️ [DataService] Triggering Permission Refresh...");
    const roleId = localStorage.getItem('user_role');
    const companyId = localStorage.getItem('company_id') || '1';
    if (!roleId) return;

    this.getRoleIdList().subscribe({
      next: (oldRoles: any) => {
        const oldList = Array.isArray(oldRoles) ? oldRoles : oldRoles?.data || [];
        
        this.listV2Roles(companyId).subscribe({
          next: (v2Roles: any) => {
            const v2List = Array.isArray(v2Roles) ? v2Roles : v2Roles?.data || [];
            const rList = [...oldList, ...v2List];
            
            // Look for matching role
            const myRole = rList.find((r: any) => String(r.id) === String(roleId) || String(r.role_id) === String(roleId));
            if (myRole && myRole.permissions) {
              console.log("✅ [DataService] New permissions fetched:", myRole.permissions);
              localStorage.setItem('user_permissions', typeof myRole.permissions === 'string' ? myRole.permissions : JSON.stringify(myRole.permissions));
              this.permissionsUpdated$.next(); // Notify templates
            }
          },
          error: (err) => {
            // Fallback to old list
            const myRole = oldList.find((r: any) => String(r.id) === String(roleId));
            if (myRole && myRole.permissions) {
              localStorage.setItem('user_permissions', typeof myRole.permissions === 'string' ? myRole.permissions : JSON.stringify(myRole.permissions));
              this.permissionsUpdated$.next();
            }
          }
        });
      },
      error: (err) => console.error("❌ [DataService] Permission refresh failed", err)
    });
  }

  hasPermission(module: string, action: string): boolean {
    const roleId = localStorage.getItem('user_role');
    const userDataStr = localStorage.getItem('user_data');
    let userRoleStr = '';
    if (userDataStr) {
      try {
        const parsed = JSON.parse(userDataStr);
        userRoleStr = (parsed.role_name || '').toLowerCase();
      } catch (e) {}
    }

    // Superadmin and Admin always bypass
    if (roleId === '1' || roleId === '2' || roleId === '7' || userRoleStr === 'superadmin' || userRoleStr === 'admin') {
      return true;
    }

    const permsStr = localStorage.getItem('user_permissions');
    const featuresStr = localStorage.getItem('user_features');

    if (!permsStr && !featuresStr) {
      return true; // Fallback to full access if both are missing
    }

    try {
      let perms: any[] = [];
      if (permsStr) {
        perms = JSON.parse(permsStr);
        // 🔥 SECONDARY PARSE: If it returned a string instead of array, parse again
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) { perms = []; }
        }
      }

      if (!Array.isArray(perms)) perms = [];

      const modLower = module.toLowerCase();
      const actLower = action.toLowerCase();

      // If user_permissions is empty, fallback to user_features check
      if (perms.length === 0 && featuresStr) {
        let features: any[] = [];
        try { features = JSON.parse(featuresStr); } catch (e) { features = []; }
        if (Array.isArray(features)) {
          return features.some((f: any) => {
            const fStr = String(f.module_key || f.name || f.module || f || '').toLowerCase();
            return fStr.includes(modLower);
          });
        }
      }

      return perms.some((p: any) => {
        const pStr = String(p.module_key || p.name || p.module || p || '').toLowerCase();
        
        // --- LEGACY FALLBACK ---
        // If the permission string does not contain a dot ('.'), it represents a full module permission.
        // If it matches or contains the module name, we grant access to all actions.
        if (!pStr.includes('.') && pStr.includes(modLower)) {
          return true;
        }

        // Strict match for "Module.Action" or "Module" and "Action" present in string
        return pStr.includes(modLower) && pStr.includes(actLower);
      });
    } catch (e) {
      return false;
    }
  }

  // --- 1. SELECTION HELPERS ---
  getSelectedAsset() { return this.selectedAsset; }
  setSelectedAsset(asset: any) { this.selectedAsset = asset; }
  setSelectedAttendance(data: any) { this.selectedAttendance = data; }
  getSelectedAttendance() { return this.selectedAttendance; }
  setSelectedIncident(incident: any) { this.selectedIncident = incident; }
  getSelectedIncident() { return this.selectedIncident; }

  // --- 2. STORAGE & USER HELPERS ---
  saveRangerId(id: string) { localStorage.setItem('ranger_id', id); }
  getRangerId() { return localStorage.getItem('ranger_id'); }
  getUserCompanyId() {
    const data = localStorage.getItem('user_data');
    if (data) {
      const user = JSON.parse(data);
      return user.company_id || null;
    }
    return localStorage.getItem('company_id') || null;
  }

  // --- 3. AUTHENTICATION & PROFILE ---
  login(data: any) { return this.http.post(`${this.baseApiUrl}/login`, data); }
  setFCMToken(params: any) { return this.http.post(`${this.baseApiUrl}/setFCMToken`, params); }
  verifyUser() { return this.http.post(`${this.baseApiUrl}/verifyUser`, {}); }
  getProfile() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getProfile`, formData);
  }
  // Fetch another user's profile by their ID (admin access)
  getProfileById(userId: string | number) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('user_id', String(userId));
    formData.append('guard_id', String(userId));
    formData.append('ranger_id', String(userId));
    return this.http.post(`${this.baseApiUrl}/getProfile`, formData);
  }
  // Try getUserDetails endpoint (Sir's API variant)
  getUserDetails(userId: string | number, companyId: string | number) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token');
    
    // Aligned with Sir's expected payload
    formData.append('user_id', String(userId));
    formData.append('company_id', String(companyId));
    if (token) formData.append('api_token', token);
    
    return this.http.post(`${this.baseApiUrl}/getUserDetails`, formData, {
      headers: { 'Bypass-Token': 'true' }
    });
  }
  verifyOtp(phone: string, otp: string) { return this.http.post(`${this.baseApiUrl}/verifyUser`, { phoneNo: phone, otp: otp }); }
  updateProfilePic(photoBase64: string) { 
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      photo: photoBase64 // Full Data URI as per Postman
    };
    return this.http.post(`${this.baseApiUrl}/updateProfilePic`, payload); 
  }
  
  // NEW AUTH ENDPOINTS
  resetPasswordAuto(payload: any) { return this.http.post(`${this.baseApiUrl}/resetPassword`, payload); }
  addRegistration(payload: any) { 
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/addRegistration`, payload, { headers }); 
  }
  addUser(payload: any) { 
    // Sending as JSON to match Sir's modern V2/Postman style
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/addUser`, payload, { headers }); 
  }
  zilllogin(payload: any) { return this.http.post(`${this.baseApiUrl}/zilllogin`, payload); }
  addAdmin(payload: any) { return this.http.post(`${this.baseApiUrl}/addAdmin`, payload); }
  addSupervisor(payload: any) { return this.http.post(`${this.baseApiUrl}/addSupervisor`, payload); }
  addGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/addGuard`, payload); }

  // Fetch company info by looking at users of that company
  // Using /getChatUsers (exists in Postman collection) which has company-level metadata
  getCompanyDetails(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    // /getChatUsers returns list of users — first user's company_name field is the company
    return this.http.post(`${this.baseApiUrl}/getChatUsers`, formData);
  }

  // --- 4. DASHBOARD & ADMIN STATS ---
  // Replaced explicit api_token with interceptor
  getDashboardStats(companyId: number, from?: string, to?: string) {
    const token = localStorage.getItem('api_token');
    let params: any = {};
    if (from) params['date_from'] = from;
    if (to) params['date_to'] = to;
    
    // Manually pass Authorization Header. 
    // This triggers our Interceptor to SKIP adding api_token to the URL, 
    // bypassing the server's SQL syntax bug.
    const headers = { 'Authorization': `Bearer ${token}` };
    
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data`, { params, headers });
  }
  getAdminStats(companyId: number, timeframe?: string, from?: string, to?: string) {
    let params = `?timeframe=${timeframe || 'today'}`;
    if (from) params += `&startDate=${from}`;
    if (to) params += `&endDate=${to}`;
    return this.http.get(`${this.baseApiUrl}/assets/stats/${companyId}${params}`);
  }
  getForestAdminDashboard(companyId: number) { return this.getDashboardStats(companyId); }

  // --- 5. RANGER/PROFILE MANAGEMENT ---
  updateRanger(data: any) {
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      ...data
    };
    
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/updateUserDetails`, payload, { headers });
  }

  changePassword(data: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
        formData.append(key, String(data[key]));
      }
    }
    
    return this.http.post(`${this.baseApiUrl}/changePassword`, formData);
  }

  getRangerProfile(id: string) { 
    const token = localStorage.getItem('api_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(`${this.baseApiUrl}/rangers/${id}`, { headers }); 
  }
  getRangersByCompany(companyId: string) { 
    const token = localStorage.getItem('api_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(`${this.baseApiUrl}/rangers/company/${companyId}`, { headers }); 
  }
  getUsersByCompany(companyId: any) { 
    const token = localStorage.getItem('api_token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Bypass-Token': 'true' 
    };
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('api_token', token || '');
    
    return this.http.post(`${this.baseApiUrl}/getUsers`, formData, { headers }); 
  }

  // --- NEW: USER MANAGEMENT APIs FROM SIR'S JSON ---
  getAdmin(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getadmin`, formData);
  }

  getSupervisor(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getsupervisor`, formData);
  }

  getGuardsWithAttendStatus(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getGuardsWithAttendStatus`, formData);
  }

  getAllUnassignedGuards(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getAllUnassignedGuards`, formData);
  }

  getAdminList(companyId: any, roleId: any = '1') {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('role_id', String(roleId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getAdminList`, formData);
  }

  getSupervisorList(companyId: any, roleId: any = '3', siteId: any = '') {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('company_id', String(companyId));
    formData.append('role_id', String(roleId));
    if (siteId) formData.append('site_id', String(siteId));
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getSupervisor`, formData);
  }

  // --- 6. INCIDENTS (Aligned with Postman) ---
  getIncidentsByRanger() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    const id = this.getRangerId();
    formData.append('api_token', token);
    formData.append('ranger_id', id || '');
    return this.http.post(`${this.baseApiUrl}/getIncidence`, formData);
  }
  reportNewIncident(incidentData: any) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in incidentData) {
      if (key === 'images' && Array.isArray(incidentData[key])) {
        incidentData[key].forEach((img: any) => formData.append('images[]', img));
      } else {
        formData.append(key, String(incidentData[key]));
      }
    }
    return this.http.post(`${this.baseApiUrl}/reportIncidence`, formData); 
  }
  getIncidentsByCompany(companyId: string) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId);
    return this.http.post(`${this.baseApiUrl}/getIncidence`, formData); 
  }
  getIncidentsForMap(companyId: number) { 
    return this.getIncidentsByCompany(String(companyId));
  }
  getIncidentTrend(companyId: number): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    return this.http.post(`${this.baseApiUrl}/incidents/trend/${companyId}`, formData); 
  }

  // --- 7. PATROLS & SIGHTINGS (Aligned with Postman) ---
  startActivePatrol(payload: any) { 
    const token = localStorage.getItem('api_token') || '';
    const finalPayload = {
      api_token: token,
      ...payload
    };
    return this.http.post(`${this.baseApiUrl}/patrol/start`, finalPayload); 
  }
  getOngoingPatrols() { 
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/patrol-list`, { api_token: token }); 
  }
  getActivePatrols(companyId: number) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    return this.http.post(`${this.baseApiUrl}/patrol-list`, formData); 
  }
  updatePatrolStats(patrolId: string, data: any) { 
    // Aligned with official Postman collection: POST /patrol/{{sessionId}}/end
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      ...data
    };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/end`, payload); 
  }
  uploadPatrolPhoto(patrolId: string, photoData: any) { 
    // Aligned with official Postman collection: POST /patrol/{{sessionId}}/photos
    const token = localStorage.getItem('api_token') || '';
    const payload = {
      api_token: token,
      photo: photoData.photo
    };
    return this.http.post(`${this.baseApiUrl}/patrol/${patrolId}/photos`, payload); 
  }
  getCompletedPatrolLogs() { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/patrol-logs`, formData); 
  }
  getPatrolsByCompany(companyId: number, dateFrom?: string, dateTo?: string) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    if (dateFrom) formData.append('date_from', dateFrom);
    if (dateTo) formData.append('date_to', dateTo);
    return this.http.post(`${this.baseApiUrl}/patrol-list`, formData);
  }
  getPatrolById(id: number | string) {
    const token = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id') || '';
    
    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', companyId);
    formData.append('patrol_id', String(id));
    formData.append('id', String(id));

    console.log(`🔍 [DEBUG] getPatrolById (FormData):`, { id, companyId });
    return this.http.post(`${this.baseApiUrl}/patrol-list`, formData);
  }
  saveSighting(payload: any) { 
    return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); 
  }
  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  submitForestEvent(payload: any, headers?: any) {
    // Sir's precise API accepts Raw application/json mapping, NOT FormData!
    const finalPayload = { 
      ...payload, 
      site_id: payload.site_id || null 
    };

    return this.http.post(`${this.baseApiUrl}/forest-reports`, finalPayload, { headers });
  }
  savePatrolLogs(payload: any) { return this.http.post(`${this.baseApiUrl}/save-patrol-logs`, payload); }
  updatePatrolLog(id: string | number, payload: any) { return this.http.put(`${this.baseApiUrl}/patrol-logs/${id}`, payload); }
  deletePatrolLog(id: string | number) { return this.http.delete(`${this.baseApiUrl}/patrol-logs/${id}`); }
  getPatrolPhotos(sessionId: string) { 
    return this.http.post(`${this.baseApiUrl}/patrol/${sessionId}/getphotos`, {}); 
  }
  
  getPatrolMethods() { 
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    return this.http.get(`${this.baseApiUrl}/getMethods?api_token=${token}`, { headers }); 
  }
 
  getPatrolTypes() {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    return this.http.get(`${this.baseApiUrl}/getPatrolTypes?api_token=${token}`, { headers });
  }
 
  getLogCategories() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/logCategories?api_token=${token}`);
  }

  getAllMapSightings(companyId: number) { return this.http.get(`${this.baseApiUrl}/patrols/all-sightings?companyId=${companyId}`); }
  getSightingCount(companyId: number, from?: string, to?: string): Observable<number> {
    let params: any = { companyId: companyId.toString() };
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<number>(`${this.baseApiUrl}/patrols/stats/sightings-count`, { params });
  }

  // --- 8. ATTENDANCE (BEAT & ONSITE) ---
  notify() { return this.http.post(`${this.baseApiUrl}/notify`, {}); }
  
  markAttendance(payload: any, headers?: any) { 
    return this.http.post(`${this.baseApiUrl}/v2/attendance/mark`, payload, { headers }); 
  }
  
  markAttendanceExit(payload: any, headers?: any) { 
    return this.http.post(`${this.baseApiUrl}/v2/attendance/exit`, payload, { headers }); 
  }

  /** True when log is on-location / onsite attendance (not beat). */
  isOnsiteAttendance(log: any): boolean {
    if (!log) return false;
    const typeStr = String(log.type || log.attendance_type || '').toUpperCase();
    const siteId = String(log.site_id ?? '').toLowerCase();
    const geoName = String(log.geo_name || log.geofence || '').toLowerCase();
    const remark = String(log.remark || '').toLowerCase();

    if (typeStr === 'LOCATION' || typeStr === 'ONSITE') return true;
    if (siteId === '99999' || siteId === 'onsite') return true;
    if (String(log.geo_id) === '99999') return true;
    if (geoName.includes('[on location]') || geoName.includes('[onsite]')) return true;
    if (log.site_name && String(log.site_name).toLowerCase().includes('onsite')) return true;
    if (remark.includes('on location') || remark.includes('onsite attendance')) return true;
    return false;
  }

  /** True when log is beat (geofence) attendance — never overlaps onsite. */
  isBeatAttendance(log: any): boolean {
    if (!log || this.isOnsiteAttendance(log)) return false;

    const siteId = String(log.site_id ?? '').toLowerCase();
    const typeStr = String(log.type || log.attendance_type || '').toUpperCase();
    const remark = String(log.remark || '').toLowerCase();

    if (siteId === 'beat') return true;
    if (typeStr === 'BEAT') return true;
    if (remark.includes('beat attendance')) return true;
    if (typeStr === 'ENTRY' || typeStr === 'EXIT') return true;
    const entityId = Number(log.entity_id);
    if (!Number.isNaN(entityId) && entityId > 0) return true;
    
    // Check geo_id: any valid ID that is not 99999 (which is reserved for onsite)
    if (log.geo_id !== undefined && log.geo_id !== null && String(log.geo_id) !== '99999') {
      const geoIdNum = Number(log.geo_id);
      if (!Number.isNaN(geoIdNum) && geoIdNum > 0) return true;
    }
    
    return false;
  }

  private extractAttendanceLogsArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res?.data && Array.isArray(res.data)) return res.data;
    if (res?.attendance && Array.isArray(res.attendance)) return res.attendance;
    if (res?.data?.attendance && Array.isArray(res.data.attendance)) return res.data.attendance;
    return [];
  }

  private logBelongsToRangerToday(log: any, rangerId: string, todayStr: string): boolean {
    const dateVal = log.timestamp || log.entryDateTime || log.created_at || log.createdAt || log.date;
    if (!dateVal) return false;
    let logDate = String(dateVal).split(' ')[0].split('T')[0];
    if (logDate.includes('-') && logDate.split('-')[0].length === 2) {
      const parts = logDate.split('-');
      logDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (logDate !== todayStr) return false;
    const logRangerId = String(log.user_id || log.ranger_id || log.applicant_id || log.guard_id || '');
    return logRangerId === '' || logRangerId === String(rangerId);
  }

  /** Whether beat and/or onsite attendance exists today for the current ranger. */
  checkTodayAttendanceStatus(): Observable<{ hasBeat: boolean; hasOnsite: boolean }> {
    const companyId = this.getUserCompanyId();
    const rangerId = this.getRangerId();
    const todayStr = new Date().toISOString().split('T')[0];

    if (!companyId || !rangerId) {
      return of({ hasBeat: false, hasOnsite: false });
    }

    return forkJoin({
      monthly: this.getAttendanceLogsByRanger(companyId).pipe(catchError(() => of([]))),
      requests: this.getAttendanceRequests(companyId).pipe(catchError(() => of([])))
    }).pipe(
      map(({ monthly, requests }) => {
        const combined = [
          ...this.extractAttendanceLogsArray(monthly),
          ...this.extractAttendanceLogsArray(requests)
        ];
        const todayLogs = combined.filter(l => this.logBelongsToRangerToday(l, rangerId, todayStr));

        let hasBeat = todayLogs.some(l => this.isBeatAttendance(l));
        let hasOnsite = todayLogs.some(l => this.isOnsiteAttendance(l));

        const beatDrafts = this.getAttendanceDrafts('beat');
        const onsiteDrafts = this.getAttendanceDrafts('onsite');
        if (beatDrafts.some(d => (d.createdAt || '').split('T')[0] === todayStr)) hasBeat = true;
        if (onsiteDrafts.some(d => (d.createdAt || '').split('T')[0] === todayStr)) hasOnsite = true;

        return { hasBeat, hasOnsite };
      }),
      catchError(() => of({ hasBeat: false, hasOnsite: false }))
    );
  }

  testGroupBy() { return this.http.post(`${this.baseApiUrl}/testGroupBy`, {}); }
  
  markSupervisorAttendance() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendance`, {}); }
  markSupervisorAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markSupervisorAttendanceExit`, {}); }
  markGuardAttendance() { return this.http.post(`${this.baseApiUrl}/markGuardAttendance`, {}); }
  markGuardAttendanceExit() { return this.http.post(`${this.baseApiUrl}/markGuardAttendanceExit`, {}); }
  
  requestEntryAttendance(payload: any, headers: any = {}) { 
    const token = localStorage.getItem('api_token');
    const finalHeaders = { 
      ...headers, 
      'Bypass-Token': 'true',
      'Authorization': `Bearer ${token}` 
    };
    return this.http.post(`${this.baseApiUrl}/requestEntryAttendance`, payload, { headers: finalHeaders }); 
  }
  updateAttendanceRequestStatus(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    const id = payload.id || payload.attendance_id || payload.request_id || payload.recordId;
    const companyId = payload.company_id || localStorage.getItem('company_id');

    // Aligned with Postman collection: Uses 'recordId' and 'formdata' mode
    const formData = new FormData();
    formData.append('recordId', String(id));
    formData.append('company_id', String(companyId));
    formData.append('api_token', token);
    
    // Logic fields
    formData.append('status', payload.status || 'approved');
    formData.append('remark', payload.remark || 'Onsite Attendance');
    
    // Contextual fields for safety
    if (payload.guard_id) formData.append('guard_id', String(payload.guard_id));
    if (payload.role_id) formData.append('role_id', String(payload.role_id));

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };

    return this.http.post(`${this.baseApiUrl}/updateAttendanceRequestStatus`, formData, { headers }); 
  }
  requestExitAttendance(payload: any) { return this.http.post(`${this.baseApiUrl}/requestExitAttendance`, payload); }
  
  // --- V2 APIS ---
  getV2UserList(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/user/list`, {
      api_token: token,
      ...payload
    });
  }

  getV2DashboardData(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/dashboard/data`, {
      api_token: token,
      ...payload
    });
  }

  getV2KPIDetails(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/dashboard/kpi-details`, {
      api_token: token,
      ...payload
    });
  }

  getAttendanceRequests(companyId: string) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId);
    return this.http.post(`${this.baseApiUrl}/getAttendanceRequests`, formData); 
  }

  // --- Aliases for compatibility ---
  getPendingOnsiteRequests(companyId: string) { return this.getAttendanceRequests(companyId); }
  updateOnsiteStatus(id: number, status: string) { 
    return this.updateAttendanceRequestStatus({ id: id, status: status }); 
  }
  getAttendanceRequestDetails(id: string) { 
    const token = localStorage.getItem('api_token');
    const payload = { api_token: token, id: id };
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/getAttendanceRequestDetails`, payload, { headers }); 
  }
  
  attendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/attendanceGroupByGeoname`, {}); }
  allAttendanceGroupByGeoname() { return this.http.post(`${this.baseApiUrl}/allAttendanceGroupByGeoname`, {}); }
  getAttendanceFlag() { return this.http.post(`${this.baseApiUrl}/getAttendanceFlag`, {}); }
  
  getGuardsOnSite(companyId?: string) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    const cId = companyId || localStorage.getItem('company_id') || '';
    
    formData.append('api_token', token);
    formData.append('company_id', cId);
    
    return this.http.post(`${this.baseApiUrl}/getGuardsOnSite`, formData); 
  }
  getGuardAttendance() { return this.http.post(`${this.baseApiUrl}/getGuardAttendance`, {}); }
  
  markOfflineEntryAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/markOfflineEntryAttendance`, payload, { headers }); }
  markOfflineExitAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/markOfflineExitAttendance`, payload, { headers }); }
  markOfflineEmergencyAttendance(payload: any, headers?: any) { return this.http.post(`${this.baseApiUrl}/uploadOfflineAttendanceRequest`, payload, { headers }); }
  
  applyWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/applyWeekoff`, payload); }
  getWeekoff(payload: any) { return this.http.post(`${this.baseApiUrl}/getWeekoff`, payload); }
  getUserMonthlyAttendance(payload: any, headers?: any) { 
    // Usually history needs token in body too to match Sir's API style
    return this.http.post(`${this.baseApiUrl}/getUserMonthlyAttendance`, payload, { headers }); 
  }

  getAttendanceLogsByRanger(companyId: string) { 
    const token = localStorage.getItem('api_token');
    const rangerId = localStorage.getItem('ranger_id');
    const now = new Date();
    const payload = { 
      company_id: companyId, 
      api_token: token,
      user_id: rangerId,
      ranger_id: rangerId,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    };
    const headers = { 'Bypass-Token': 'true' };
    return this.getUserMonthlyAttendance(payload, headers); 
  }
  
  getAttendanceByCompany(companyId: string) { return this.getAttendanceRequests(companyId); }
  
  markOnsiteAttendance(payload: any, headers?: any) { 
    // Reverting to requestEntryAttendance for onsite approval workflow
    return this.requestEntryAttendance(payload, headers); 
  }
  
  getOnsiteLogsByRanger(rangerId: string, companyId: string) { 
    const token = localStorage.getItem('api_token');
    const now = new Date();
    const payload = { 
      company_id: companyId, 
      api_token: token, 
      ranger_id: rangerId,
      user_id: rangerId, // Sir's API often expects user_id
      month: now.getMonth() + 1,
      year: now.getFullYear()
    };
    const headers = { 'Bypass-Token': 'true' };
    return this.getUserMonthlyAttendance(payload, headers); 
  }
  getWeeklyAttendanceStats(companyId: any, rangerId?: any): Observable<number[]> {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    
    // Using both camelCase and snake_case for maximum compatibility with various backend versions
    const params: any = { 
      type: 'attendance', 
      companyId: companyId.toString(),
      company_id: companyId.toString(),
      user_id: rangerId ? rangerId.toString() : '' // Added user_id for Sir's API compatibility
    };
    if (rangerId) {
      params.rangerId = rangerId.toString();
      params.ranger_id = rangerId.toString();
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.get<any>(url, { params, headers }).pipe(
      map(res => {
        // Robust mapping to handle different response structures from Sir's API
        const data = res?.data ? res.data : res;
        
        // 1. Direct number array [0, 5, 2, ...]
        if (Array.isArray(data) && (data.length === 0 || typeof data[0] === 'number')) {
          return data.length === 7 ? data : [...data, 0, 0, 0, 0, 0, 0, 0].slice(0, 7);
        }
        
        // 2. Nested history objects
        const history = data?.officerStatus?.history || data?.history || data?.attendance_history;
        if (Array.isArray(history)) return history;

        // 3. Array of objects with count property [{count: 5}, {count: 2}, ...]
        if (Array.isArray(data) && data.length > 0 && (data[0]?.count !== undefined || data[0]?.total !== undefined)) {
          return data.map((item: any) => Number(item.count || item.total || 0));
        }

        return [0, 0, 0, 0, 0, 0, 0];
      }),
      catchError(err => {
        console.warn("⚠️ Attendance API failing, using fallback empty data:", err);
        return of([0, 0, 0, 0, 0, 0, 0]);
      })
    );
  }




  

  // --- 9. ASSETS MANAGEMENT ---
  addAsset(assetData: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    
    for (const key in assetData) {
      if (Array.isArray(assetData[key])) {
        assetData[key].forEach((val: any) => formData.append(`${key}[]`, val));
      } else {
        formData.append(key, assetData[key]);
      }
    }
    return this.http.post(`${this.baseApiUrl}/asset/create`, formData, {
      headers: { 'Bypass-Token': 'true' }
    }); 
  }
  updateAsset(id: any, payload: any): Observable<any> {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);

    for (const key in payload) {
      if (payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    }
    return this.http.post(`${this.baseApiUrl}/asset/${id}/update`, formData, {
      headers: { 'Bypass-Token': 'true' }
    });
  }
  deleteAsset(id: string | number): Observable<any> { return this.http.post(`${this.baseApiUrl}/asset/${id}/delete`, {}); }
  getAssets(companyId: number): Observable<any> { 
    const token = localStorage.getItem('api_token') || '';
    const isV2 = localStorage.getItem('global_allowed_entity_ids') || 
                 localStorage.getItem('admin_layer_id') || 
                 localStorage.getItem('is_restricted_admin') === 'true';

    if (isV2) {
      const userId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id');
      const payload: any = { 
        api_token: token,
        company_id: companyId,
        cid: companyId,
        user_id: userId,
        guard_id: userId,
        ranger_id: userId
      };

      const allowedIdsStr = localStorage.getItem('global_allowed_entity_ids');
      const adminLayerId = localStorage.getItem('admin_layer_id');
      if (allowedIdsStr && adminLayerId) {
        try {
          payload.layer_id = adminLayerId;
          payload.entity_id = JSON.parse(allowedIdsStr);
          payload.is_restricted = true;
        } catch (e) {}
      }

      return this.http.post(`${this.baseApiUrl}/v2/assets/list`, payload);
    }

    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', companyId.toString());
    
    return this.http.post(`${this.baseApiUrl}/asset-list`, formData, {
      headers: { 'Bypass-Token': 'true' }
    }); 
  }
  getMyAssets(companyId: number, userId: number): Observable<any> { 
    const formData = new FormData();
    formData.append('company_id', companyId.toString());
    formData.append('created_by', userId.toString());
    return this.http.post(`${this.baseApiUrl}/asset-list`, formData); 
  }
  getAssetDetail(id: string | number): Observable<any> { 
    const formData = new FormData();
    formData.append('id', id.toString());
    return this.http.post(`${this.baseApiUrl}/asset/detail`, formData); 
  }
  downloadAssetReport(payload: any) { 
    return this.http.post(`${this.baseApiUrl}/asset-report`, payload, { responseType: 'blob', observe: 'response' }); 
  }

  getAssetStats(companyId: number): Observable<any> {
    const token = localStorage.getItem('api_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(`${this.baseApiUrl}/forest-admin-dashboard/data?type=assets&companyId=${companyId}`, { headers });
  }
  getAssetTrend(companyId: number): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');
    
    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };
    
    return this.http.post(`${this.baseApiUrl}/assets/assets-trend`, formData, { headers }); 
  }
  getAssetsTrend(companyId: number): Observable<any> { return this.getAssetTrend(companyId); }
  getAssetCategories(companyId: any): Observable<any[]> { return this.getCategories(companyId); }
  getAssetStatuses(companyId: number): Observable<any> { return this.getStatuses(companyId); }
  
  getCategories(companyId: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');

    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true' // Prevents interceptor from injecting Bearer token if it conflicts
    };

    return this.http.post(`${this.baseApiUrl}/assets/categories`, formData, { headers }).pipe(
      catchError(err => {
        console.warn("Backend categories API failed, using fallback", err);
        return of([
          { id: 1, name: 'Vehicles (Jeeps/Bikes)' },
          { id: 2, name: 'Communication (Walkie Talkies)' },
          { id: 3, name: 'Field Tools (Drones/Cameras)' },
          { id: 4, name: 'Office Assets' }
        ]);
      })
    );
  }

  getStatuses(companyId: any): Observable<any> { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('company_id', companyId ? companyId.toString() : '');

    const headers = { 
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };

    return this.http.post(`${this.baseApiUrl}/assets/statuses`, formData, { headers }).pipe(
      catchError(err => {
        console.warn("Backend statuses API failed, using fallback", err);
        return of([
          { id: 1, status_name: 'Operational (Good)' },
          { id: 2, status_name: 'Maintenance Needed' },
          { id: 3, status_name: 'Out of Order / Broken' }
        ]);
      })
    );
  }

  // --- 10. ANALYTICS ---
  getAssetsAnalytics(companyId: number, startDate?: string, endDate?: string) {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=assets&companyId=${companyId}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  getEventsAnalytics(companyId: number, timeframe: string, startDate?: string, endDate?: string) {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=events&companyId=${companyId}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  
  // FIX: Admin Analytics Missing Function
  getSubCategoryAnalytics(companyId: number, category: string, subCategory: string, timeframe: string, startDate?: string, endDate?: string): Observable<any> {
    const token = localStorage.getItem('api_token');
    let url = `${this.baseApiUrl}/forest-admin-dashboard/data?type=subcategory-details&companyId=${companyId}&category=${category}&subCategory=${encodeURIComponent(subCategory)}&timeframe=${timeframe}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  getCriminalAnalytics(companyId: any, timeframe: string, range: string, beat: string): Observable<any> {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    const params = { type: 'criminal', companyId: companyId.toString(), timeframe: timeframe || 'month', range: range || 'all', beat: beat || 'all' };
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { params, headers });
  }
  getFireAnalytics(companyId: any, timeframe: string, range: string, beat: string) {
    const token = localStorage.getItem('api_token');
    const url = `${this.baseApiUrl}/forest-admin-dashboard/data`;
    const params = { type: 'fire', companyId: companyId.toString(), timeframe, range, beat };
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get(url, { params, headers });
  }

  // --- 11. ALERTS & SOS ---
  sendSOSAlert(payload: any) { 
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('latitude', payload.latitude || '');
    formData.append('longitude', payload.longitude || '');
    formData.append('message', payload.message || 'Emergency SOS Triggered');
    
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Bypass-Token': 'true'
    };
    
    return this.http.post(`${this.baseApiUrl}/alerts/sos`, formData, { headers }); 
  }
  getLatestAlerts(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/${companyId}`); }
  getAlertsByCompany(companyId: number): Observable<any[]> { return this.http.get<any[]>(`${this.baseApiUrl}/alerts/company/${companyId}`); }

  // --- 12. PASSWORD & OTP ---
  requestPasswordReset(phoneNo: string) { return this.http.post(`${this.baseApiUrl}/resetPassword`, { phoneNo }); }
  resetPassword(phoneNo: string, otp: string, newPass: string) { return this.http.post(`${this.baseApiUrl}/resetPassword`, { phoneNo, otp, newPass }); }


  get(endpoint: string) { return this.http.get(`${this.baseApiUrl}/${endpoint}`); }

  // --- 14. NEW ENDPOINTS FROM FMS COLLECTION ---
  getForestReportConfigs(companyId?: any) { 
    const token = localStorage.getItem('api_token') || '';
    const cid = companyId || localStorage.getItem('company_id') || '';
    const headers = { 'Bypass-Token': 'true' };
    return this.http.get(`${this.baseApiUrl}/forest-report-configs?api_token=${token}&company_id=${cid}`, { headers }); 
  }
  
  private globalForestReportsCache: any = null;

  getForestReports(paramsOrCategory?: any, forceRefresh: boolean = false) { 
    const isV2 = localStorage.getItem('global_allowed_entity_ids') || 
                 localStorage.getItem('admin_layer_id') || 
                 localStorage.getItem('is_restricted_admin') === 'true';

    if (isV2) {
      if (forceRefresh) {
        this.globalForestReportsCache = null;
      }

      if (this.globalForestReportsCache && !paramsOrCategory) {
        return of(this.globalForestReportsCache);
      }

      const token = localStorage.getItem('api_token') || '';
      const companyId = localStorage.getItem('company_id');
      const userId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id');
      
      const payload: any = { 
        api_token: token,
        company_id: companyId,
        user_id: userId
      };

      // Apply V2 hierarchy filter
      const allowedIdsStr = localStorage.getItem('global_allowed_entity_ids');
      const adminLayerId = localStorage.getItem('admin_layer_id');
      if (allowedIdsStr && adminLayerId) {
        try {
          payload.layer_id = adminLayerId;
          payload.entity_id = JSON.parse(allowedIdsStr);
          payload.is_restricted = true;
        } catch (e) {}
      }

      return this.http.post(`${this.baseApiUrl}/v2/forest-reports/list`, payload).pipe(
        map((res: any) => {
          const list = res?.data || res?.reports || res || [];
          if (!paramsOrCategory) {
            this.globalForestReportsCache = list;
          }
          return list;
        })
      );
    }

    let url = `${this.baseApiUrl}/forest-reports`;
    
    if (forceRefresh) {
      this.globalForestReportsCache = null;
    }

    if (this.globalForestReportsCache && !paramsOrCategory) {
      return of(this.globalForestReportsCache);
    }
    
    let obs: Observable<any>;
    if (typeof paramsOrCategory === 'string') {
      const params = { category: paramsOrCategory };
      obs = this.http.get(url, { params });
    } else if (paramsOrCategory && typeof paramsOrCategory === 'object') {
      obs = this.http.get(url, { params: paramsOrCategory });
    } else {
      obs = this.http.get(url);
    }
    
    return obs.pipe(
      map(res => {
        if (!paramsOrCategory) {
          this.globalForestReportsCache = res;
        }
        return res;
      })
    );
  }
  getSitesList(companyId: string) {
    const token = localStorage.getItem('api_token');
    return this.http.post(`${this.baseApiUrl}/getSites`, { 
      company_id: companyId, 
      api_token: token 
    });
  }
  showForestReport(id: string | number, params?: any) { return this.http.get(`${this.baseApiUrl}/forest-reports/${id}`, { params }); }
  createForestReport(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports`, payload); }
  updateForestReport(id: string | number, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports/${id}/update`, payload); }
  deleteForestReport(id: string | number, payload?: any) { return this.http.request('delete', `${this.baseApiUrl}/forest-reports/${id}`, { body: payload }); }
  takeActionOnReport(reportId: string | number, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-reports/${reportId}/action`, payload); }
  
  // --- 17. GEOFENCING & SITES ---
  addSite(payload: any) { return this.http.post(`${this.baseApiUrl}/addSite`, payload); }
  updateSite(payload: any) { return this.http.post(`${this.baseApiUrl}/updateSite`, payload); }
  getGuardSite(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardSite`, payload); }
  getGuardsInSite(siteId: any) { 
    const token = localStorage.getItem('api_token');
    const formData = new FormData();
    formData.append('site_id', String(siteId));
    formData.append('api_token', token || '');
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/getGuardsInSite`, formData, { headers }); 
  }
  getGuardSiteLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardSiteLocation`, payload); }
  addGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/addGeofence`, payload); }
  updateGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/updateGeofence`, payload); }
  deleteGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteGeofence`, payload); }
  getGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getGeofences`, payload); }
  getSiteGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getSiteGeofences`, payload); }
  getGeofenceDetails(payload: any) { return this.http.post(`${this.baseApiUrl}/getGeofenceDetails`, payload); }
  addGeofenceMultiGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/addGeofenceMultiGuard`, payload); }
  getSupervisorSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getSupervisorSites`, payload); }
  getSupervisorPrimaryGeofence(payload: any) { return this.http.post(`${this.baseApiUrl}/getSupervisorPrimaryGeofence`, payload); }
  getGuardsAssociatedWithGeo(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardsAssociatedWithGeo`, payload); }
  getGuardGeofence(payload: any) { 
    const token = localStorage.getItem('api_token');
    const fullPayload = { ...payload, api_token: token };
    return this.http.post(`${this.baseApiUrl}/getGuardGeofence`, fullPayload); 
  }
  getAllGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getAllGeofences`, payload); }
  deleteGeofenceMultiGuard(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteGeofenceMultiGuard`, payload); }
  getClientSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getClientSites`, payload); }
  getSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getSites`, payload); }

  getPublicHierarchy(companyId: any): Observable<{ranges: any[], beats: any[]}> {
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/getSites`, { company_id: companyId }, { headers }).pipe(
      map((res: any) => {
        const data = res?.data || res || [];
        const sites = Array.isArray(data) ? data : [];
        const rangeSet = new Set<string>();
        const beatArray: any[] = [];
        sites.forEach((s: any) => {
          const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
          const bName = s.name || s.beat_name || s.beat || s.site_name || s.site;
          if (rName) rangeSet.add(rName);
          if (bName) beatArray.push({ name: bName, parentName: rName });
        });
        return { ranges: Array.from(rangeSet).sort(), beats: beatArray };
      }),
      catchError(() => of({ ranges: [], beats: [] }))
    );
  }

  getHierarchyForFilters(companyId: string): Observable<{ranges: string[], beats: any[]}> {
    const apiToken = localStorage.getItem('api_token') || '';
    return new Observable<{ranges: string[], beats: any[]}>(observer => {
      const rangeSet = new Set<string>();
      const beatArray: any[] = [];

      this.getSites({ api_token: apiToken, company_id: companyId }).subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          const sites = Array.isArray(data) ? data : [];
          sites.forEach((s: any) => {
            const rName = s.client_name || s.range_name || s.range || s.division_name || s.division || 'General Range';
            const bName = s.name || s.beat_name || s.beat || s.site_name || s.site;
            if (rName) rangeSet.add(rName);
            if (bName) beatArray.push({ name: bName, parentName: rName });
          });
          this._mergeOrgEntitiesIntoFilters(rangeSet, beatArray, observer);
        },
        error: () => {
          this._mergeOrgEntitiesIntoFilters(rangeSet, beatArray, observer);
        }
      });
    });
  }

  private _mergeOrgEntitiesIntoFilters(rangeSet: Set<string>, beatArray: any[], observer: any) {
    this.listOrgEntities('').subscribe({
      next: (res: any) => {
        const entities = res?.data || res || [];
        if (Array.isArray(entities)) {
          const validEntities = entities.filter(e => e && e.layer_id !== undefined && e.layer_id !== null);
          const layerIds = Array.from(new Set(
            validEntities.map(e => Number(e.layer_id))
          )).sort((a, b) => a - b);

          if (layerIds.length > 0) {
            const rangeLayerId = layerIds[0];
            entities.forEach((e: any) => {
              const eLayerId = Number(e.layer_id);
              if (eLayerId === rangeLayerId) {
                if (e.name) rangeSet.add(e.name);
              } else if (layerIds.slice(1).includes(eLayerId)) {
                const parentId = e.parent_id ?? e.parentId ?? e.parent?.id;
                const parent = entities.find((p: any) => String(p.id) === String(parentId));
                beatArray.push({ name: e.name, parentName: parent?.name || 'General Range' });
              }
            });
          } else {
            // Fallback for legacy static layer checks
            entities.forEach((e: any) => {
              if (String(e.layer_id) === '3') {
                if (e.name) rangeSet.add(e.name);
              } else if (String(e.layer_id) === '4' || String(e.layer_id) === '5') {
                const parentId = e.parent_id ?? e.parentId ?? e.parent?.id;
                const parent = entities.find((p: any) => String(p.id) === String(parentId));
                beatArray.push({ name: e.name, parentName: parent?.name || 'General Range' });
              }
            });
          }
        }
        observer.next({ ranges: Array.from(rangeSet).sort(), beats: beatArray });
        observer.complete();
      },
      error: () => {
        observer.next({ ranges: Array.from(rangeSet).sort(), beats: beatArray });
        observer.complete();
      }
    });
  }

  getTrackSites(payload: any) { return this.http.post(`${this.baseApiUrl}/getTrackSites`, payload); }
  assignSupervisorsToSites(payload: any) { return this.http.post(`${this.baseApiUrl}/assignSupervisorsToSites`, payload); }
  deleteSiteFromSupervisor(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteSiteFromSupervisor`, payload); }
  deleteSite(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteSite`, payload); }
  getNearByGeofences(payload: any) { return this.http.post(`${this.baseApiUrl}/getNearByGeofences`, payload); }

  // --- LOCATION / GPS APIs ---
  getLocations(payload: any) { return this.http.post(`${this.baseApiUrl}/locations`, payload); }
  getGuardLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getGuardLiveLocation`, payload); }
  getLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getLiveLocation`, payload); }
  getLiveLocationSiteWise(payload: any) { return this.http.post(`${this.baseApiUrl}/getLiveLocationSiteWise`, payload); }
  getAllGuardLiveLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/getAllGuardLiveLocation`, payload); }
  getPlayback(payload: any) { return this.http.post(`${this.baseApiUrl}/getPlayback`, payload); }
  storeLocation(payload: any) { return this.http.post(`${this.baseApiUrl}/storeLocation`, payload); }
  storeLocationBG(payload: any) { return this.http.post(`${this.baseApiUrl}/storeLocationBG`, payload); }
  
  getBeatBoundaries(layerId?: number, parentId?: number) { 
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const payload: any = { api_token: token };
    
    // In V2, we might need layer_id. If omitted, backend might return all or require it.
    if (layerId !== undefined) payload.layer_id = layerId;
    if (parentId !== undefined) payload.parent_id = parentId;

    // Use the new V2 Dynamic Hierarchy API
    return this.http.post(`${this.baseApiUrl}/v2/hierarchy-entities`, payload, { headers }); 
  }
  // --- 15. HIERARCHY & MAP DATA ---
  getBeatMapData() { return this.http.get(`${this.baseApiUrl}boundaries/beat-map-data`); }
  getBoundaryData(level?: any, id?: any, year?: any) {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };

    // Sir's Screenshot defaults: level=company, id=0, year=all
    params.level = level || 'company';
    params.id = (id !== undefined && id !== null) ? String(id) : '0';
    params.year = year || 'all';

    return this.http.get(`${this.baseApiUrl}/boundaries/data`, { params, headers });
  }
  getLayers(level?: string | number, id?: string | number) {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };
    if (level !== undefined && level !== null) params.level = String(level);
    if (id !== undefined && id !== null) params.id = String(id);
    return this.http.get(`${this.baseApiUrl}/boundaries/layers`, { params, headers });
  }
  getYears() {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };
    return this.http.get(`${this.baseApiUrl}/boundaries/years`, { params, headers });
  }
  getRanges() {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };
    return this.http.get(`${this.baseApiUrl}/boundaries/ranges`, { params, headers });
  }
  getSections(rangeId: string | number) {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };
    return this.http.get(`${this.baseApiUrl}/boundaries/sections/${rangeId}`, { params, headers });
  }
  getBeats(sectionId?: string | number) {
    const token = localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = { api_token: token };
    return this.http.get(`${this.baseApiUrl}/boundaries/beats${sectionId ? '/' + sectionId : ''}`, { params, headers });
  }

  // --- 15.1 PLANTATIONS ---
  getPlantations() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getPlantations`, formData);
  }

  createPlantation(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) {
      formData.append(key, payload[key]);
    }
    return this.http.post(`${this.baseApiUrl}/createPlantation`, formData);
  }

  getPlantationDetail(id: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('id', id);
    return this.http.post(`${this.baseApiUrl}/getPlantationDetail`, formData);
  }

  approvePlantation(id: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('id', id);
    formData.append('status', 'Approved');
    formData.append('is_approved', '1');
    return this.http.post(`${this.baseApiUrl}/approvePlantation`, formData);
  }

  rejectPlantation(id: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('id', id);
    formData.append('status', 'Rejected');
    formData.append('is_approved', '2');
    return this.http.post(`${this.baseApiUrl}/approvePlantation`, formData); // Using same endpoint if it's generic, or guessing /rejectPlantation
  }

  addPlantationObservation(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) {
      formData.append(key, payload[key]);
    }
    return this.http.post(`${this.baseApiUrl}/addPlantationObservation`, formData);
  }

  // --- 16. COMMUNICATION (CHAT/NOTIFY) ALIGNED WITH SIR'S API ---
  postUpdate(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/postUpdate`, formData);
  }

  getUpdates() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getUpdates`, formData);
  }

  getChatUsers() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    const siteId = localStorage.getItem('site_id') || ''; // Aligned with new collection
    formData.append('api_token', token);
    formData.append('site_id', siteId);
    
    return this.http.post(`${this.baseApiUrl}/getChatUsers`, formData).pipe(
      catchError(err => {
        console.warn("getChatUsers API failing (Controller missing on server), using mock data");
        return of({
          status: 'SUCCESS',
          data: [
            { id: 1, name: 'Super Admin', role: 'Superadmin' },
            { id: 2, name: 'Range Officer', role: 'Admin' },
            { id: 7, name: 'Beat Guard 1', role: 'Guard' }
          ]
        });
      })
    );
  }

  getConversations() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    const myId = localStorage.getItem('ranger_id') || ''; // 'id' field from new collection
    formData.append('api_token', token);
    formData.append('id', myId);
    
    return this.http.post(`${this.baseApiUrl}/getConversations`, formData).pipe(
      catchError(err => {
        console.warn("getConversations API failing (Controller missing on server), using mock data");
        return of({
          status: 'SUCCESS',
          data: [
            { id: 1, name: 'Forest Admin', last_message: 'Reports have been updated.', time: '10:30 AM', unread: 2 },
            { id: 2, name: 'Range Group', is_group: true, last_message: 'New patrol assigned.', time: 'Yesterday', unread: 0 },
            { id: 7, name: 'Support Team', last_message: 'How can I help you?', time: '2 days ago', unread: 0 }
          ]
        });
      })
    );
  }

  getChatHistory(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/getChatHistory`, formData).pipe(
      catchError(err => {
        console.warn("getChatHistory API failing, using mock data");
        return of({
          status: 'SUCCESS',
          data: [
            { sender_id: 'other', message: 'Hello! How is the patrol going?', created_at: new Date().toISOString() },
            { sender_id: 'me', message: 'Everything is fine, just completed the beat.', created_at: new Date().toISOString() }
          ]
        });
      })
    );
  }

  getGroupChatHistory(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/getGroupChatHistory`, formData).pipe(
      catchError(err => {
        console.warn("getGroupChatHistory API failing, using mock data");
        return of({
          status: 'SUCCESS',
          data: [
            { sender_id: '1', sender_name: 'Admin', message: 'Team, please check the new circular.', created_at: new Date().toISOString() },
            { sender_id: 'me', message: 'Received, thank you.', created_at: new Date().toISOString() }
          ]
        });
      })
    );
  }

  createGroup(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/createGroup`, formData);
  }

  uploadChatFile(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/uploadFile`, formData);
  }

  // --- 17. FIELD VISITS ALIGNED WITH SIR'S API ---
  addClientVisit(payload: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/addClientVisit`, formData);
  }
  updateClientVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/updateClientVisit`, payload); }
  getClientVisits() { return this.http.post(`${this.baseApiUrl}/getClientVisits`, {}); }
  getClientFollowUps() { return this.http.post(`${this.baseApiUrl}/getClientFollowUps`, {}); }
  getFieldVisitList() { return this.http.post(`${this.baseApiUrl}/list`, {}); }
  getFieldVisitDetail(payload: any) { return this.http.post(`${this.baseApiUrl}/detail`, payload); }
  createFieldVisit(payload: any) { return this.http.post(`${this.baseApiUrl}/create`, payload); }
  updateFieldVisit(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/${id}/update`, payload); }

  // --- 18. OFFLINE DRAFTS & RECENT ACTIVITY ---
  
  // Check if internet is available
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  saveForestEventDraft(payload: any) {
    let drafts = this.getForestEventDrafts();
    
    // Check for duplicates to avoid bloating
    const isDuplicate = drafts.some(d => 
      d.category === payload.category && 
      d.report_type === payload.report_type && 
      d.latitude === payload.latitude
    );
    if (isDuplicate) return;

    drafts.push({
      ...payload,
      draftId: 'DRAFT-' + Date.now(),
      isDraft: true,
      createdAt: new Date().toISOString()
    });

    try {
      localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
      console.log(`✅ Success: Saved draft locally. Total drafts: ${drafts.length}`);
    } catch (err: any) {
      console.warn('⚠️ LocalStorage quota exceeded or error occurred. Running recovery cleanup...', err);
      
      // Dynamic Recovery Loop: Keep removing oldest drafts until it fits
      let saved = false;
      while (drafts.length > 1) {
        const removed = drafts.shift(); // Remove oldest draft
        console.warn(`🗑️ Discarding oldest draft [${removed?.draftId}] to reclaim space.`);
        try {
          localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
          console.log(`✅ Success: Reclaimed space by keeping only latest ${drafts.length} drafts.`);
          saved = true;
          break;
        } catch (retryErr) {
          // Keep looping to discard more
        }
      }

      // If even a single draft fails because it has extremely heavy photos
      if (!saved && drafts.length === 1) {
        console.warn("⚠️ Single draft with photo is too heavy! Saving draft but removing massive base64 photo to avoid crash.");
        try {
          const singleDraft = drafts[0];
          singleDraft.photo = null; // Clear heavy photo
          singleDraft.photos = [];
          localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
          console.log("✅ Success: Saved draft metadata successfully after discarding photos.");
        } catch (e3) {
          console.error("❌ Completely unable to save even minimal metadata to localStorage.", e3);
        }
      }
    }
  }

  getForestEventDrafts(): any[] {
    const drafts = localStorage.getItem('forest_event_drafts');
    return drafts ? JSON.parse(drafts) : [];
  }

  deleteForestEventDraft(draftId: string) {
    let drafts = this.getForestEventDrafts();
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem('forest_event_drafts', JSON.stringify(drafts));
  }

  saveRecentSubmission(payload: any) {
    const history = this.getRecentSubmissions();
    // Maintain only last 10 entries locally
    history.unshift({
      title: payload.report_type,
      date: payload.date_dateTime || new Date().toISOString(),
      category: payload.category,
      id: payload.report_id
    });
    if (history.length > 10) history.pop();
    localStorage.setItem('forest_recent_history', JSON.stringify(history));
  }

  getRecentSubmissions(): any[] {
    const history = localStorage.getItem('forest_recent_history');
    return history ? JSON.parse(history) : [];
  }

  // --- ATTENDANCE OFFLINE SUPPORT ---
  saveAttendanceDraft(payload: any, mode: 'beat' | 'onsite') {
    const drafts = this.getAttendanceDrafts(mode);
    drafts.push({
      ...payload,
      draftId: 'ATT-' + Date.now(),
      mode: mode,
      isOffline: true,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(`attendance_drafts_${mode}`, JSON.stringify(drafts));
  }

  getAttendanceDrafts(mode: 'beat' | 'onsite'): any[] {
    const drafts = localStorage.getItem(`attendance_drafts_${mode}`);
    return drafts ? JSON.parse(drafts) : [];
  }

  deleteAttendanceDraft(draftId: string, mode: 'beat' | 'onsite') {
    let drafts = this.getAttendanceDrafts(mode);
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem(`attendance_drafts_${mode}`, JSON.stringify(drafts));
  }

  // --- PATROL OFFLINE SUPPORT ---
  savePatrolDraft(payload: any, type: 'start' | 'end') {
    const drafts = this.getPatrolDrafts();
    drafts.push({
      ...payload,
      draftId: 'PAT-' + Date.now(),
      type: type,
      isOffline: true,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('patrol_drafts', JSON.stringify(drafts));
  }

  getPatrolDrafts(): any[] {
    const drafts = localStorage.getItem('patrol_drafts');
    return drafts ? JSON.parse(drafts) : [];
  }

  deletePatrolDraft(draftId: string) {
    let drafts = this.getPatrolDrafts();
    drafts = drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem('patrol_drafts', JSON.stringify(drafts));
  }

  deleteFieldVisit(id: string) { return this.http.post(`${this.baseApiUrl}/${id}/delete`, {}); }
  syncFieldVisits() { return this.http.post(`${this.baseApiUrl}/sync`, {}); }

  // --- 18. INCIDENCE REPORTING ---
  reportIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/reportIncidence`, payload); }
  incidenceAction(payload: any) { return this.http.post(`${this.baseApiUrl}/incidenceAction`, payload); }
  actionTakenOnIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/actionTakenOnIncidence`, payload); }
  getIncidence(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidence`, payload); }
  getIncidenceDetails(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceDetails`, payload); }
  getReportIncidenceCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getReportIncidenceCheckList`, payload); }
  getIncidenceActionCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceActionCheckList`, payload); }
  getIncidenceTypeCheckList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceTypeCheckList`, payload); }
  getIncidenceSiteList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceSiteList`, payload); }
  getIncidenceTypeList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceTypeList`, payload); }
  addIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/addIncidenceType`, payload); }
  updateIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/updateIncidenceType`, payload); }
  deleteIncidenceType(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteIncidenceType`, payload); }
  getIncidenceSubTypeList(payload: any) { return this.http.post(`${this.baseApiUrl}/getIncidenceSubTypeList`, payload); }
  addIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/addIncidenceSubType`, payload); }
  updateIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/updateIncidenceSubType`, payload); }
  deleteIncidenceSubType(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteIncidenceSubType`, payload); }

  // --- 19. TASK MANAGEMENT ---
  addTask(payload: any) { return this.http.post(`${this.baseApiUrl}/addTask`, payload); }
  getTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/getTasks`, payload); }
  updateTask(payload: any) { return this.http.post(`${this.baseApiUrl}/updateTask`, payload); }
  deleteTask(payload: any) { return this.http.post(`${this.baseApiUrl}/deleteTask`, payload); }
  getForestTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks`, payload); }
  storeForestTask(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/store`, payload); }
  deleteForestTask(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${id}/delete`, payload); }
  updateForestTaskStatus(id: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${id}/status`, payload); }
  updateTaskUserStatus(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/user-status`, payload); }
  delegateForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/delegate`, payload); }
  rejectForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/reject-status`, payload); }
  updateForestTask(taskId: string, payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/${taskId}/update`, payload); }
  getForestTaskReminders(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/reminders`, payload); }
  bulkDeleteForestTasks(payload: any) { return this.http.post(`${this.baseApiUrl}/forest-tasks/bulk-delete`, payload); }
  getAssignableUsers(payload: any) { 
    const token = localStorage.getItem('api_token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Bypass-Token': 'true'
    };
    const fullPayload = { ...payload, api_token: token };
    return this.http.post(`${this.baseApiUrl}/assignable-users`, fullPayload, { headers }); 
  }

  getForestKPIs(companyId: number, range: string, category: string): Observable<any> {
    const params = { companyId, range, category, timeframe: range };
    return this.http.get(`${this.baseApiUrl}/forest-events/analytics/kpi`, { params });
  }

  getForestMapData(companyId: number, range?: string): Observable<any[]> {
    const params = range ? `?range=${range}` : '';
    return this.http.get<any[]>(`${this.baseApiUrl}/forest-events/map-data/${companyId}${params}`);
  }

  downloadReport(endpoint: string, payload: any) {
    const token = localStorage.getItem('api_token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Bypass-Token': 'true'
    };
    return this.http.post(`${this.baseApiUrl}/${endpoint}`, payload, {
      headers: headers,
      responseType: 'blob',
      observe: 'response'
    });
  }

  getForestEventById(id: number): Observable<any> {
    return this.http.get(`${this.baseApiUrl}/forest-reports/${id}`);
  }

  saveFormConfig(config: any) {
    return this.http.post(`${this.baseApiUrl}/forest-reports/configs`, config);
  }

  getFormConfig(category: string, type: string) {
    const companyId = this.getUserCompanyId() || '1';
    const token = localStorage.getItem('api_token');
    
    // Sir's API (POST /getReportIncidenceCheckList)
    const payload = { 
      category: category, 
      report_type: type, 
      company_id: companyId.toString(),
      api_token: token 
    };
    
    const headers = { 'Bypass-Token': 'true' };
    return this.getReportIncidenceCheckList(payload);
  }

  getAllConfigs() {
    const companyId = this.getUserCompanyId() || 0;
    return this.http.get(`${this.baseApiUrl}/forest-reports/configs/all`, {
      params: { companyId: companyId.toString() }
    });
  }

  // --- 20. LAYER HIERARCHY (BASIC) ---
  getHierarchies() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/hierarchy`, { params: { api_token: token } });
  }
  createHierarchyNode(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/hierarchy`, { api_token: token, ...payload });
  }
  updateHierarchyNode(nodeId: any, payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/hierarchy/${nodeId}`, { api_token: token, ...payload });
  }
  deleteHierarchyNode(nodeId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.delete(`${this.baseApiUrl}/hierarchy/${nodeId}`, { params: { api_token: token } });
  }
  getHierarchyTree() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/hierarchy/tree`, { params: { api_token: token } });
  }

  // --- 21. DYNAMIC ORG STRUCTURE ---

  listOrgLayers(companyId?: any, authToken?: string) {
    const token = authToken || localStorage.getItem('api_token') || '';
    const storedCompanyId = localStorage.getItem('company_id') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = {};
    if (token) params.api_token = token;
    
    const finalCompanyId = companyId || storedCompanyId;
    if (finalCompanyId) params.company_id = String(finalCompanyId);

    return this.http.get(`${this.baseApiUrl}/org/layers`, { params, headers });
  }
  createOrgLayer(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/org/layers`, { api_token: token, ...payload });
  }
  listOrgEntities(layerId: any, companyId?: any, authToken?: string) {
    const token = authToken || localStorage.getItem('api_token') || '';
    const storedCompanyId = localStorage.getItem('company_id') || '';
    const headers = { 'Bypass-Token': 'true' };
    const params: any = {};
    if (token) params.api_token = token;
    
    const finalCompanyId = companyId || storedCompanyId;
    if (finalCompanyId) params.company_id = String(finalCompanyId);
    
    if (layerId && layerId !== 'all') {
      params.layer_id = String(layerId);
    }
    return this.http.get(`${this.baseApiUrl}/org/entities`, { params, headers });
  }
  createOrgEntity(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/org/entities`, { api_token: token, ...payload });
  }
  updateOrgEntity(entityId: any, payload: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('api_token', token);
    for (const key in payload) { formData.append(key, payload[key]); }
    return this.http.post(`${this.baseApiUrl}/org/entities/${entityId}`, formData);
   }

  deleteOrgEntity(entityId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.delete(`${this.baseApiUrl}/org/entities/${entityId}`, { params: { api_token: token } });
  }

  getOrgTree() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/org/tree`, { params: { api_token: token } });
  }

  getNodeCoverage(entityId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/org/coverage/${entityId}`, { params: { api_token: token } });
  }

  getRangersForEntity(entityId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/org/rangers/${entityId}`, { params: { api_token: token } });
  }

  // --- 22. CUSTOM ROLES & PERMS ---
  listCustomRoles() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/roles`, { params: { api_token: token } });
  }

  getRoleIdList() {
    return this.http.get(`${this.baseApiUrl}/getRoleIdList`);
  }

  createCustomRole(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/roles`, { api_token: token, ...payload });
  }

  updateCustomRole(roleId: any, payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/roles/${roleId}`, { api_token: token, _method: 'PUT', ...payload });
  }

  deleteCustomRole(roleId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.delete(`${this.baseApiUrl}/roles/${roleId}`, { params: { api_token: token } });
  }

  listV2Users(companyId?: any) {
    const token = localStorage.getItem('api_token') || '';
    const payload: any = { api_token: token };
    if (companyId) payload.company_id = String(companyId);
    return this.http.post(`${this.baseApiUrl}/v2/user/list`, payload);
  }

  getLegacyUsers(companyId: any) {
    const token = localStorage.getItem('api_token') || '';
    const formData = new FormData();
    formData.append('api_token', token);
    formData.append('company_id', String(companyId));
    return this.http.post(`${this.baseApiUrl}/getUsers`, formData);
  }

  // --- 23. USER ASSIGNMENTS ---
  assignUserToNode(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/assignments/assign`, { api_token: token, ...payload });
  }

  unassignUser(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/assignments/unassign`, { api_token: token, ...payload });
  }

  // --- SECTION 24: FSM V2 DYNAMIC HIERARCHY APIs (COMPLETE SUITE) ---

  // 24.1 Hierarchy & Roles (V2)
  listV2Roles(companyId?: any) {
    const token = localStorage.getItem('api_token') || '';
    const payload: any = { api_token: token };
    if (companyId) payload.company_id = String(companyId);
    return this.http.post(`${this.baseApiUrl}/v2/dynamic-roles`, payload);
  }

  storeV2Role(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/role/store`, { api_token: token, ...payload });
  }

  updateV2Role(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/role/update`, { api_token: token, ...payload });
  }

  deleteV2Role(roleId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/role/delete`, { api_token: token, id: roleId });
  }

  listV2Layers() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/hierarchy-layers`, { api_token: token });
  }

  storeV2Layer(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/layer/store`, { api_token: token, ...payload });
  }

  updateV2Layer(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/layer/update`, { api_token: token, ...payload });
  }

  deleteV2Layer(layerId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/layer/delete`, { api_token: token, id: layerId });
  }

  listV2Entities(layerId: any, parentId: any = null, bypassToken: boolean = false, companyId?: any) {
    const token = localStorage.getItem('api_token') || '';
    const headers: any = {};
    if (bypassToken) headers['Bypass-Token'] = 'true';
    
    const payload: any = { 
      api_token: token, 
      layer_id: layerId, 
      parent_id: parentId 
    };
    if (companyId) payload.company_id = String(companyId);

    return this.http.post(`${this.baseApiUrl}/v2/hierarchy-entities`, payload, { headers });
  }

  storeV2Entity(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/entity/store`, { api_token: token, ...payload });
  }

  updateV2Entity(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/entity/update`, { api_token: token, ...payload });
  }

  deleteV2Entity(entityId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/entity/delete`, { api_token: token, id: entityId });
  }

  getV2Tree() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/hierarchy-tree`, { api_token: token });
  }

  saveV2Assignment(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/save-assignment`, { api_token: token, ...payload });
  }

  // 24.2 User Management (V2)
  registerV2UserRequest(payload: any) {
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/v2/user/register`, payload, { headers });
  }

  storeV2User(payload: any) {
    const token = payload.api_token || localStorage.getItem('api_token') || '';
    const headers = { 'Bypass-Token': 'true' };
    return this.http.post(`${this.baseApiUrl}/v2/user/store`, { ...payload, api_token: token }, { headers });
  }

  addV2UserHybrid(payload: any) {
    // Priority: 1. Token from payload (for signup), 2. Token from localStorage (for admin add user)
    const token = payload.api_token || localStorage.getItem('api_token') || '';
    const formData = new FormData();
    
    // Set api_token first
    formData.append('api_token', token);
    
    for (const key in payload) {
      if (key === 'api_token') continue; // Already added
      const val = payload[key];
      if (Array.isArray(val)) {
        formData.append(key, JSON.stringify(val));
      } else if (val !== null && val !== undefined) {
        formData.append(key, val);
      }
    }
    return this.http.post(`${this.baseApiUrl}/v2/user/addUser`, formData);
  }

  getV2UserDetails(userId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/user/getUserDetails`, { api_token: token, user_id: userId });
  }

  getV2Profile() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/user/profile`, { api_token: token });
  }

  listV2Subordinates() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/user/subordinates`, { api_token: token });
  }

  deleteV2User(userId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/user/delete`, { api_token: token, user_id: userId });
  }

  // 24.3 Attendance (V2)
  markV2Attendance(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/attendance/mark`, { api_token: token, ...payload });
  }

  exitV2Attendance() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/attendance/exit`, { api_token: token });
  }

  listV2AttendanceRecords(date: string) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/attendance/list`, { api_token: token, date });
  }

  // 24.4 Patrol (V2)
  startV2Patrol(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/patrol/start`, { api_token: token, ...payload });
  }

  endV2Patrol(sessionId: string, payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/patrol/end/${sessionId}`, { api_token: token, ...payload });
  }

  listV2PatrolSessions(dateFrom: string, dateTo: string) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/patrol/list`, { api_token: token, date_from: dateFrom, date_to: dateTo });
  }

  // 24.5 Modules (V2)
  storeV2ForestReport(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/forest-reports/store`, { api_token: token, ...payload });
  }

  listV2ForestReports() {
    const token = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id');
    const userId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id');
    const payload: any = { api_token: token };
    if (companyId) payload.company_id = companyId;
    if (userId) payload.user_id = userId;

    return this.http.post(`${this.baseApiUrl}/v2/forest-reports/list`, payload);
  }

  storeV2Plantation(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/plantations/store`, { api_token: token, ...payload });
  }

  listV2Plantations() {
    const token = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id');
    const userId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id');
    const payload: any = { api_token: token };
    if (companyId) payload.company_id = companyId;
    if (userId) payload.user_id = userId;

    return this.http.post(`${this.baseApiUrl}/v2/plantations/list`, payload);
  }

  storeV2Asset(payload: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.post(`${this.baseApiUrl}/v2/assets/store`, { api_token: token, ...payload });
  }

  listV2Assets() {
    const token = localStorage.getItem('api_token') || '';
    const companyId = localStorage.getItem('company_id');
    const userId = localStorage.getItem('user_id') || localStorage.getItem('ranger_id');
    
    const payload: any = { 
      api_token: token,
      company_id: companyId,
      cid: companyId, // Alias
      user_id: userId,
      guard_id: userId, // Alias
      ranger_id: userId // Alias
    };

    console.log("📤 [DEBUG] Asset List Request Payload:", payload);
    return this.http.post(`${this.baseApiUrl}/v2/assets/list`, payload);
  }

  // Compatibility Helper (for older components)
  listV2Attendance(date: string) { return this.listV2AttendanceRecords(date); }

  getNodeAssignments(entityId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/assignments/node/${entityId}`, { params: { api_token: token } });
  }

  getUserAssignments(userId: any) {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/assignments/user/${userId}`, { params: { api_token: token } });
  }

  getMySubordinates() {
    const token = localStorage.getItem('api_token') || '';
    return this.http.get(`${this.baseApiUrl}/assignments/subordinates`, { params: { api_token: token } });
  }

  private isSyncing = false;

  // --- GLOBAL SYNC ENGINE ---
  // --- GLOBAL SYNC ENGINE ---
  async syncAllDrafts(): Promise<{ success: boolean; count: number; message?: string }> {
    if (!this.isOnline()) return { success: false, count: 0, message: 'Still Offline' };
    if (this.isSyncing) {
      console.log("🔄 Sync already in progress, skipping duplicate call...");
      return { success: false, count: 0, message: 'Sync in progress' };
    }

    this.isSyncing = true;
    console.log("🚀 STARTING GLOBAL SYNC...");
    let syncCount = 0;
    
    try {
      // 1. Sync Patrols FIRST (to resolve any local session IDs to server database numeric IDs)
      const patrolDrafts = this.getPatrolDrafts();
      const syncedPatrolIdsMap: {[key: string]: string} = {};

      // Load existing mappings from localStorage
      const existingMapStr = localStorage.getItem('synced_patrol_ids') || '{}';
      let persistedMap: any = {};
      try { persistedMap = JSON.parse(existingMapStr); } catch (e) {}

      for (const draft of patrolDrafts) {
        try {
          if (draft.type === 'start') {
            const res: any = await this.startActivePatrol(draft).toPromise();
            const newId = res?.data?.id || res?.id;
            if (newId && draft.sessionId) {
              syncedPatrolIdsMap[draft.sessionId] = newId.toString();
              persistedMap[draft.sessionId] = newId.toString();
            }
          } else {
            const pId = draft.patrol_id || (draft.sessionId ? (syncedPatrolIdsMap[draft.sessionId] || persistedMap[draft.sessionId]) : null);
            if (pId && pId !== 'undefined') {
              await this.updatePatrolStats(pId, draft).toPromise();
            } else {
              console.warn("Skipping end draft: No active Patrol ID found on server or locally.");
              continue;
            }
          }
          this.deletePatrolDraft(draft.draftId);
          syncCount++;
        } catch (e: any) { 
          if (e.status === 401 && e.error?.message?.includes('Another patrol is in progress')) {
            try {
              const ongoing: any = await this.getOngoingPatrols().toPromise();
              const list = ongoing?.data || ongoing || [];
              if (list.length > 0) {
                const pId = list[0].id || list[0].sessionId;
                if (pId && draft.sessionId) {
                  syncedPatrolIdsMap[draft.sessionId] = pId.toString();
                  persistedMap[draft.sessionId] = pId.toString();
                  this.deletePatrolDraft(draft.draftId);
                  syncCount++;
                  continue;
                }
              }
            } catch(recoveryErr) {}
          }
          console.error("Sync Patrol Error", e); 
        }
      }

      // Persist the updated map to localStorage for future lookups
      localStorage.setItem('synced_patrol_ids', JSON.stringify(persistedMap));

      // 2. Sync Forest Events SECOND (so they can reference the correct, freshly-synced numeric patrol IDs)
      const eventDrafts = this.getForestEventDrafts();
      for (const draft of eventDrafts) {
        try {
          let resolvedPatrolId: any = draft.patrol_id;
          
          // Resolve string UID to numeric DB ID if needed
          if (draft.patrol_id && String(draft.patrol_id).startsWith('PATROL_')) {
            const mappedId = persistedMap[draft.patrol_id] || syncedPatrolIdsMap[draft.patrol_id];
            if (mappedId) {
              resolvedPatrolId = Number(mappedId);
            } else {
              // Fallback to 0 if not mapped yet to avoid 422 validation failure
              resolvedPatrolId = 0;
            }
          }

          const cleanDraft = {
            ...draft,
            patrol_id: resolvedPatrolId,
            beat_id: draft.site_id || 0
          };

          const finalPayload = {
            ...cleanDraft,
            beat_id: cleanDraft.site_id,
            data: cleanDraft.report_data,
            photo: cleanDraft.photo
          };

          await this.submitForestEvent(finalPayload).toPromise();
          this.deleteForestEventDraft(draft.draftId);
          syncCount++;
        } catch (e) { console.error("Sync Event Error", e); }
      }

      // 3. Sync Attendance (Beat) THIRD
      const beatDrafts = this.getAttendanceDrafts('beat');
      for (const draft of beatDrafts) {
        try {
          const isExit = draft.mode_type === 'exit' || draft.isEntry === false;
          
          // Preserve old beat attendance drafts but do not send geo_id when entity_id is null.
          if (draft.entity_id === null || draft.entity_id === undefined || draft.entity_id === 'null') {
            delete draft.geo_id;
          }

          if (!draft.latitude && draft.location) {
            const parts = String(draft.location).split(',');
            draft.latitude = parts[0];
            draft.longitude = parts[1];
          }

          if (isExit) {
            await this.markAttendanceExit(draft).toPromise();
          } else {
            await this.markAttendance(draft).toPromise();
          }
          this.deleteAttendanceDraft(draft.draftId, 'beat');
          syncCount++;
        } catch (e) { console.error("Sync Beat Error", e); }
      }

      // 4. Sync Attendance (Onsite) FOURTH
      const onsiteDrafts = this.getAttendanceDrafts('onsite');
      for (const draft of onsiteDrafts) {
        try {
          const formData = new FormData();
          const token = localStorage.getItem('api_token') || draft.api_token || '';
          
          formData.append('api_token', token);
          formData.append('attendance_type', draft.attendance_type || 'ONSITE');
          formData.append('applicant_id', draft.applicant_id || localStorage.getItem('ranger_id') || '');
          formData.append('company_id', draft.company_id || localStorage.getItem('company_id') || '');
          formData.append('geo_id', draft.geo_id || '99999');
          formData.append('type', draft.type || 'location');
          formData.append('remark', draft.remark || 'Synced Offline Onsite Attendance');
          formData.append('status', 'Pending');
          formData.append('photo', draft.photo || '');
          formData.append('date', draft.date || draft.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
          
          if (typeof draft.location === 'object') {
            formData.append('location', JSON.stringify(draft.location));
          } else {
            formData.append('location', JSON.stringify({ 
              lat: draft.lat || 0, 
              lng: draft.lng || 0, 
              name: draft.location || 'On Location' 
            }));
          }

          await this.requestEntryAttendance(formData, { 'Bypass-Token': 'true' }).toPromise();
          
          this.deleteAttendanceDraft(draft.draftId, 'onsite');
          syncCount++;
        } catch (e) { console.error("Sync Onsite Error", e); }
      }

      if (syncCount > 0) {
        this.syncCompleted$.next();
      }

      return { success: true, count: syncCount };
    } finally {
      this.isSyncing = false;
      console.log("🏁 GLOBAL SYNC FINISHED.");
    }
  }
  getNotifications() {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    return this.http.post(`${this.baseApiUrl}/getNotifications`, formData);
  }

  markNotificationRead(notificationId: any) {
    const formData = new FormData();
    const token = localStorage.getItem('api_token') || '';
    formData.append('api_token', token);
    formData.append('notification_id', String(notificationId));
    return this.http.post(`${this.baseApiUrl}/markNotificationRead`, formData);
  }

  // --- PERMISSION MANAGEMENT (V2) ---
  listMasterPermissions() {
    const token = localStorage.getItem('api_token') || '';
    const url = 'https://fms.pugarch.in/public/api/v2/permissions';
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post(url, { api_token: token }, { headers, params: { skip_url_token: 'true' } });
  }

  getRolePermissions(roleId: any) {
    const token = localStorage.getItem('api_token') || '';
    const url = 'https://fms.pugarch.in/public/api/v2/role-permissions';
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post(url, { 
      api_token: token, 
      role_id: Number(roleId) 
    }, { headers, params: { skip_url_token: 'true' } });
  }

  // ---------------- Offline Draft Helpers ----------------
  /** Save a patrol draft (including photos, observations) locally */
  saveOfflinePatrolDraft(draft: any): void {
    const drafts = this.getAllOfflinePatrolDrafts();
    drafts.push(draft);
    localStorage.setItem('patrol_drafts_v2', JSON.stringify(drafts));
  }

  /** Retrieve all stored patrol drafts */
  getAllOfflinePatrolDrafts(): any[] {
    const raw = localStorage.getItem('patrol_drafts_v2');
    try { return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }

  /** Get drafts that belong to a particular patrol/session id */
  getOfflinePatrolDraftsByPatrolId(patrolId: string): any[] {
    return this.getAllOfflinePatrolDrafts().filter(d => d.patrolId === patrolId || d.sessionId === patrolId);
  }

  /** Delete a specific draft by its internal id */
  deleteOfflinePatrolDraft(draftId: string): void {
    const remaining = this.getAllOfflinePatrolDrafts().filter(d => d.draftId !== draftId);
    localStorage.setItem('patrol_drafts_v2', JSON.stringify(remaining));
  }

  /** Return offline observations (photos etc.) for a given patrol id */
  fetchOfflineObservations(patrolId: string): any[] {
    const obsList: any[] = [];
    this.getOfflinePatrolDraftsByPatrolId(patrolId).forEach(d => {
      if (Array.isArray(d.observationData)) {
        obsList.push(...d.observationData);
      }
    });
    return obsList;
  }
}
