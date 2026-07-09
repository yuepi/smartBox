import { defineComponent, ref, watch } from 'vue';

const PropsType = {
  cdata: {
    type: Object,
    require: true,
  },
} as const;

export default defineComponent({
  props: PropsType,
  setup(props) {
    const chartRef = ref();
    let options = {};

    watch(
      () => props.cdata,
      (val: any) => {
        const colorList = {
          linearYtoG: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#f5b44d' },
              { offset: 1, color: '#28f8de' },
            ],
          },
          linearGtoB: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#43dfa2' },
              { offset: 1, color: '#28f8de' },
            ],
          },
          linearBtoG: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#1c98e8' },
              { offset: 1, color: '#28f8de' },
            ],
          },
          areaBtoG: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(35,184,210,.2)' },
              { offset: 1, color: 'rgba(35,184,210,0)' },
            ],
          },
        };

        options = {
          title: {
            text: '',
            textStyle: {
              color: '#D3D6DD',
              fontSize: 24,
              fontWeight: 'normal',
            },
            subtext: `${val.year} 年第 ${val.weekCategory[0]?.split('/')[0] || ''} 月`,
            subtextStyle: {
              color: '#fff',
              fontSize: 16,
            },
            top: 20,
            left: 40,
          },
          legend: {
            top: 80,
            left: 40,
            orient: 'vertical',
            itemGap: 15,
            itemWidth: 12,
            itemHeight: 12,
            data: ['目标值', '实际值'],
            textStyle: {
              color: '#fff',
              fontSize: 14,
            },
          },
          tooltip: {
            trigger: 'item',
          },
          radar: {
            center: ['68%', '35%'],
            radius: '40%',
            name: {
              color: '#fff',
            },
            splitNumber: 8,
            axisLine: {
              lineStyle: {
                color: colorList.linearYtoG,
                opacity: 0.6,
              },
            },
            splitLine: {
              lineStyle: {
                color: colorList.linearYtoG,
                opacity: 0.6,
              },
            },
            splitArea: {
              areaStyle: {
                color: '#fff',
                opacity: 0.1,
                shadowBlur: 25,
                shadowColor: '#000',
                shadowOffsetX: 0,
                shadowOffsetY: 5,
              },
            },
            indicator: [
              { name: '总投递量', max: val.maxData },
              { name: '总回收量', max: val.maxData },
              { name: '日均投递', max: val.maxData / 7 },
              { name: '日均回收', max: val.maxData / 7 },
              { name: '满箱率(%)', max: 100 },
              { name: '在线率(%)', max: 100 },
            ],
          },
          grid: {
            left: 90,
            right: 80,
            bottom: '15%',
            top: '50%',
          },
          xAxis: {
            type: 'category',
            position: 'bottom',
            axisLine: {
              show: true,
              lineStyle: {
                color: '#34d399',
                width: 2,
              },
            },
            axisLabel: {
              color: 'rgba(255,255,255,.8)',
              fontSize: 12,
            },
            axisTick: {
              lineStyle: {
                color: '#34d399',
              },
            },
            data: val.weekCategory,
          },
          yAxis: {
            name: '投递量',
            nameLocation: 'end',
            nameGap: 24,
            nameTextStyle: {
              color: 'rgba(255,255,255,.8)',
              fontSize: 14,
            },
            max: val.maxData,
            splitNumber: 4,
            axisLine: {
              show: true, // 默认可能隐藏了，设为 true 显示
              lineStyle: {
                color: '#34d399', // 👈 轴线颜色
                width: 2,
              },
            },
            axisLabel: {
              color: 'rgba(255,255,255,.8)',
              fontSize: 12,
            },
            splitLine: {
              show: true,
              lineStyle: {
                color: 'rgba(255,107,107,0.3)', // 👈 网格线颜色（半透明红色）
                type: 'dashed',
              },
            },
          },
          series: [
            // ===== 雷达图 =====
            {
              name: '',
              type: 'radar',
              symbolSize: 0,
              data: [
                {
                  value: val.radarDataAvg[0],
                  name: '目标值',
                  itemStyle: {
                    normal: { color: '#f8d351' },
                  },
                  lineStyle: {
                    normal: { opacity: 0 },
                  },
                  areaStyle: {
                    normal: {
                      color: '#f8d351',
                      shadowBlur: 25,
                      shadowColor: 'rgba(248,211,81,.3)',
                      shadowOffsetX: 0,
                      shadowOffsetY: -10,
                      opacity: 1,
                    },
                  },
                },
                {
                  value: val.radarData[0],
                  name: '实际值',
                  itemStyle: {
                    normal: { color: '#43dfa2' },
                  },
                  lineStyle: {
                    normal: { opacity: 0 },
                  },
                  areaStyle: {
                    normal: {
                      color: colorList.linearGtoB,
                      shadowBlur: 15,
                      shadowColor: 'rgba(0,0,0,.2)',
                      shadowOffsetX: 0,
                      shadowOffsetY: 5,
                      opacity: 0.8,
                    },
                  },
                },
              ],
            },
            // ===== 折线图 =====
            {
              name: '',
              type: 'line',
              smooth: true,
              symbol: 'emptyCircle',
              symbolSize: 8,
              itemStyle: {
                normal: { color: '#fff' },
              },
              lineStyle: {
                normal: {
                  color: colorList.linearBtoG,
                  width: 3,
                },
              },
              areaStyle: {
                normal: {
                  color: colorList.areaBtoG,
                },
              },
              data: val.weekLineData,
              lineSmooth: true,
              markLine: {
                silent: true,
                data: [{ type: 'average', name: '平均值' }],
                precision: 0,
                label: {
                  normal: {
                    formatter: '平均值: {c}',
                  },
                },
                lineStyle: {
                  normal: {
                    color: 'rgba(248,211,81,.7)',
                  },
                },
              },
              tooltip: {
                position: 'top',
                formatter: '{c} 次',
                backgroundColor: 'rgba(28,152,232,.2)',
                padding: 6,
              },
            },
            // ===== 占位背景 =====
            {
              name: '占位背景',
              type: 'bar',
              itemStyle: {
                normal: {
                  show: true,
                  color: '#000',
                  opacity: 0,
                },
              },
              silent: true,
              barWidth: '50%',
              data: val.weekMaxData,
              animation: false,
            },
          ],
        };

        if (chartRef.value) {
          chartRef.value.initChart(options);
        }
      },
      {
        immediate: true,
        deep: true,
      },
    );

    return () => {
      return (
        <div>
          <echart height="360px" ref={chartRef} width="100%" />
        </div>
      );
    };
  },
});
