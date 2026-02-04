import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewIncidentPage } from './new-incident.page';

describe('NewIncidentPage', () => {
  let component: NewIncidentPage;
  let fixture: ComponentFixture<NewIncidentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NewIncidentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
