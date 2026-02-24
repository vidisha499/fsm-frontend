import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceListPage } from './attendance-list.page';

describe('AttendanceListPage', () => {
  let component: AttendanceListPage;
  let fixture: ComponentFixture<AttendanceListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendanceListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
