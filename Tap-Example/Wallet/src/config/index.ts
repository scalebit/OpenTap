// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const downloadJSON = (data: any, filename = 'data.json') => {
    // 将 JSON 数据转换为字符串
    const jsonStr = JSON.stringify(data, null, 2);

    // 创建一个 Blob 对象来保存 JSON 数据
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // 创建一个下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 移除链接
    document.body.removeChild(link);
  };
