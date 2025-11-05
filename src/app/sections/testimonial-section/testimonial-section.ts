import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-testimonial-section',
  imports: [],
  templateUrl: './testimonial-section.html',
  styleUrl: './testimonial-section.scss',
})
export class TestimonialSection {
  yelpReview: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {
    const reviewHTML = `
      <span class="yelp-review" data-review-id="iWy3J_jP9vLtN1LUnD13Mw" data-hostname="www.yelp.com">Read <a href="https://www.yelp.com/user_details?userid=EM-QrUy38Tq_9JLgL2wNTA" rel="nofollow noopener">Ed R.</a>'s <a href="https://www.yelp.com/biz/mogo-express-monterey-2?hrid=iWy3J_jP9vLtN1LUnD13Mw" rel="nofollow noopener">review</a> of <a href="https://www.yelp.com/biz/zJqpJ25uwr684wet3LHxng" rel="nofollow noopener">Mogo Express</a> on <a href="https://www.yelp.com" rel="nofollow noopener">Yelp</a><script src="https://www.yelp.com/embed/widgets.js" type="text/javascript" async></script></span>
    `;
    this.yelpReview = this.sanitizer.bypassSecurityTrustHtml(reviewHTML);
  }
}
