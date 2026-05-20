<script lang="ts" setup>
import type { UploadProps } from 'element-plus';

import { globalHeaders, requestClient } from '#/api/request';

import CustomModeler from './customModeler';

import 'bpmn-js/dist/assets/diagram-js.css'; // 左边工具栏以及编辑节点的样式
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const headers = ref(globalHeaders());

const canvasRef = ref();
const route = useRoute();

const state = reactive({
  form: { opurg: '3' } as any,
  chtag: true,
  params: {
    path: '',
    query: '',
  },
  intro: '',
  toExmen: '',
  tarnos: [] as string[],
  xml: null as any,
  uploadUrl: '',
  bpmnModeler: {} as any,
});

const { form, params, bpmnModeler } = toRefs(state);

const getOperateInfo = () => {
  const formInfo = toRaw(form.value);
  let atids = '';
  if (formInfo.atts) {
    for (const att of formInfo.atts) {
      atids += att.id + ',';
    }
    if (atids) {
      atids = atids.substring(0, atids.length - 1);
    }
  }
  formInfo.atids = atids;
  return formInfo;
};

defineExpose({ getOperateInfo });

const props = defineProps({
  prdid: { type: String, required: true },
  busty: { type: String, required: true },
});

onMounted(async () => {
  state.uploadUrl = `${import.meta.env.VITE_API_URL}gen/oss/upload`;
  await initInfo();
  if (state.chtag) {
    toggleFlowChart();
  }
});

const initInfo = async () => {
  const initVo = (await requestClient.get(`/bpm/initInfo?prdid=${props.prdid}&busty=${props.busty}`)) as any;
  state.intro = initVo.intro;
  for (const goal of initVo.goals) {
    state.tarnos.push(goal.tarno);
    state.toExmen += `${goal.tarno}.${goal.tarna}(${goal.tamen}) | `;
  }
  if (state.toExmen) {
    state.toExmen = state.toExmen.slice(0, -3);
  }
  // form.value.tarno = initVo.tarno;
  // form.value.tarna = initVo.tarna;
  // form.value.tamen = initVo.tamen;
};

// 流程图切换
const toggleFlowChart = async () => {
  if (!state.xml) {
    state.xml = (await requestClient.get(`/bpm/initXml?prdid=${props.prdid}`)) as any;
    bpmnModeler.value = new CustomModeler({
      container: canvasRef.value,
      additionalModules: [
        {
          paletteProvider: ['value', ''], // 禁用/清空左侧工具栏
          labelEditingProvider: ['value', ''], // 禁用节点编辑
          contextPadProvider: ['value', ''], // 禁用图形菜单
          bendpoints: ['value', {}], // 禁用连线拖动
          zoomScroll: ['value', ''], // 禁用滚动
          // moveCanvas: ['value', ''], //禁用拖动整个流程图
          move: ['value', ''], // 禁用单个图形拖动
        },
      ],
    });

    try {
      const result = await bpmnModeler.value.importXML(state.xml);
      const { warnings } = result;
      const elementRegistry = await bpmnModeler.value.get('elementRegistry');
      const list1 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (item.id === 'NS') {
          list1.push(item);
        }
      });

      const list2 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (item.id === 'L1') {
          list2.push(item);
        }
      });

      const list3 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (item.id === 'N1') {
          list3.push(item);
        }
      });

      const list4 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (state.tarnos.includes(item.id)) {
          list4.push(item);
        }
        // if (item.id === form.value.tarno) {
        //
        // }
      });

      const modeling = await bpmnModeler.value.get('modeling');
      modeling.setColor(list1, { fill: '#e4feef' });
      modeling.setColor(list2, { stroke: '#009900' });
      modeling.setColor(list3, { fill: '#fed6d6' });
      if (list4.length > 0) {
        modeling.setColor(list4, { fill: '#e3f1ff' });
      }
    } catch (err:any) {
      ElMessage.error('流程图加载出错');
      console.log(err.message, err.warnings);
    }

    addEventBusListener();
  }
};

let currNode = {};
const addEventBusListener = () => {
  const eventBus = bpmnModeler.value.get('eventBus'); // 需要使用eventBus
  const eventTypes = ['element.dblclick']; // 需要监听的事件集合
  eventTypes.forEach((eventType) => {
    eventBus.on(eventType, (e: any) => {
      if (!e || e.element.type === 'bpmn:Process') return;

      const elementRegistry = bpmnModeler.value.get('elementRegistry');
      const shape = elementRegistry.get(e.element.id); // 传递id进去

      // if(e.element.id.substring(0,1)!="N"){
      //
      // 	// bpmnModeler.value.get('modeling').updateProperties(shape,{
      // 	// 	name: '我哎你'
      // 	// })
      //
      // 	// // e.element.id="N"+(++lastNum);
      // 	// shape.id="N"+(++lastNum);
      // 	++lastNum;
      // 	shape.id="N"+lastNum;
      // 	shape.businessObject.id="N"+lastNum;
      //
      // 	console.log('新增了shape');
      // 	// console.log(e.element.id);
      // 	// 展示新增图形的属性
      // }

      console.log('双击了shape');
      console.log(shape);
      nodeModalRef.value.open(shape);
      currNode = shape;

      // openNodeModal(shape);

      // console.log(shape.businessObject.id);
      // shape.businessObject.name='李四';
      // bpmnModeler.value.get('modeling').updateProperties(shape,{
      // 	name: '我是修改后的Task名称'
      // })

      // this.getModeling().updateProperties(this.getShape(), {
      // 	[modelName]: multiple ? [newElement] : newElement,
      // });
      console.log(shape); // {Shape}
      // console.log(e.element) // {Shape}
      // console.log(JSON.stringify(shape)===JSON.stringify(e.element)) // true
    });
  });
};

// region -----附件逻辑-----
const handleRemove: UploadProps['onRemove'] = (file, uploadFiles) => {
  console.log(file, uploadFiles);
};

const handlePreview: UploadProps['onPreview'] = (uploadFile) => {
  console.log(uploadFile);
  ElMessageBox.confirm('请选择对应的附件操作', '附件操作', {
    confirmButtonText: '下载',
    cancelButtonText: '预览',
    type: 'info',
  })
    .then(async () => {
      // await get({
      //   url: '/gen/oss/download',
      //   // params: { name: uploadFile.name, path: uploadFile.addre + '/' + uploadFile.id + '.' + uploadFile.sname },
      //   params: { table: 'wf_audit_att', id: uploadFile.id },
      //   responseType: 'blob',
      // });
    })
    .catch(() => {});
};

const handleSuccess = (a: any, b: any, c: any) => {
  // c[c.length - 1] = { ...a };
  c[c.length - 1].id = a.id;
  // c[c.length - 1].name = a.name+" ["+a.size+"]";
  c[c.length - 1].name = a.name;
  c[c.length - 1].filid = a.filid;
  c[c.length - 1].filna = a.filna;
  c[c.length - 1].path = a.path;
  c[c.length - 1].ornum = c.length;
  if (form.value.id) {
    c[c.length - 1].audid = form.value.id;
  }
};

const handleExceed: UploadProps['onExceed'] = (files, uploadFiles) => {
  ElMessage.warning(`The limit is 3, you selected ${files.length} files this time, add up to ${files.length + uploadFiles.length} totally`);
};

// let lastNum=10;

const nodeModalRef = ref();
</script>

<template>
  <el-form class="zgrid" :inline="true" :model="form" label-width="160px" label-position="right">
    <el-form-item label="流程说明" style="width: 100%" v-if="state.intro">{{ state.intro }} </el-form-item>
    <el-form-item label="紧急程度" style="width: 100%">
      <el-radio-group v-model="form.opurg">
        <el-radio value="1"><span style="color: red">紧急</span></el-radio>
        <el-radio value="2"><span style="color: blue">急</span></el-radio>
        <el-radio value="3"><span>一般</span></el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="即将流向" style="width: 100%">
      {{ state.toExmen }}
    </el-form-item>
    <el-form-item label="处理意见" style="width: 100%">
      <el-input v-model="form.opnot" type="textarea" :rows="5" placeholder=" " />
    </el-form-item>
    <el-form-item label="附件" style="width: 100%">
      <el-upload
        :action="state.uploadUrl"
        :headers="headers"
        :on-preview="handlePreview"
        style="width: 800px"
        :on-success="handleSuccess"
        :on-remove="handleRemove"
        multiple
        :limit="10"
        :on-exceed="handleExceed"
        v-model:file-list="form.atts"
      >
        <el-button type="primary">上传附件</el-button>
      </el-upload>
    </el-form-item>
    <div class="zgrid-item" style="padding-left: 6px">
      <el-checkbox v-model="state.chtag" @change="toggleFlowChart">流程图</el-checkbox>
    </div>
    <div class="zgrid-item" v-show="state.chtag" style="height: 1600px">
      <div class="containers">
        <div class="canvas" ref="canvasRef"></div>
      </div>
    </div>
  </el-form>
</template>

<style scoped>
.containers {
  position: absolute;
  background-color: #ffffff;
  width: 100%;
  height: 100%;
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGUwZTAiIG9wYWNpdHk9Ii4yIi8+PHBhdGggZD0iTTQwIDBIMHY0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')
    repeat !important;
}

.dark .containers {
  background-color: #666 !important;
}

.canvas {
  width: 100%;
  height: 100%;
}

.panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
}
</style>
