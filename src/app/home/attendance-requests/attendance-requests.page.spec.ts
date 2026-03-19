import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceRequestsPage } from './attendance-requests.page';

describe('AttendanceRequestsPage', () => {
  let component: AttendanceRequestsPage;
  let fixture: ComponentFixture<AttendanceRequestsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendanceRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
