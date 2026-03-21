import { TestBed } from '@angular/core/testing';

import { Hierarchy } from './hierarchy';

describe('Hierarchy', () => {
  let service: Hierarchy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Hierarchy);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
