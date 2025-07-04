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
