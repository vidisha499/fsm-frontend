import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnsiteAttendancePage } from './onsite-attendance.page';

describe('OnsiteAttendancePage', () => {
  let component: OnsiteAttendancePage;
  let fixture: ComponentFixture<OnsiteAttendancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OnsiteAttendancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
