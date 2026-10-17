import { api } from '@/lib/api';
import type { Organismo } from '../types';

export async function listarOrganismos(): Promise<Organismo[]> {
  const { data } = await api.get<Organismo[]>('/organismos');
  return data;
}
