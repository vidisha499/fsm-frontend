import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IncidentDetailAdminPage } from './incident-detail-admin.page';

describe('IncidentDetailAdminPage', () => {
  let component: IncidentDetailAdminPage;
  let fixture: ComponentFixture<IncidentDetailAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IncidentDetailAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
