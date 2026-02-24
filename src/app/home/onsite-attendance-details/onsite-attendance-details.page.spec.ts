import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnsiteAttendanceDetailsPage } from './onsite-attendance-details.page';

describe('OnsiteAttendanceDetailsPage', () => {
  let component: OnsiteAttendanceDetailsPage;
  let fixture: ComponentFixture<OnsiteAttendanceDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OnsiteAttendanceDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
