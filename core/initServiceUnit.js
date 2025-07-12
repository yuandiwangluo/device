const config = require("../config/config");
const MqttService = require('../services/MqttService');
const CupsService = require('../services/CupsService');
const download = require('image-downloader');
const { clearPublicImages, detectionPrinterConnect } = require('../utils');
const axios = require('axios')
const fs = require('fs');
const path = require('path');

// * MQTT 服务实例
let mqttService = null;
// * CUPS 服务实例
let cupsService = null;

// 初始化服务
const initServiceUnit = async () => {
  try {
    // * 初始化MQTT服务
    mqttService = new MqttService(config.mqtt);
    // * 初始化CUPS服务
    cupsService = new CupsService(config.printer);

    await mqttService.connect().then(async (res) => {
      await mqttService.reportDeviceStatus({ printerStatus: "maintenance" }); // 立即上报一次状态
    });

    // * 检测打印机连接状态
    let { connectStatus, directURI, error } = await detectionPrinterConnect();
    if (directURI !== "") {
      await cupsService.connect(directURI);
    }

    // * 注册消息处理器 - [接收MQTT服务端发布的打印任务监听]
    mqttService.onMessage("printJob", async (topic, message) => {
      // * 更新状态为"打印中"
      await mqttService.reportDeviceStatus({
        printerStatus: "printing"
      });

      // 执行打印任务
      try {
        const { orderId, imageUrlPrev } = message;
        // 根据 orderId 请求图片列表
        const response = await axios.get('http://47.121.141.176/app/readImages', {
          params: { orderId }
        });
        const imageFilenames = response.data.data[0].imageInfo ?? [];
        if (!Array.isArray(imageFilenames) || imageFilenames.length === 0) {
          throw new Error(`订单 ${orderId} 无图片`);
        }
        // * 创建下载路径
        const downloadDir = path.resolve(__dirname, '../public/images');
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir, { recursive: true });
        }
        // * 下载每张图片
        const downloadedPaths = [];
        for (const filename of imageFilenames) {
          const url = `${imageUrlPrev}${filename.onLineUrl}`;
          const filePath = path.join(downloadDir, filename.fileName);

          // * 下载图片
          await download.image({
            url,
            dest: filePath
          });

          downloadedPaths.push(filePath);
          console.log(`✅ 图片已下载至: ${filePath}`);
        }

        for (const imagePath of downloadedPaths) {
          await cupsService.printFile(imagePath, {
            title: `订单-${orderId}`,
          });
        }

        // * 当打印任务完成后，上报打印机的状态
        await mqttService.reportDeviceStatus({
          printerStatus: "idle"
        });

        // * 清空图片缓存
        clearPublicImages();
      } catch (error) {
        console.error('打印任务执行失败:', error);
        await mqttService.reportDeviceStatus({
          printerStatus: "error"
        });
      };
    });

    // * 注册消息处理器 - [接收MQTT服务端发布的打印机状态查询主题监听]
    mqttService.onMessage("printStatus", async (topic, message) => {
      let { connectStatus, directURI, error } = await detectionPrinterConnect();
      if (error) {
        console.error('检测打印机连接失败:', error);
        return mqttService.reportDeviceStatus({
          printerStatus: "offline"
        });
      }
      if (!connectStatus) {
        // 打印机未连接
        return mqttService.reportDeviceStatus({
          printerStatus: "offline"
        });
      }
      const printerStatus = await cupsService.getPrinterStatus();
      await mqttService.reportDeviceStatus({
        printerStatus
      });
    });

    mqttService.onMessage("cancelPrint", async (topic, message) => {
      await cupsService.cancelAllJobs();
    });
  } catch (error) {
    console.error('服务初始化失败:', error);
    process.exit(1);
  }
};

module.exports = initServiceUnit;
