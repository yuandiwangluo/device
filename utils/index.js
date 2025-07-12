const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");

/**
 * @description 获取本地计算机的ip地址和mac地址
 * @returns {object} { ipAddress, macAddress }
 */
/**
 * @description 获取本地计算机的ip地址和mac地址，优先有线网卡，其次无线
 * @returns {object} { ipAddress, macAddress }
 */
function getLocalIPMAC() {
  const osType = os.type();
  const netInfo = os.networkInterfaces();
  let storeVar = {
    ipAddress: "",
    macAddress: ""
  };

  switch (osType) {
    case 'Windows_NT':
      for (let dev in netInfo) {
        // 优先匹配有线网卡（本地连接 / 以太网）
        if (dev === '本地连接' || dev === '以太网') {
          for (let j = 0; j < netInfo[dev].length; j++) {
            if (netInfo[dev][j].family === 'IPv4') {
              storeVar.ipAddress = netInfo[dev][j].address;
              storeVar.macAddress = netInfo[dev][j].mac;
              return storeVar; // 找到后直接返回
            }
          }
        }
      }

      // 有线未连接，尝试查找无线网卡（WLAN）
      if (!storeVar.ipAddress) {
        for (let dev in netInfo) {
          if (dev === 'WLAN') {
            for (let k = 0; k < netInfo[dev].length; k++) {
              if (netInfo[dev][k].family === 'IPv4') {
                storeVar.ipAddress = netInfo[dev][k].address;
                storeVar.macAddress = netInfo[dev][k].mac;
                return storeVar;
              }
            }
          }
        }
      }
      break;

    case 'Linux':
      const wiredInterfaces = Object.keys(netInfo).filter(
        name => name !== 'lo' && !name.startsWith('vbox') &&
          !name.startsWith('docker') && !name.startsWith('wl')
      );
      if (wiredInterfaces.length > 0) {
        for (const iface of netInfo[wiredInterfaces[0]]) {
          if (iface.family === 'IPv4') {
            storeVar.ipAddress = iface.address;
            storeVar.macAddress = iface.mac;
            return storeVar;
          }
        }
      }

      // 无线接口处理（如 wlan0、wlx...）
      const wirelessInterfaces = Object.keys(netInfo).filter(
        name => name.startsWith('wl')
      );
      if (wirelessInterfaces.length > 0) {
        for (const iface of netInfo[wirelessInterfaces[0]]) {
          if (iface.family === 'IPv4') {
            storeVar.ipAddress = iface.address;
            storeVar.macAddress = iface.mac;
            return storeVar;
          }
        }
      }
      break;

    case 'Darwin':
      // 优先 en0（通常是有线），如果为空再试 awdl0 或其他无线设备（可扩展）
      for (let o = 0; o < netInfo.en0?.length; o++) {
        if (netInfo.en0[o]?.family === 'IPv4') {
          storeVar.ipAddress = netInfo.en0[o].address;
          storeVar.macAddress = netInfo.en0[o].mac;
          return storeVar;
        }
      }

      // 尝试无线接口如 awdl0（可根据实际设备扩展）
      if (netInfo.awdl0) {
        for (let o = 0; o < netInfo.awdl0.length; o++) {
          if (netInfo.awdl0[o].family === 'IPv4') {
            storeVar.ipAddress = netInfo.awdl0[o].address;
            storeVar.macAddress = netInfo.awdl0[o].mac;
            return storeVar;
          }
        }
      }
      break;

    default:
      break;
  }

  // 最终未找到任何 IP 地址
  if (!storeVar.ipAddress) {
    console.warn("未检测到有效的网络连接");
  }

  return storeVar;
}

function getLocalSNCode() {
  return require('os').hostname();
};

/**
 * 解析lpinfo输出，提取direct连接URI
 * @param {string} output lpinfo -v命令的输出
 * @returns {string} 提取的direct连接URI，若未找到则返回空字符串
 */
function parseLpinfoOutput(output) {
  const lines = output.split('\n');
  const directLine = lines.find(line => line.startsWith('direct '));

  if (!directLine) {
    throw new Error('未找到direct连接的打印机');
  }

  // 提取direct后的URI部分
  const uri = directLine.replace('direct ', '').trim();
  if (!uri) {
    throw new Error('direct连接URI为空');
  }

  return uri;
}

/**
 * @name 检测打印机连接状态
 * @name 执行lpinfo命令并提取direct连接参数
 * @returns {Promise<{directURI: string, error: string|null}>} 包含direct连接URI或错误信息
 */
function detectionPrinterConnect() {
  return new Promise((resolve, reject) => {
    // 执行lpinfo -v命令
    exec('lpinfo -v', (error, stdout, stderr) => {
      if (error) {
        resolve({ directURI: '', connectStatus: false, error: `命令执行失败: ${error.message}` });
        return;
      }

      if (stderr) {
        resolve({ directURI: '', error: stderr, connectStatus: false, });
        return;
      }

      try {
        // 解析输出，提取direct连接参数
        const directURI = parseLpinfoOutput(stdout);
        resolve({ directURI, error: null, connectStatus: true });
      } catch (parseError) {
        resolve({ directURI: '', connectStatus: false, error: parseError.message });
      }
    });
  });
}

/**
 * @name 命令执行器
 * @returns {Promise<{stdout, stderr}>} {stdout, stderr} - 执行结果
 */
function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行命令失败: ${error.message}`);
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * @name 清空公共图片文件夹
 */
function clearPublicImages() {
  const downloadDir = path.resolve(__dirname, '../public/images');
  if (fs.existsSync(downloadDir)) {
    console.log(`正在删除旧目录: ${downloadDir}`);
    fs.rmSync(downloadDir, { recursive: true, force: true });
    console.log(`✅ 已删除旧目录: ${downloadDir}`);
  }
};

module.exports = {
  getLocalIPMAC,
  getLocalSNCode,
  detectionPrinterConnect,
  execAsync,
  clearPublicImages
};
