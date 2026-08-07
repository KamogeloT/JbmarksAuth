import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/**
 * DEV BYPASS - auto-redirects to dashboard.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  template: `<p>Redirecting...</p>`
})
export class LoginComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    this.router.navigate(['/dashboard']);
  }
}
