export interface Paciente {
  id: string;
  nombre: string;
  tipoDocumento: 'CC' | 'CE' | 'TI' | 'PA' | 'PPT';
  numeroDocumento: string; // único junto con tipoDocumento
  eps: string;
  telefono: string;
  correo?: string;
  direccion: string; // se precarga como direccionEntrega
}
