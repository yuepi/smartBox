<script lang="ts" setup>
import type { UploadProps } from 'element-plus';

import { globalHeaders, requestClient } from '#/api/request';

import CustomModeler from './customModeler';

import 'bpmn-js/dist/assets/diagram-js.css'; // 左边工具栏以及编辑节点的样式
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const props = defineProps({
  proid: { type: String, required: true },
  busty: { type: String, required: true },
});

// endregion

const emit = defineEmits(['submit']);

// import Pmodal from '#/components/bpm/pmodal.vue';

const headers = ref(globalHeaders());

const canvasRef = ref();

const state = reactive({
  form: { opurg: '3', retag: true } as any,
  chtag: true,
  params: {
    path: '',
    query: '',
  },
  intro: '',
  toExmen: '',
  // tarno: '',
  xml: null as any,
  uploadUrl: '',
  bpmnModeler: {} as any,
  opways: [] as any,
  audits: [] as any,
  autag: true,
  refNodes: [] as any,
  cutag: false,
  hiHamen: '',
  cuExmen: '',
  // ccmen:[{id:'11',name:'张三'},{id:'22',name:'李四'}],
  ccmen: [],
  nodeList: [],
  lineList: [],
  // toNode: '',
  tarnos: [] as string[],
  curnos: [] as string[],
});

const { form, params, bpmnModeler, audits } = toRefs(state);

const getOperateInfo = () => {
  const formInfo = toRaw(form.value);
  let atids = '';
  if (formInfo.atts) {
    for (const att of formInfo.atts) {
      atids += `${att.id},`;
    }
    if (atids) {
      atids = atids.slice(0, Math.max(0, atids.length - 1));
    }
  }
  formInfo.atids = atids;
  return formInfo;
};

defineExpose({ getOperateInfo });

onMounted(async () => {
  state.uploadUrl = `${import.meta.env.VITE_API_URL}gen/oss/upload`;
  await viewInfo();
  if (state.chtag) {
    await toggleFlowChart();
  }
});

const viewInfo = async () => {
  const viewVo = (await requestClient.get(`/bpm/viewInfo?proid=${props.proid}`)) as any;
  audits.value = viewVo.audits;
  state.hiHamen = viewVo.hiHamen;
  state.cutag = viewVo.cutag;
  state.form.proid = props.proid;
  for (const cutask of viewVo.cuTasks) {
    state.curnos.push(cutask.nodno);
    state.cuExmen += `${cutask.nodno}.${cutask.nodna}(${cutask.exuna}) | `;
  }
  if (state.cuExmen) {
    state.cuExmen = state.cuExmen.slice(0, -3);
  }
  console.log(viewVo.cuTasks);
  for (const cuTask of viewVo.cuTasks) {
    if (cuTask.crtag) {
      state.form.nodid = cuTask.nodid;
      state.form.facno = cuTask.nodno;
      state.form.facna = cuTask.nodna;
      state.form.tasty = cuTask.tasty;
      state.form.tasid = cuTask.tasid;
      break;
    }
  }
  console.log(state.form);
  // form.value = viewVo.zproc;
  if (state.cutag) {
    const passInfo: any = await requestClient.get(`/bpm/passInfo?proid=${props.proid}&facno=${form.value.facno}&busty=${props.busty}`);

    for (const goal of passInfo.goals) {
      if(passInfo.bacid){
        form.value.tarno = goal.tarno;
        form.value.tarna = goal.tarna;
        form.value.tamen = goal.tamen;
      }
      state.tarnos.push(goal.tarno);
      state.toExmen += `${goal.tarno}.${goal.tarna}(${goal.tamen}) | `;
    }
    if (state.toExmen) {
      state.toExmen = state.toExmen.slice(0, -3);
    }
    // form.value.tarno = passInfo.tarno;
    // form.value.tarna = passInfo.tarna;
    // form.value.tamen = passInfo.tamen;
    form.value.bacid = passInfo.bacid;
    // state.toExmen = passInfo.tarno === 'NE' ? `${passInfo.tarno}.${passInfo.tarna}` : `${passInfo.tarno}.${passInfo.tarna}(${passInfo.tamen})`;
    // state.toNode = passInfo.tarno;

    form.value.opkey = 'pass';
    form.value.opurg = 'a';

    switch (form.value.tasty) {
      case 'communicate': {
        state.opways = [{ id: 'bacommunicate', name: '回复沟通' }];
        form.value.opkey = 'bacommunicate';

        break;
      }
      case 'review': {
        state.opways =
          form.value.facno === 'N1'
            ? [
                { id: 'pass', name: '通过' },
                { id: 'turn', name: '转办' },
                { id: 'communicate', name: '沟通' },
                { id: 'abandon', name: '废弃' },
              ]
            : [
                { id: 'pass', name: '通过' },
                { id: 'refuse', name: '驳回' },
                { id: 'turn', name: '转办' },
                { id: 'communicate', name: '沟通' },
                { id: 'abandon', name: '废弃' },
              ];
        break;
      }
      case 'to_communicate': {
        state.opways = [
          { id: 'communicate', name: '沟通' },
          { id: 'cacommunicate', name: '取消沟通' },
        ];

        break;
      }
      // No default
    }
  }
};
const toggleFlowChart = async () => {
  if (!state.xml) {
    // const result = (await requestClient.get('/bpm/zproc?proid=' + props.proid)) as any;
    //
    // audits.value = result.audits;
    // state.hiHamen = result.hiHamen;
    // state.cuExmen = result.cuExmen;
    //
    // state.cutag = result.cutag;
    // form.value = result.zproc;

    const map = (await requestClient.get(`/bpm/viewXml?proid=${props.proid}`)) as any;
    state.xml = map.xml;
    state.nodeList = map.nodeList;
    state.lineList = map.lineList;

    bpmnModeler.value = new CustomModeler({
      container: canvasRef.value,
      additionalModules: [
        // 添加翻译
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
      console.log(warnings);

      // console.log('importXMLok');

      const elementRegistry = await bpmnModeler.value.get('elementRegistry');
      // console.log(bpmnModeler.value);
      // console.log('elementRegistry', elementRegistry);

      const list1 = [] as any;
      elementRegistry.forEach((item: any) => {
        for (let i = 0; i < state.nodeList.length; i++) {
          if (item.id === state.nodeList[i]) {
            list1.push(item);
            break;
          }
        }
      });

      const list2 = [] as any;
      elementRegistry.forEach((item: any) => {
        for (let i = 0; i < state.lineList.length; i++) {
          if (item.id === state.lineList[i]) {
            list2.push(item);
            break;
          }
        }
      });

      // const list3 = [] as any;
      // elementRegistry.forEach((item: any) => {
      //   if (item.id === form.value.facno) {
      //     list3.push(item);
      //   }
      // });

      const list3 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (state.curnos.includes(item.id)) {
          list3.push(item);
        }
      });

      const list4 = [] as any;
      elementRegistry.forEach((item: any) => {
        if (state.tarnos.includes(item.id)) {
          list4.push(item);
        }
      });

      const modeling = await bpmnModeler.value.get('modeling');
      if (list1.length > 0) {
        modeling.setColor(list1, { fill: '#e4feef' });
      }
      if (list2.length > 0) {
        modeling.setColor(list2, { stroke: '#009900' });
      }
      if (list3.length > 0) {
        modeling.setColor(list3, { fill: '#fed6d6' });
      }
      if (list4.length > 0) {
        modeling.setColor(list4, { fill: '#e3f1ff' });
      }

    } catch (err:any) {
      console.log(err.message, err.warnings);
    }

    // bpmnModeler.value.importXML(state.xml, async (err: any) => {
    //   if (err) {
    //     console.error(err);
    //   } else {
    //
    //   }
    // });

    addEventBusListener();
  }
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

let currNode = {};
// let lastNum=10;

const addEventBusListener = () => {
  const eventBus = bpmnModeler.value.get('eventBus'); // 需要使用eventBus
  const eventTypes = ['element.dblclick']; // 需要监听的事件集合
  eventTypes.forEach((eventType) => {
    eventBus.on(eventType, (e) => {
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
      // console.log(shape); // {Shape}
      // console.log(e.element) // {Shape}
      // console.log(JSON.stringify(shape)===JSON.stringify(e.element)) // true
    });
  });
};

const opChange = async (key: any) => {
  if (key === 'refuse') {
    state.refNodes = await requestClient.get(`/bpm/refuseInfo?proid=${props.proid}&facno=${form.value.facno}`);

    state.form.refno = state.refNodes[0].refno;
    state.form.refna = '起草节点';
    refChange(state.form.refno);

    // 驳回时要不要上色
    // const elementRegistry = BpmnStore.getModeler().get('elementRegistry');
    // const list4 = [] as any;
    // elementRegistry.forEach((item: any) => {
    // 	if (item.id ==	state.form.refno) {
    // 		list4.push(item);
    // 	}
    // });
    // let modeling = BpmnStore.modeler.get('modeling');
    // modeling.setColor(list4, {fill: '#e3f1ff'});

    // state.refNodes = [
    //   { id: 'N2', name: '起草节点', exman: 'sa' },
    //   { id: 'N4', name: '张三', exman: 'z3' },
    //   { id: 'N5', name: '王五', exman: 'w5' },
    //   { id: 'N6', name: 'xxx', exman: 'w5' },
    // ];
  } else if (key === 'cacommunicate') {
    state.ccmen = await requestClient.get(`/bpm/ccInfo?proid=${props.proid}`);
  }
};

const refChange = (id: any) => {
  for (let i = 0; i < state.refNodes.length; i++) {
    if (state.refNodes[i].refno === id) {
      form.value.refna = state.refNodes[i].refna;
      form.value.reman = state.refNodes[i].exman;
      break;
    }
  }
};

// region -----组织架构逻辑-----
const orgModal = ref();
const cdata = reactive({}) as any;

const tumanModal = () => {
  orgModal.value.open({
    opener: 'tuman',
    orgType: 6,
    selectMode: 1,
  });
};

const comenModal = () => {
  orgModal.value.open({
    opener: 'comen',
    orgType: 6,
    selectMode: 2,
    orgs: toRaw(form.value.comen),
  });
};

const closeOrgModal = (data: any) => {
  if (data.opener === 'tuman') {
    if (data.orgs && data.orgs.length > 0) {
      form.value.tuman = {};
      form.value.tuman = { id: data.orgs[0].id, name: data.orgs[0].name };
      form.value.tuuid = data.orgs[0].id;
    } else {
      form.value.tuman = null;
      form.value.tuuid = null;
    }
  } else if (data.opener === 'comen') {
    if (data.orgs && data.orgs.length > 0) {
      form.value.comen = data.orgs;
      form.value.coids = '';
      for (const org of data.orgs) {
        form.value.coids += `${org.id};`;
      }
      if (form.value.coids !== '') {
        form.value.coids = form.value.coids.slice(0, Math.max(0, form.value.coids.length - 1));
      }
    } else {
      form.value.comen = null;
      form.value.coids = null;
    }
  }
};

cdata.tuman = computed(() => {
  return form.value.tuman ? form.value.tuman.name : '';
});

cdata.comen = computed(() => {
  let names = '';
  if (form.value.comen && form.value.comen.length > 0) {
    for (const user of form.value.comen) {
      names += `${user.name}；`;
    }
  }
  return names;
});

const wfSubmit = async () => {
  // 附件ID处理
  let atids = '';
  if (form.value.atts) {
    for (const att of form.value.atts) {
      atids += `${att.id},`;
    }
    if (atids) {
      atids = atids.slice(0, Math.max(0, atids.length - 1));
    }
  }
  form.value.atids = atids;

  switch (form.value.opkey) {
    case 'abandon': {
      // 废弃
      if (form.value.opnot) {
        emit('submit', form.value);
      } else {
        ElMessage.warning('请填写废弃的处理意见');
      }
      break;
    }
    case 'bacommunicate': {
      // 回复沟通
      if (form.value.opnot) {
        emit('submit', form.value);
      } else {
        ElMessage.warning('请填写回复沟通的处理意见');
      }
      break;
    }
    case 'cacommunicate': {
      // 取消沟通
      const info = toRaw(form.value);
      if (cdata.ccarr && cdata.ccarr.length > 0) {
        console.log(cdata.ccarr);
        info.ccids = cdata.ccarr.toString();
        emit('submit', form.value);
      } else {
        ElMessage.warning('请选择要取消的人员');
      }
      break;
    }
    case 'communicate': {
      // 沟通
      const commInfo = toRaw(form.value);
      if (commInfo.coids) {
        emit('submit', form.value);
      } else {
        ElMessage.warning('请选择沟通人员后再沟通');
      }
      break;
    }
    case 'pass': {
      // 通过
      emit('submit', form.value);
      break;
    }
    case 'refuse': {
      // 驳回
      const refInfo = toRaw(form.value);
      if (refInfo.refno) {
        refInfo.tarno = refInfo.refno;
        refInfo.tarna = refInfo.refna;
        refInfo.exman = refInfo.reman;
        console.log(form.value);
        emit('submit', form.value);
      } else {
        ElMessage.warning('请选择驳回节点后再驳回');
      }
      break;
    }
    case 'turn': {
      // 转办
      const turnInfo = toRaw(form.value);
      if (turnInfo.tuman) {
        emit('submit', form.value);
      } else {
        ElMessage.warning('请选择转办人员后再转办');
      }
      break;
    }
  }
};

const nodeModalRef = ref();
</script>

<template>
  <el-form class="zgrid" :inline="true" :model="form" label-width="160px" label-position="left">
    <!--            <el-form-item label="流程说明">-->
    <!--              <div class="zjustify" style="width: 100%">-->
    <!--                <div>这是一个测试的流程，目前功能还不完善</div>-->
    <!--                <div>-->
    <!--                  <el-button type="success" @click="pmanage()" plain>特权人处理</el-button>-->
    <!--                </div>-->
    <!--              </div>-->
    <!--            </el-form-item>-->
    <div class="zgrid-item" style="padding-left: 6px">
      <el-checkbox v-model="state.autag">显示审批记录</el-checkbox>
    </div>
    <div class="zgrid-item" v-show="state.autag">
      <el-table :data="audits" style="width: 100%">
        <el-table-column prop="crtim" label="时间" width="164" />
        <el-table-column prop="facno" label="节点编号" width="80" />
        <el-table-column prop="facna" label="节点名称" width="200" />
        <el-table-column prop="hauna" label="操作者" width="90">
          <template #default="scope">
            {{ scope.row.facno === 'NE' ? '系统' : scope.row.hauna }}
          </template>
        </el-table-column>
        <el-table-column prop="opinf" label="操作" width="300" />
        <el-table-column prop="opnot" label="处理意见">
          <template #default="scope">
            {{ scope.row.opnot }}
            <!--							<table style="margin-bottom: 0;">-->
            <!--								<thead style="display: none">-->
            <!--								<tr><th style="width: 200px">文件名</th><th style="width: 60px">大小</th><th style="width: 50px">操作</th></tr>-->
            <!--								</thead>-->
            <!--								<tbody>-->
            <!--								<tr v-for='item in scope.row.atts' :key='item.id'>-->
            <!--									<td>{{ item.name }}</td>-->
            <!--									<td>{{ item.zsize }}</td>-->
            <!--									<td></td>-->
            <!--								</tr>-->
            <!--								</tbody>-->
            <!--							</table>-->
            <div v-for="item in scope.row.atts" :key="item.id" style="color: #57a7da">
              <!--								<el-icon style='cursor: pointer;'><ele-Download /></el-icon>-->
              <!--                <img :src="vdownload" style="top: 3px; cursor: pointer; position: relative" @click="downloadAtt(item.id)" />-->
              <span style="cursor: pointer; margin-left: 5px">{{ item.name }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div v-if="state.cutag">
      <el-form-item label="通知紧急程度">
        <el-radio-group v-model="form.opurg">
          <el-radio value="a"><span>一般</span></el-radio>
          <el-radio value="b"><span style="color: blue">急</span></el-radio>
          <el-radio value="c"><span style="color: red">紧急</span></el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="操作">
        <el-radio-group v-model="form.opkey" @change="opChange">
          <!--						<el-radio label='pass'>通过</el-radio>-->
          <!--						<el-radio label='refuse'>驳回</el-radio>-->
          <!--						<el-radio label='turn'>转办</el-radio>-->
          <!--						<el-radio label='communicate'>沟通</el-radio>-->
          <!--						<el-radio label='abandon'>废弃</el-radio>-->
          <el-radio v-for="item in state.opways" :key="item.id" :value="item.id">{{ item.name }} </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="驳回到" v-if="form.opkey === 'refuse'">
        <el-select v-model="form.refno" placeholder="请选择" style="width: 300px; margin-right: 8px" @change="refChange">
          <el-option v-for="item in state.refNodes" :key="item.refno" :value="item.refno" :label="`${item.refno}.${item.refna}`" />
        </el-select>
        <el-checkbox v-model="form.retag">驳回的节点通过后直接返回本节点</el-checkbox>
      </el-form-item>
      <el-form-item label="转办人员" v-if="form.opkey === 'turn'">
        <el-input v-model="cdata.tuman" readonly @click="tumanModal" style="width: 300px; margin-right: 8px" />
        <el-checkbox v-model="form.tutag">流程重新流经本节点时，直接由转办人员处理</el-checkbox>
      </el-form-item>
      <el-form-item label="沟通人员" v-if="form.opkey === 'communicate'">
        <el-input v-model="cdata.comen" readonly @click="comenModal" style="width: 300px; margin-right: 8px" />
        <el-checkbox v-model="form.cotag">是否隐藏意见</el-checkbox>
      </el-form-item>
      <el-form-item label="取消沟通人员" v-if="form.opkey === 'cacommunicate'">
        <el-checkbox-group v-model="cdata.ccarr">
          <el-checkbox v-for="item in state.ccmen" :key="item.tasid" :label="item.tasid" name="type">{{ item.name }} </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="即将流向" v-if="form.opkey === 'pass'">
        {{ state.toExmen }}
      </el-form-item>
      <el-form-item label="处理意见">
        <div style="width: 100%">
          <div class="au-flex">
            <div class="au-msg" style="padding: 3px">
              <el-input v-model="form.opnot" type="textarea" :rows="4" placeholder=" " />
            </div>
            <div class="au-button">
              <el-button type="primary" @click="wfSubmit()" style="width: 94px; height: 94px; margin-top: 3px; margin-left: 6px">提 交 </el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="附件">
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
    </div>
    <el-form-item label="当前处理人" v-if="state.cuExmen">
      {{ state.cuExmen }}
    </el-form-item>
    <el-form-item label="已经处理人" v-if="state.cuExmen">
      {{ state.hiHamen }}
    </el-form-item>
    <div class="zgrid-item" style="padding-left: 6px">
      <el-checkbox v-model="state.chtag" @change="toggleFlowChart">流程图</el-checkbox>
    </div>
    <div class="zgrid-item" v-show="state.chtag" style="height: 1600px">
      <div class="containers">
        <div class="canvas" ref="canvasRef"></div>
      </div>
    </div>
    <OrgModal ref="orgModal" @close="closeOrgModal" />
    <!--      <Pmodal ref="pmodal" @close="closePmodal" />-->
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

.au-flex {
  display: flex;
  background-color: white;
}

.au-msg {
  flex: 1;
  width: 100%;
}

.au-button {
  width: 105px;
  min-width: 105px;
}
</style>
