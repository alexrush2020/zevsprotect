import * as migration_20260929_211840_admin_models from './20260929_211840_admin_models';
import * as migration_20260930_004657_shop_forms_seed_fields from './20260930_004657_shop_forms_seed_fields';
import * as migration_20260930_020636_b24_jobs from './20260930_020636_b24_jobs';
import * as migration_20260930_021441_orders_guest_kpp from './20260930_021441_orders_guest_kpp';

export const migrations = [
  {
    up: migration_20260929_211840_admin_models.up,
    down: migration_20260929_211840_admin_models.down,
    name: '20260929_211840_admin_models',
  },
  {
    up: migration_20260930_004657_shop_forms_seed_fields.up,
    down: migration_20260930_004657_shop_forms_seed_fields.down,
    name: '20260930_004657_shop_forms_seed_fields',
  },
  {
    up: migration_20260930_020636_b24_jobs.up,
    down: migration_20260930_020636_b24_jobs.down,
    name: '20260930_020636_b24_jobs',
  },
  {
    up: migration_20260930_021441_orders_guest_kpp.up,
    down: migration_20260930_021441_orders_guest_kpp.down,
    name: '20260930_021441_orders_guest_kpp'
  },
];
