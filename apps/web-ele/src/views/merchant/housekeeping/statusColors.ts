/** 状态颜色仅用于展示，不参与订单、支付或结算判断；未知值统一用灰色。 */
const colors = {
  gray: '#737373', orange: '#b45309', blue: '#2563eb', cyan: '#0e7490',
  purple: '#7c3aed', green: '#15803d', teal: '#0f766e', pink: '#be185d', red: '#dc2626',
};

export function statusStyle(kind: 'payment' | 'settlement' | 'home' | 'refund' | 'onsite', value: string | number | null | undefined) {
  const mapping: Record<string, Record<string, keyof typeof colors>> = {
    payment: { '有支付记录': 'green', '无支付记录': 'gray', '支付记录待核实': 'orange' },
    settlement: { '0': 'orange', '1': 'green' },
    home: { '0': 'orange', '1': 'blue', '2': 'cyan', '3': 'purple', '4': 'green', '5': 'teal', '6': 'gray', '7': 'pink', '8': 'red' },
    refund: { '0': 'gray', '1': 'orange', '2': 'green', '3': 'red', PROCESSING: 'orange', SUCCESS: 'green', CLOSED: 'gray', ABNORMAL: 'red' },
    onsite: { '0': 'orange', '1': 'blue', '2': 'green', '3': 'gray' },
  };
  const color = colors[mapping[kind][String(value)] || (kind === 'settlement' ? 'purple' : 'gray')];
  // 只用文字颜色区分状态，不显示标签边框和底色。
  return { color, border: 'none', backgroundColor: 'transparent' };
}
