import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnsiteAttendanceLogsPage } from './onsite-attendance-logs.page';

describe('OnsiteAttendanceLogsPage', () => {
  let component: OnsiteAttendanceLogsPage;
  let fixture: ComponentFixture<OnsiteAttendanceLogsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OnsiteAttendanceLogsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
