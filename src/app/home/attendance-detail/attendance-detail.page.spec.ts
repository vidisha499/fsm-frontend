import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceDetailPage } from './attendance-detail.page';

describe('AttendanceDetailPage', () => {
  let component: AttendanceDetailPage;
  let fixture: ComponentFixture<AttendanceDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendanceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
