import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../../../usuarios/domain/enums/rol.enum.js';

export const ROLES_KEY = 'roles';

//basta con tener uno de los roles indicados
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
