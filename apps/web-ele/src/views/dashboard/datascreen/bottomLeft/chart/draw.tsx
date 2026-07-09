import { defineComponent, ref, watch } from 'vue'

import * as echarts from 'echarts'

const PropsType = {
  cdata: {
    type: Object,
    require: true,
  },
} as const

export default defineComponent({
  props: PropsType,
  setup(props) {
    const chartRef = ref()
    let options = {}

    watch(
      () => props.cdata,
      (val: any) => {
        options = {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
          },
          legend: {
            data: ['月投递量', '月回收量', '完成率'],
            textStyle: { color: '#d1d5db' },
            top: 0,
          },
          grid: {
            left: '6%',
            right: '6%',
            top: '15%',
            bottom: '10%',
          },
          xAxis: {
            data: val.category,
            axisLine: {
              lineStyle: { color: '#6b7280' },
            },
            axisLabel: {
              color: '#9ca3af',
            },
            axisTick: { show: false },
          },
          yAxis: [
            {
              name: '投递/回收量',
              nameTextStyle: { color: '#9ca3af' },
              splitLine: { show: true, lineStyle: { color: '#374151', type: 'dashed' } },
              axisLine: {
                lineStyle: { color: '#6b7280' },
              },
              axisLabel: {
                color: '#9ca3af',
              },
            },
            {
              name: '完成率 (%)',
              nameTextStyle: { color: '#9ca3af' },
              splitLine: { show: false },
              axisLine: {
                lineStyle: { color: '#6b7280' },
              },
              axisLabel: {
                color: '#9ca3af',
                formatter: '{value}%',
              },
            },
          ],
          series: [
            {
              name: '月投递量',
              type: 'bar',
              barWidth: 16,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#22d3ee' },
                  { offset: 1, color: '#0891b2' },
                ]),
              },
              data: val.barData,
            },
            {
              name: '月回收量',
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 8,
              lineStyle: {
                width: 3,
                color: '#f472b6',
              },
              itemStyle: {
                color: '#f472b6',
              },
              data: val.lineData,
            },
            {
              name: '完成率',
              type: 'line',
              yAxisIndex: 1,
              smooth: true,
              symbol: 'diamond',
              symbolSize: 10,
              lineStyle: {
                width: 2,
                color: '#fbbf24',
                type: 'dashed',
              },
              itemStyle: {
                color: '#fbbf24',
              },
              data: val.rateData,
              label: {
                show: true,
                formatter: (params: any) => `${(params.value * 100).toFixed(0)}%`,
                color: '#fbbf24',
                fontSize: 10,
                position: 'top',
              },
            },
          ],
        }

        if (chartRef.value) {
          chartRef.value.initChart(options)
        }
      },
      {
        immediate: true,
        deep: true,
      }
    )

    return () => {
      return (
        <div>
          <echart height="360px" ref={chartRef} width="100%" />
        </div>
      )
    }
  },
})
