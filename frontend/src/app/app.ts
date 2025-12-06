import { Component, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  dzien: string = '1';
  lekcja: string = '1';
  wolneSale: string[] = [];
  ladowanie: boolean = false;

  dni = [
    { value: '1', label: 'Poniedziałek' },
    { value: '2', label: 'Wtorek' },
    { value: '3', label: 'Środa' },
    { value: '4', label: 'Czwartek' },
    { value: '5', label: 'Piątek' }
  ];

  lekcje = [
    { value: '1', label: '1. lekcja (7:10-7:55)' },
    { value: '2', label: '2. lekcja (8:00-8:45)' },
    { value: '3', label: '3. lekcja (8:50-9:35)' },
    { value: '4', label: '4. lekcja (9:40-10:25)' },
    { value: '5', label: '5. lekcja (10:40-11:25)' },
    { value: '6', label: '6. lekcja (11:30-12:15)' },
    { value: '7', label: '7. lekcja (12:20-13:05)' },
    { value: '8', label: '8. lekcja (13:10-13:55)' },
    { value: '9', label: '9. lekcja (14:00-14:45)' },
    { value: '10', label: '10. lekcja (14:50-15:35)' },
    { value: '11', label: '11. lekcja (15:40-16:25)' },
    { value: '12', label: '12. lekcja (16:30-17:15)' },
    { value: '13', label: '13. lekcja (17:20-18:05)' }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  sprawdzWolneSale() {
    this.ladowanie = true;
    this.wolneSale = [];
    this.cdr.detectChanges();

    this.http.get<any>(`http://localhost:3000/wolne-sale?dzien=${this.dzien}&lekcja=${this.lekcja}`)
      .subscribe({
        next: (response) => {
          this.wolneSale = response.wolneSale || [];
          this.ladowanie = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Błąd:', error);
          alert('Błąd pobierania danych');
          this.ladowanie = false;
          this.cdr.detectChanges();
        }
      });
  }
}