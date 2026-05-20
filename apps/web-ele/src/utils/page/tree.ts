import { requestClient } from '#/api/request';
import { handleTree } from '#/utils/ruoyi';

export const treeQuery = async (state: any) => {
  const res = await requestClient.get(`${state.url}/list`, { params: state.form });
  state.list = handleTree(res);
};

export const treeItemDelete = async (state: any, id: string) => {
  ElMessageBox.confirm('确认要删除吗?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      // ElMessage.warning('演示模式，禁用了删除');
      await requestClient.delete(`${state.url}/${id}`);
      await treeQuery(state);
    })
    .catch(() => ElMessage.info('已取消删除'));
};

export async function treeDelete(state: any) {
  const delIds = state.ids.join(',');
  if (delIds.length <= 0) {
    ElMessage.warning('请选择后再进行删除');
    return;
  }
  ElMessageBox.confirm('确认删除已选中的数据项?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      // ElMessage.warning('演示模式，禁用了删除');
      await requestClient.delete(`${state.url}/${delIds}`);
      await treeQuery(state);
    })
    .catch(() => ElMessage.info('已取消删除'));
}

export function treeSelect(selection: any, state: any, iouField?: string) {
  if (!iouField) {
    iouField = 'id';
  }
  state.ids = selection.map((item: any) => item[iouField]);
  state.single = selection.length !== 1;
  state.multiple = selection.length === 0;
}

// export async function treeQuery(state: any) {
//   state.list = await req.get({
//     url: `${state.url}/tree`,
//     params: state.form,
//   });
//   state.loading = false;
// }

// export function treeSelect(selection: any, state: any) {
//   state.ids = selection.map((item: any) => item.id);
//   state.single = selection.length !== 1;
//   state.multiple = !selection.length;
// }

// export async function treeDelete(state: any) {
//   const delIds = state.ids.join(',');
//   if (delIds.length <= 0) {
//     ElMessage.warning('请选择后再进行删除');
//     return;
//   }
//   ElMessageBox.confirm('确认删除已选中的数据项?', '警告', {
//     confirmButtonText: '确定',
//     cancelButtonText: '取消',
//     type: 'warning',
//   })
//     .then(async () => {
//       // ElMessage.warning('演示模式，禁用了删除');
//       await req.dele({ url: state.url + '/' + delIds });
//       await treeQuery(state);
//     })
//     .catch(() => ElMessage.info('已取消删除'));
// }
//
// export const treeItemDelete = async (state: any, id: string) => {
//   ElMessageBox.confirm('确认要删除吗?', '警告', {
//     confirmButtonText: '确定',
//     cancelButtonText: '取消',
//     type: 'warning',
//   })
//     .then(async () => {
//       // ElMessage.warning('演示模式，禁用了删除');
//       await req.dele({ url: state.url + '/' + id });
//       await treeQuery(state);
//     })
//     .catch(() => ElMessage.info('已取消删除'));
// };

// export const tabAdd = async (url: string, data?: any, datax?: any) => {
//   if (!data) {
//     data = {};
//   }
//   data.uuid = uuid();
//   if (datax) {
//     if (datax.flush) {
//       putPage({ id: url, flush: datax.flush });
//     }
//   }
//   await router.push({
//     path: url + '/edit',
//     query: data,
//   });
// };

// export const tabAdd2 = async (url: string, data?: any, datax?: any) => {
//   if (!data) {
//     data = {};
//   }
//   data.uuid = uuid();
//   if (datax) {
//     if (datax.flush) {
//       putPage({ id: url, flush: datax.flush });
//     }
//   }
//   await router.push({
//     path: url + '/edit2',
//     query: data,
//   });
// };

// export const tabEdit = async (url: string, id: string) => {
//   await router.push({
//     path: url + '/edit',
//     query: { id: id },
//   });
// };
//
// export const tabView = async (url: string, id: string) => {
//   await router.push({
//     path: url + '/view',
//     query: { id: id },
//   });
// };

// export const pageAdd = (url: string) => {
//   // if(url.indexOf("?")>0){
//   // 	window.open('/#/page/'+url+'&type=add');
//   // }else{
//   // 	window.open('/#/page/'+url+'?type=add');
//   // }
//   window.open(import.meta.env.VITE_PUBLIC_PATH + '#/page/' + url);
// };
//
// export const pageEdit = (url: string) => {
//   window.open(import.meta.env.VITE_PUBLIC_PATH + '#/page/' + url);
// };
//
// export const pageView = (url: string) => {
//   window.open(import.meta.env.VITE_PUBLIC_PATH + '#/page/' + url);
// };
//
// export const toFinish = () => {
//   window.alert('待完成');
// };
