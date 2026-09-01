import { defineComponent, onMounted, reactive } from 'vue';

import Draw from './draw';

export default defineComponent({
  components: { Draw },
  setup() {
    const cdata = reactive({
      // 月份
      category: [
        '1月',
        '2月',
        '3月',
        '4月',
        '5月',
        '6月',
        '7月',
        '8月',
        '9月',
        '10月',
        '11月',
        '12月',
      ],
      // 月投递量 (柱状图)
      barData: [320, 280, 350, 420, 480, 520, 580, 540, 490, 560, 620, 680],
      // 月回收量 (折线图)
      lineData: [120, 100, 150, 200, 240, 280, 320, 300, 260, 310, 360, 400],
      // 投递完成率 (折线图2)
      rateData: [],
    });

    const setData = () => {
      cdata.rateData = cdata.barData.map((bar, index) => {
        const line = cdata.lineData[index] || 1;
        return Number.parseFloat((bar / line).toFixed(2));
      });
    };

    onMounted(() => {
      setData();
    });

    return () => {
      return (
        <div>
          <Draw cdata={cdata} />
        </div>
      );
    };
  },
});
