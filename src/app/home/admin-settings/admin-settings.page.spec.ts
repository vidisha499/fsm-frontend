import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSettingsPage } from './admin-settings.page';

describe('AdminSettingsPage', () => {
  let component: AdminSettingsPage;
  let fixture: ComponentFixture<AdminSettingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
