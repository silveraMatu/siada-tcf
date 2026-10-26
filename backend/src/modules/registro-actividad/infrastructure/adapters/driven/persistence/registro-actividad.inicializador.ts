import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

//TypeORM no declara triggers: se crean (idempotentemente) en cada arranque para que nadie pueda modificar,
//borrar ni vaciar la bitácora, ni siquiera desde una consulta directa
@Injectable()
export class RegistroActividadInicializador implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION registro_actividad_solo_insercion() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'registro_actividad es de solo inserción: no se puede modificar ni borrar';
      END;
      $$ LANGUAGE plpgsql
    `);
    await this.dataSource.query(
      `DROP TRIGGER IF EXISTS trg_registro_actividad_filas ON registro_actividad`,
    );
    await this.dataSource.query(`
      CREATE TRIGGER trg_registro_actividad_filas
      BEFORE UPDATE OR DELETE ON registro_actividad
      FOR EACH ROW EXECUTE FUNCTION registro_actividad_solo_insercion()
    `);
    await this.dataSource.query(
      `DROP TRIGGER IF EXISTS trg_registro_actividad_vaciado ON registro_actividad`,
    );
    await this.dataSource.query(`
      CREATE TRIGGER trg_registro_actividad_vaciado
      BEFORE TRUNCATE ON registro_actividad
      FOR EACH STATEMENT EXECUTE FUNCTION registro_actividad_solo_insercion()
    `);
  }
}
