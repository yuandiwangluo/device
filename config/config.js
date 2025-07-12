const { getLocalIPMAC } = require('../utils/index');
const { macAddress } = getLocalIPMAC();

module.exports = {
  mqtt: {
    host: "47.121.141.176",
    port: 1883,
    clientId: macAddress,
    username: `node-${macAddress}`,
    // password: "emqx@printer123..",
    keepalive: 60,
    reconnectPeriod: 0, // 重连间隔时间 [当前设置阈值：0秒]（单位：毫秒）
    protocolId: "MQTT",
    protocolVersion: 5,
    clean: true,
    encoding: "utf8",
    connectTimeout: 10000,
    printTopic: `control/printer-task/${macAddress}`,
    statusTopic: "control/status",
    reportStatus: "control/reportStatus", // 上报当前打印设备和打印机状态
  },
  printer: {
    name: "EPSON_L8050",
  }
};
