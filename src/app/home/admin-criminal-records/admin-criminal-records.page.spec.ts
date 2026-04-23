import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCriminalRecordsPage } from './admin-criminal-records.page';

describe('AdminCriminalRecordsPage', () => {
  let component: AdminCriminalRecordsPage;
  let fixture: ComponentFixture<AdminCriminalRecordsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminCriminalRecordsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
