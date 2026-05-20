import { ElLoading, ElMessage } from 'element-plus';

import { requestClient } from '#/api/request';

interface IeditInit {
  state: any;
  route: any;
}

export const editInit = async (data: IeditInit) => {
  data.state.params = <any>data.route;
  const id = data.state.params.query?.id;
  if (id) {
    data.state.form = await requestClient.get(`${data.state.url}/info/${id}`);
  } else {
    data.state.form.avtag = true;
  }
};

interface ItabSave {
  state: any;
  formRef: any;
  iouField?: string;
}

export const tabSave = async (data: ItabSave) => {
  const canSubmit = await checkSubmit(data.formRef);
  if (!canSubmit) {
    return false;
  }
  if (!data.iouField) {
    data.iouField = 'id';
  }
  await (data.state.form[data.iouField] ? requestClient.put(data.state.url, data.state.form) : requestClient.post(data.state.url, data.state.form));
  return true;
};

interface IpageSave {
  state: any;
  formRef: any;
  iouField?: string;
}

export const pageSave = async (data: IpageSave) => {
  const loading = ElLoading.service({
    lock: true,
    fullscreen: true,
    text: '',
    background: 'rgba(0, 0, 0, 0.1)',
  });
  const canSubmit = await checkSubmit(data.formRef);
  if (!canSubmit) {
    loading.close();
    return false;
  }

  let isSuccess = true;
  if (!data.iouField) {
    data.iouField = 'id';
  }
  await (data.state.form[data.iouField]
    ? requestClient.put(data.state.url, data.state.form).catch(() => {
        isSuccess = false;
      })
    : requestClient.post(data.state.url, data.state.form).catch(() => {
        isSuccess = false;
      }));
  if (isSuccess) {
    ElMessage({
      showClose: true,
      message: '保存成功，1秒后页面按自动关闭',
      type: 'success',
      duration: 1000,
    });
    setTimeout(() => {
      window.close();
    }, 1000);
  } else {
    loading.close();
  }
};

export const pageClose = () => {
  window.close();
};

interface IdrawerSave {
  state: any;
  formRef: any;
  iouField?: string;
}

export const drawerSave = async (data: IdrawerSave) => {
  const canSubmit = await checkSubmit(data.formRef);
  if (!canSubmit) {
    return false;
  }

  if (!data.iouField) {
    data.iouField = 'id';
  }
  await (data.state.form[data.iouField] ? requestClient.put(data.state.url, data.state.form) : requestClient.post(data.state.url, data.state.form));
  data.state.show = false;
  return true;
};

export const formSave = async (data: IdrawerSave) => {
  const canSubmit = await checkSubmit(data.formRef);
  if (!canSubmit) {
    return false;
  }

  if (!data.iouField) {
    data.iouField = 'id';
  }
  return await (data.state.form[data.iouField] ? requestClient.put(data.state.url, data.state.form) : requestClient.post(data.state.url, data.state.form));
};

// interface IdrawerOpen {
//   state: any;
//   id: string;
// }

// export const drawerOpen = async (data: IdrawerOpen) => {
//   data.state.form = data?.id ? requestClient.get(`${data.state.url}/info/${data.id}`) : { avtag: true };
//   data.state.show = true;
// };

export const checkSubmit = async (formRef: any) => {
  let canSubmit = false;
  await formRef.validate((valid: any, fields: any) => {
    if (valid) {
      canSubmit = true;
    } else {
      let msgs = '';
      for (const prop in fields) {
        for (let i = 0; i < fields[prop].length; i++) {
          msgs += `${fields[prop][i].message}； `;
        }
      }
      ElMessage.warning(msgs);
    }
  });
  return canSubmit;
};

interface ImodalSave {
  state: any;
  formRef: any;
  iouField?: string;
}

export const modalSave = async (data: ImodalSave) => {
  const loading = ElLoading.service({
    lock: true,
    fullscreen: true,
    text: '',
    background: 'rgba(0, 0, 0, 0.1)',
  });
  let isSuccess = true;
  const canSubmit = await checkSubmit(data.formRef);
  if (!canSubmit) {
    loading.close();
    return false;
  }

  if (!data.iouField) {
    data.iouField = 'id';
  }
  const id = await (data.state.form[data.iouField]
    ? requestClient.put(data.state.url, data.state.form).catch(() => {
        isSuccess = false;
      })
    : requestClient.post(data.state.url, data.state.form).catch(() => {
        isSuccess = false;
      }));
  loading.close();
  if (isSuccess) {
    data.state.show = false;
  }
  return id;
};

// const modelOpen = async (data: any) => {
//   if (data && data.id) {
//     state.form = await requestClient.get(`${state.url}/${data.id}`);
//   } else {
//     state.form = { avtag: true };
//   }
//   state.show = true;
//   formRef?.value?.clearValidate();
// };

interface Ireset {
  state: any;
  formRef: any;
  iouField?: string;
}

// 这个clearValidate感觉有bug,前面需要有await请求才执行，所以对于没有await的，这里模拟了一个假的
export const reset = async (data: Ireset) => {
  await fackFetch();
  data.state.show = true;
  data.formRef?.clearValidate();
};

const fackFetch = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(0);
    }, 1);
  });
};
