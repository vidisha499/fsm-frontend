import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  // This combines your Vercel URL with the /hierarchy endpoint
  private apiUrl = 'https://forest-backend-pi.vercel.app/api/hierarchy';

  constructor(private http: HttpClient) {}

  // Fetch the full tree (Circles > Divisions > Ranges > Beats)
  // src/app/services/hierarchy.service.ts
getHierarchy() { // Make sure this name matches exactly
  return this.http.get<any[]>(this.apiUrl);
}

  // Save a new category (This ensures persistence in NeonDB)
  saveCategory(name: string, layerId: number, parentId: number | null): Observable<any> {
    const payload = { name, layerId, parentId };
    return this.http.post(this.apiUrl, payload);
  }

  deleteCategory(id: number) {
  return this.http.delete(`${this.apiUrl}/hierarchy/${id}`);
}
}