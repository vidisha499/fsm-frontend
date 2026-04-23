import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEventsRecordsPage } from './admin-events-records.page';

describe('AdminEventsRecordsPage', () => {
  let component: AdminEventsRecordsPage;
  let fixture: ComponentFixture<AdminEventsRecordsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEventsRecordsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
