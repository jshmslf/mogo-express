import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageWidget } from './image-widget';

describe('ImageWidget', () => {
  let component: ImageWidget;
  let fixture: ComponentFixture<ImageWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageWidget]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageWidget);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
