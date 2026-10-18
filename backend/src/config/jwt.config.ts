import { registerAs } from '@nestjs/config';

const LARGO_MINIMO_SECRETO = 32;

//el secreto no tiene valor por defecto: si falta o es corto, la app no arranca (ver .env.example)
export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < LARGO_MINIMO_SECRETO) {
    throw new Error(
      `JWT_SECRET es obligatoria y debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres (ver .env.example).`,
    );
  }
  return { secret, expiresIn: '12h' };
});
