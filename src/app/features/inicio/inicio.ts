import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-inicio',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {}
