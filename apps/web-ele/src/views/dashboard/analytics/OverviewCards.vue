<!-- components/OverviewCards.vue -->
<script setup lang="ts">
import { AnalysisOverview } from '@vben/common-ui';
import { SvgBellIcon, SvgCakeIcon, SvgCardIcon, SvgDownloadIcon } from '@vben/icons';

const overviewItems = [
  {
    icon: SvgCardIcon,
    title: '设备总数',
    totalTitle: '在线设备',
    totalValue: 156,
    value: 142,
  },
  {
    icon: SvgCakeIcon,
    title: '今日投递',
    totalTitle: '今日投递重量',
    totalValue: 2850,
    value: 326,
  },
  {
    icon: SvgDownloadIcon,
    title: '今日回收',
    totalTitle: '今日回收金额',
    totalValue: 2850,
    value: 326,
  },
  {
    icon: SvgBellIcon,
    title: '今日订单',
    totalTitle: '今日订单数',
    totalValue: 1250,
    value: 86,
  },
];
</script>

<template>
  <AnalysisOverview :items="overviewItems" />
</template>
