-- Deja un solo libro por cuenta corriente dentro de cada rendición mensual (libros_banco).
--
-- La regla «un libro por N° de cuenta corriente y cuenta mensual» se aplica con la restricción
-- UQ_libro_banco_cuenta_numero. Si la base ya tiene dos libros con el mismo N° en una cuenta mensual
-- (cargados antes de la regla), el synchronize de TypeORM no puede crear la restricción y la app no arranca.
--
-- Hay que correrlo UNA vez en cada base existente ANTES de arrancar con el código nuevo.
-- Es idempotente: si no hay duplicados, no cambia nada.
--
--   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/deduplicar-libros-banco.sql
--
-- 1) Recorta espacios del N° de cuenta (la API ahora los recorta al ingestar, así que «100234/1 » y
--    «100234/1» eran el mismo libro). 2) Conserva el libro más reciente (mayor id) de cada
--    (cuenta mensual, N° de cuenta) y borra los anteriores. Sus transacciones y las observaciones
--    ligadas a ellas se eliminan en cascada. Los libros sin N° (NULL) no se tocan: no chocan en la restricción.

BEGIN;

UPDATE libros_banco
SET numero_cuenta_cte = btrim(numero_cuenta_cte)
WHERE numero_cuenta_cte IS NOT NULL
  AND numero_cuenta_cte <> btrim(numero_cuenta_cte);

DELETE FROM libros_banco viejo
USING libros_banco nuevo
WHERE viejo.cuenta_mensual_id = nuevo.cuenta_mensual_id
  AND viejo.numero_cuenta_cte = nuevo.numero_cuenta_cte
  AND viejo.id < nuevo.id;

COMMIT;
