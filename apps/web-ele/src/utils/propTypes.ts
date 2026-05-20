import type { CSSProperties } from 'vue';
import type { VueTypesInterface, VueTypeValidableDef } from 'vue-types';

import VueTypes, { createTypes, toValidableType } from 'vue-types';

interface FieldOption {
  key: number;
  label: string;
  visible: boolean;
  children?: Array<FieldOption>;
}

type PropTypes = VueTypesInterface & {
  readonly fieldOption: VueTypeValidableDef<Array<FieldOption>>;
  readonly style: VueTypeValidableDef<CSSProperties>;
};

const propTypes = createTypes({
  func: undefined,
  bool: undefined,
  string: undefined,
  number: undefined,
  object: undefined,
  integer: undefined,
}) as PropTypes;

export default class ProjectTypes extends VueTypes {
  static get style() {
    return toValidableType('style', {
      type: [String, Object],
      default: undefined,
    });
  }
}
export { propTypes };
