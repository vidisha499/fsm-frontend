import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientVisitsPage } from './client-visits.page';

describe('ClientVisitsPage', () => {
  let component: ClientVisitsPage;
  let fixture: ComponentFixture<ClientVisitsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientVisitsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
