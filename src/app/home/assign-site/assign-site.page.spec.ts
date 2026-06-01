import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignSitePage } from './assign-site.page';

describe('AssignSitePage', () => {
  let component: AssignSitePage;
  let fixture: ComponentFixture<AssignSitePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignSitePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
