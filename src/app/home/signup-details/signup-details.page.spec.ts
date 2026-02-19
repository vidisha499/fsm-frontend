import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupDetailsPage } from './signup-details.page';

describe('SignupDetailsPage', () => {
  let component: SignupDetailsPage;
  let fixture: ComponentFixture<SignupDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SignupDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
