import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewAttendanceAdminPage } from './view-attendance-admin.page';

describe('ViewAttendanceAdminPage', () => {
  let component: ViewAttendanceAdminPage;
  let fixture: ComponentFixture<ViewAttendanceAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewAttendanceAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
