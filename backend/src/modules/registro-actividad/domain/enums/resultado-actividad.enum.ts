export enum ResultadoActividad {
  EXITO = 'EXITO',
  //la acción falló (validación, conflicto, error)
  FALLO = 'FALLO',
  //se rechazó por falta de sesión o de permisos (401/403)
  DENEGADO = 'DENEGADO',
}
