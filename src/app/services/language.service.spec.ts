import { TestBed } from '@angular/core/testing';

// import { Language } from './language.service';
import { LanguageService } from './language.service';

describe('Language', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
