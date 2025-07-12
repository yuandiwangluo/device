const mqtt = require("mqtt");
const os = require("os");
const { getLocalIPMAC } = require("../utils/index");

const { ipAddress, macAddress } = getLocalIPMAC();

// MQTT服务单元类
class MqttService {
  constructor(brokerConfig) {
    this.brokerConfig = brokerConfig;                           // MQTT 服务器配置
    this.client = null;                                         // MQTT 客户端实例
    this.isConnected = false;                                   // 连接状态
    this.statusTopic = brokerConfig.statusTopic;                // 打印机状态主题
    this.printTopic = brokerConfig.printTopic;                  // 打印命令主题
    this.reportStatus = brokerConfig.reportStatus;              // 上报当前打印设备和打印机状态
    this.messageHandlers = {};                                  // 消息处理函数
    this.reconnecting = false;                                  // 是否正在重连中
  }

  /**
   * @name 连接 MQTT 服务器
   * @returns void
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected || this.reconnecting) {
        return; // 已连接或正在重连，不重复执行
      }

      const clientId = this.brokerConfig.clientId;
      this.client = mqtt.connect(`mqtt://${this.brokerConfig.host}:${this.brokerConfig.port}`, {
        clientId,
        username: this.brokerConfig.username,
        password: this.brokerConfig.password,
        keepalive: this.brokerConfig.keepalive,
        reconnectPeriod: this.brokerConfig.reconnectPeriod,
        protocolId: this.brokerConfig.protocolId,
        protocolVersion: this.brokerConfig.protocolVersion,
        clean: this.brokerConfig.clean,
        encoding: this.brokerConfig.encoding,
        connectTimeout: this.brokerConfig.connectTimeout
      });

      // * 连接 MQTT 服务端
      this.client.on("connect", () => {
        this.isConnected = true;
        this.reconnecting = false;
        console.log(`*********** 打印机${macAddress}已成功连接到 MQTT Broker ***********`);

        // * 订阅命令主题
        this.client.subscribe(this.printTopic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`主题订阅类目：主题${this.printTopic}订阅成功`)
          } else {
            console.error("订阅命令主题失败：", err);
          }
        })
        this.client.subscribe(this.statusTopic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`主题订阅类目：主题${this.statusTopic}订阅成功`)
          } else {
            console.error("订阅命令主题失败：", err);
          }
        });
        resolve(this.client);
      });

      // * MQTT 服务异常处理
      this.client.on("error", (err) => {
        console.error("MQTT服务异常：", err);
        reject(err);
      });

      // * 接收 MQTT 服务推送消息
      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      // * MQTT 服务断开连接处理
      this.client.on('disconnect', () => {
        this.isConnected = false;
        console.log('******* MQTT连接断开，准备重新连接 *******');
        this.handleReconnect();
      });
    })
  }

  /**
  * @name 处理断线重连逻辑
  */
  handleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(() => {
      console.log('尝试重新连接 MQTT...');
      this.connect(); // 重新连接
    }, 5000); // 5秒后尝试重连
  }

  /**
   * @name 处理接收到的消息
   * @param {string} topic 主题
   * @param {Object} message 消息
   * @returns void
   */
  handleMessage(topic, message) {
    try {
      const msg = JSON.parse(message.toString());
      // 触发外部注册的回调
      if (this.messageHandlers[msg.type]) {
        this.messageHandlers[msg.type](topic, msg);
      } else if (this.messageHandlers.default) {
        this.messageHandlers.default(topic, msg);
      } else {
        console.log(`收到未注册类型的消息: ${msg.type || 'unknown'}`);
      }
    } catch (e) {
      console.error('消息解析失败:', e);
    }
  }

  /**
   * @name 注册消息处理器
   * @description 当收到指定类型的消息时，调用指定的处理函数
   * @param {string} type 消息类型
   * @param {function} handler 处理函数
   * @returns void
   */
  onMessage(type, handler) {
    this.messageHandlers[type] = handler;
  }

  /**
   * @name 上报设备状态信息
   * @description 上报设备状态信息给服务器
   * @param {object} statusData 设备状态信息
   * @returns void
   */
  async reportDeviceStatus(statusData) {
    if (!this.isConnected) {
      this.connect();
    }
    const data = {
      ipAddress: ipAddress || 'unknown',
      macAddress: macAddress || 'unknown',
      ...statusData,
      timestamp: new Date().toISOString()
    };
    this.client.publish(
      this.reportStatus,
      JSON.stringify(data),
      { qos: 1 },
      (err) => {
        if (err) {
          console.error('上报状态失败:', err);
        } else {
          console.log(`设备状态上报成功，设备MAC地址: ${macAddress}`);
        }
      }
    );
  }
}

module.exports = MqttService;
