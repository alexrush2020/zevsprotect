import * as migration_20260929_211840_admin_models from './20260929_211840_admin_models';
import * as migration_20260930_004657_shop_forms_seed_fields from './20260930_004657_shop_forms_seed_fields';

export const migrations = [
  {
    up: migration_20260929_211840_admin_models.up,
    down: migration_20260929_211840_admin_models.down,
    name: '20260929_211840_admin_models',
  },
  {
    up: migration_20260930_004657_shop_forms_seed_fields.up,
    down: migration_20260930_004657_shop_forms_seed_fields.down,
    name: '20260930_004657_shop_forms_seed_fields'
  },
];
