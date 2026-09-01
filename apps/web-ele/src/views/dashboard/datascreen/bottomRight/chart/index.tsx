import { defineComponent, onMounted, onUnmounted, reactive, ref } from 'vue';

import Draw from './draw';

export default defineComponent({
  components: { Draw },
  setup() {
    const drawTiming = ref(0);
    const cdata = reactive({
      year: null as null | number,
      // 周日期标签
      weekCategory: [] as string[],
      // 折线图数据（每日投递量）
      weekLineData: [] as number[],
      // 雷达图 - 周维度汇总指标（我的指标）
      radarData: [] as any[],
      // 雷达图 - 对比基准（目标值）
      radarDataAvg: [] as any[],
      // 各指标最大值
      maxData: 6000,
      // 占位背景
      weekMaxData: [] as number[],
    });

    const setData = () => {
      cdata.weekCategory = [];
      cdata.weekMaxData = [];
      cdata.weekLineData = [];
      cdata.radarData = [];
      cdata.radarDataAvg = [];

      const dateBase = new Date();
      cdata.year = dateBase.getFullYear();

      // 本周7天数据汇总
      let totalDelivery = 0;
      let totalRecycle = 0;
      let fullCount = 0;
      let totalDevices = 0;
      let onlineDevices = 0;

      // 生成本周7天数据
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        cdata.weekCategory.push(`${date.getMonth() + 1}/${date.getDate()}`);

        // 投递量：工作日高、周末低
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseValue = isWeekend ? 300 : 600;
        const delivery = Math.round(Math.random() * 400 + baseValue);
        cdata.weekLineData.push(delivery);

        // 累计数据
        totalDelivery += delivery;
        const recycle = Math.round(delivery * (0.4 + Math.random() * 0.3));
        totalRecycle += recycle;
        if (Math.random() > 0.7) fullCount++;
        totalDevices += 20;
        onlineDevices += Math.round(18 + Math.random() * 2);
      }

      // 占位背景
      cdata.weekMaxData = cdata.weekLineData.map(() => cdata.maxData);

      // ===== 雷达图数据（6个维度） =====
      const avgDelivery = Math.round(totalDelivery / 7);
      const avgRecycle = Math.round(totalRecycle / 7);
      const fullRate = Math.round((fullCount / 7) * 100);
      const onlineRate = Math.round((onlineDevices / totalDevices) * 100);

      // 我的指标
      cdata.radarData = [
        [
          totalDelivery, // 总投递量
          totalRecycle, // 总回收量
          avgDelivery, // 日均投递
          avgRecycle, // 日均回收
          fullRate, // 满箱率(%)
          onlineRate, // 在线率(%)
        ],
      ];

      // 对比基准（目标值）
      const targetTotal = 4200;
      const targetRecycle = 1800;
      const targetAvg = 600;
      const targetAvgRecycle = 260;
      const targetFull = 30;
      const targetOnline = 95;
      cdata.radarDataAvg = [
        [
          targetTotal,
          targetRecycle,
          targetAvg,
          targetAvgRecycle,
          targetFull,
          targetOnline,
        ],
      ];
    };

    const drawTimingFn = () => {
      setData();
      drawTiming.value = setInterval(() => {
        setData();
      }, 10_000);
    };

    onMounted(() => {
      drawTimingFn();
    });

    onUnmounted(() => {
      clearInterval(drawTiming.value);
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
