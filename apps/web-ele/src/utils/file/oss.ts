import OSS from 'ali-oss';

import { getOssTokenApi } from '#/api/common/oss';

export const useOssUpload = () => {
  const uploadToOss = async (file: File) => {
    // 1. 获取临时凭证
    const res = await getOssTokenApi();
    // 💡 调试小技巧：确保 data 指向包含 accessKeyId 的那一层
    const credentials = res.data || res; 
    console.log('完整凭证:', JSON.stringify(credentials, null, 2));
    // console.log(credentials, '解析后的凭证');

    console.log('检查凭证字段:', {
  id: credentials.accessKeyId, 
  token: credentials.securityToken,
  bucket: credentials.ossBucketName,
  prefix: credentials.ossDirPrefix
});
    
    // 2. 初始化客户端
    const client = new OSS({
      // ✨ 修正：region 通常取 ossEndPoint 的前缀部分，例如 "oss-cn-beijing"
      // 如果后端直接返了简码，就直接用；如果是 URL，需要处理
      region: credentials.ossEndPoint.replace('.aliyuncs.com', '').replace('https://', ''), 
      accessKeyId: credentials.accessKeyId,
      accessKeySecret: credentials.accessKeySecret,
      stsToken: credentials.securityToken,
      // ✨ 修正：根据截图字段名改为 ossBucketName
      bucket: credentials.ossBucketName,
      // 💡 建议开启，否则无法直传
      secure: true, 
    });

    // 3. 定义路径并上传
  const fullPath = `${credentials.ossDirPrefix}${Date.now()}-${file.name}`;

console.log('最终上传路径:', fullPath);
const result = await client.put(fullPath, file);
    
    // 4. 返回 OSS 地址
    return result.url;
  };

  return { uploadToOss };
};
