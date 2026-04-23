import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAssetsRecordsPage } from './admin-assets-records.page';

describe('AdminAssetsRecordsPage', () => {
  let component: AdminAssetsRecordsPage;
  let fixture: ComponentFixture<AdminAssetsRecordsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAssetsRecordsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
