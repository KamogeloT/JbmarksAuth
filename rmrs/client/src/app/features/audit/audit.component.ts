import { Component } from '@angular/core';

@Component({
  selector: 'app-audit',
  standalone: true,
  template: `
    <section aria-label="Audit and Compliance">
      <h1>Audit Log</h1>
      <p>Immutable audit log viewer and compliance dashboard.</p>
    </section>
  `
})
export class AuditComponent {}
