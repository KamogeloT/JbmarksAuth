import { Component, input, output, signal, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

/**
 * Reusable search bar component with debounced input.
 * Emits a search event after the user stops typing for the configured debounce time.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-bar" role="search">
      <label [for]="inputId" class="sr-only">{{ ariaLabel() }}</label>
      <input
        [id]="inputId"
        type="search"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel()"
        [ngModel]="searchTerm()"
        (ngModelChange)="onInput($event)"
        (keydown.enter)="onSubmit()"
        class="search-input" />
      @if (searchTerm()) {
        <button
          class="clear-btn"
          (click)="clear()"
          aria-label="Clear search">
          &times;
        </button>
      }
    </div>
  `,
  styles: [`
    .search-bar { position: relative; display: flex; align-items: center; }
    .search-input {
      width: 100%; padding: 0.625rem 2.5rem 0.625rem 1rem;
      border: 1px solid #ccc; border-radius: 4px; font-size: 0.9375rem;
      transition: border-color 0.2s;
    }
    .search-input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.2); }
    .clear-btn {
      position: absolute; right: 0.5rem; background: none; border: none;
      font-size: 1.25rem; cursor: pointer; color: #666; padding: 0.25rem 0.5rem;
    }
    .clear-btn:hover { color: #333; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  `]
})
export class SearchBarComponent implements OnInit, OnDestroy {
  /** Placeholder text for the input */
  placeholder = input<string>('Search...');

  /** ARIA label for the input */
  ariaLabel = input<string>('Search');

  /** Debounce time in milliseconds */
  debounceMs = input<number>(300);

  /** Emitted when debounced search term changes */
  search = output<string>();

  /** Internal search term signal */
  searchTerm = signal<string>('');

  /** Unique ID for input-label association */
  readonly inputId = `search-input-${Math.random().toString(36).slice(2, 9)}`;

  private inputSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.inputSubject.pipe(
      debounceTime(this.debounceMs()),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.search.emit(term);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(value: string): void {
    this.searchTerm.set(value);
    this.inputSubject.next(value);
  }

  onSubmit(): void {
    this.search.emit(this.searchTerm());
  }

  clear(): void {
    this.searchTerm.set('');
    this.search.emit('');
  }
}
