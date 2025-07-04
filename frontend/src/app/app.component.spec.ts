import { TestBed } from '@angular/core/testing';
import { CustomerService } from './customer.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], 
      providers: [CustomerService]
    });

    service = TestBed.inject(CustomerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

  it(`should have as title 'frontend'`, () => {
    const fixture = TestBed.createComponent(CustomerService);
    const app = fixture.componentInstance;
    expect(CustomerService.title).toEqual('frontend');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(CustomerService);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('frontend app is running!');
  });

