import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrgManagementPage } from './org-management.page';

describe('OrgManagementPage', () => {
  let component: OrgManagementPage;
  let fixture: ComponentFixture<OrgManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OrgManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
