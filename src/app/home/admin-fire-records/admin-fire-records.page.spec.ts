import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminFireRecordsPage } from './admin-fire-records.page';

describe('AdminFireRecordsPage', () => {
  let component: AdminFireRecordsPage;
  let fixture: ComponentFixture<AdminFireRecordsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFireRecordsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
