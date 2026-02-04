import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isRegisterMode = signal(false);
  username = signal('')
  password = signal('');
  errorMessage = signal('');
  isSuccessful = signal(false);

  toggleMode() {
    this.isRegisterMode.update(v => !v);
    this.errorMessage.set('');
  }

  onSubmit() {
    const credentials = { username: this.username(), password: this.password() };

    console.log("Current mode: ", this.isRegisterMode() ? "Register" : "Login");

    if (this.isRegisterMode()) {
      console.log("Sending request to /register...");
      this.auth.register(credentials.username, credentials.password).subscribe({
        next: () => {
          this.isRegisterMode.set(false);
          this.isSuccessful.set(true);
          this.errorMessage.set('Registration successful. Please log in.');
        },
        error: (error) => {
          this.isSuccessful.set(false);
          this.errorMessage.set('Registration failed. Username might be taken.');
        }
      });
    } else {
      console.log("Sending request to /login...");
      this.auth.login(credentials.username, credentials.password).subscribe({
        next: () => {
          this.isSuccessful.set(true);
          this.router.navigate(['/upload']);
        },
        error: (error) => {
          this.isSuccessful.set(false);
          this.errorMessage.set('Invalid username or password.');
        }
      });
    }
  }
}
