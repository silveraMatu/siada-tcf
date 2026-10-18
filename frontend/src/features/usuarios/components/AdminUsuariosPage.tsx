import { Inbox, Users } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsuariosActivos } from '../hooks/useUsuariosActivos';
import { useUsuariosPendientes } from '../hooks/useUsuariosPendientes';
import { ListaUsuarios } from './ListaUsuarios';
import { UsuarioActivoItem } from './UsuarioActivoItem';
import { UsuarioPendienteItem } from './UsuarioPendienteItem';

function Contador({ cantidad }: { cantidad: number | undefined }) {
  if (cantidad === undefined) return null;
  return (
    <span className="ml-2 min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">
      {cantidad}
    </span>
  );
}

export function AdminUsuariosPage() {
  // Las mismas queries que usa cada pestaña: React Query las comparte y los contadores
  // se mantienen al día cuando un usuario pasa de una lista a la otra.
  const pendientes = useUsuariosPendientes();
  const activos = useUsuariosActivos();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestión de Usuarios"
        description="Apruebe solicitudes de acceso y administre los roles de las cuentas activas."
      />

      <Tabs defaultValue="pendientes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pendientes">
            Solicitudes Pendientes
            <Contador cantidad={pendientes.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="activos">
            Usuarios Activos
            <Contador cantidad={activos.data?.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          <ListaUsuarios
            query={pendientes}
            vacioIcono={Inbox}
            vacioTitulo="No hay solicitudes pendientes"
            vacioTexto="Las nuevas solicitudes de acceso aparecerán aquí."
            contador={(n) =>
              n === 1 ? '1 solicitud pendiente' : `${n} solicitudes pendientes`
            }
            renderItem={(usuario) => (
              <UsuarioPendienteItem key={usuario.id} usuario={usuario} />
            )}
          />
        </TabsContent>

        <TabsContent value="activos">
          <ListaUsuarios
            query={activos}
            vacioIcono={Users}
            vacioTitulo="No hay usuarios activos"
            vacioTexto="Los usuarios aparecerán aquí una vez que active sus solicitudes."
            contador={(n) =>
              n === 1 ? '1 usuario activo' : `${n} usuarios activos`
            }
            renderItem={(usuario) => (
              <UsuarioActivoItem key={usuario.id} usuario={usuario} />
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
