import { Component, NgModule, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./core/header/header";
import { Hero } from './sections/hero/hero';
import { Marquee } from "./sections/marquee/marquee";
import { Service } from "./sections/service/service";
import { ImageWidget } from "./sections/image-widget/image-widget";
import { ServiceWidget } from "./sections/service-widget/service-widget";
import { TestimonialSection } from "./sections/testimonial-section/testimonial-section";
import { Partners } from "./sections/partners/partners";
import { ServiceArea } from "./sections/service-area/service-area";
import { Footer } from "./core/footer/footer";
import { FormComponent } from "./sections/form/form";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Hero, Marquee, Service, ImageWidget, ServiceWidget, TestimonialSection, Partners, ServiceArea, Footer, FormComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
  
export class App {
  protected readonly title = signal('mogo-express');
}
