import {
  ORGANISME_MODULES,
  ORGANISME_MODULE_KEYS,
  type OrganismeModuleKey,
} from "./registry";

export interface OrganismeModuleRow {
  module: string;
  available: boolean;
  enabled: boolean;
}

export interface OrganismeModuleState {
  key: OrganismeModuleKey;
  label: string;
  description: string;
  disabledHint: string;
  available: boolean;
  enabled: boolean;
  /** available && enabled : seule valeur à tester pour afficher la fonctionnalité */
  active: boolean;
}

export function resolveModules(
  rows: OrganismeModuleRow[]
): OrganismeModuleState[] {
  const byKey = new Map(rows.map((r) => [r.module, r]));
  return ORGANISME_MODULE_KEYS.map((key) => {
    const { label, description, disabledHint, defaults } =
      ORGANISME_MODULES[key];
    const row = byKey.get(key);
    const available = row?.available ?? defaults.available;
    const enabled = row?.enabled ?? defaults.enabled;
    return {
      key,
      label,
      description,
      disabledHint,
      available,
      enabled,
      active: available && enabled,
    };
  });
}
