import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environments';
import { AuthStatus, CheckTokenResponse, LoginResponse, User } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl;
  private http = inject( HttpClient );

  private _currentUser = signal<User|null>(null);
  private _authStatus = signal<AuthStatus>( AuthStatus.checking );

  // show to our frontend on secure way
  public currentUser = computed( () => this._currentUser() );
  public authStatus = computed( () => this._authStatus() );

  constructor() {
    // effect to verify status
    this.checkAuthStatus().subscribe()
   }

  private setAuthentication( user: User, token: string ): boolean{
    // set user
    this._currentUser.set( user );
    // set authentication
    this._authStatus.set( AuthStatus.authenticated );
    // read local storage
    localStorage.setItem('token', token);

    return true;
  }

  login( email: string, password: string ): Observable<boolean> {

    const url = `${ this.baseUrl }/auth/login`;
    const body = { email, password };

    return this.http.post<LoginResponse>( url, body)
      .pipe(
        map( ({ user, token }) => this.setAuthentication( user, token ) ),

        catchError( err => throwError( () => err.error.message ) )
      );

  }

  checkAuthStatus(): Observable<boolean>{

    // verify token
    const url = `${ this.baseUrl }/auth/check-token`;
    const token = localStorage.getItem('token');

    if ( !token ) {
      this.logout();
      return of( false );
    };

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    return this.http.get<CheckTokenResponse>( url, { headers} )
      .pipe(
        map( ({ user, token }) => this.setAuthentication( user, token ) ),

        catchError( () => {
          this._authStatus.set( AuthStatus.notAuthenticated );
          return of( false );
        } )
      )
  }

  logout() {
    localStorage.removeItem('token');
    this._currentUser.set(null)
    this._authStatus.set( AuthStatus.notAuthenticated );
  }
}
