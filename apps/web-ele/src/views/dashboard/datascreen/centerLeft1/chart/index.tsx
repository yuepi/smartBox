import { defineComponent, onUnmounted, reactive } from 'vue';

import Draw from './draw';

export default defineComponent({
  components: {
    Draw,
  },
  setup() {
    let intervalInstance = null;
    const cdata = reactive({
      xData: ['混合', '织物', '有害', '其他', '金属'],
      seriesData: [
        { value: 35, name: '混合' },
        { value: 25, name: '织物' },
        { value: 20, name: '有害' },
        { value: 15, name: '其他' },
        { value: 5, name: '金属' },
      ],
    });
    intervalInstance = setInterval(() => {
      cdata.seriesData = cdata.seriesData.map((e) => ({
        ...e,
        value: Math.floor(Math.random() * 30) + 5, // 随机变化
      }));
    }, 3000);

    onUnmounted(() => {
      clearInterval(intervalInstance);
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
