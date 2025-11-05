import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceWidget } from './service-widget';

describe('ServiceWidget', () => {
  let component: ServiceWidget;
  let fixture: ComponentFixture<ServiceWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceWidget]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceWidget);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
