const { exec } = require("child_process");
const config = require('../config/config');
const MqttService = require('../services/MqttService');
const { execAsync } = require('../utils/index');

// CUPS服务单元类
class CupsService {
  constructor(printerName) {
    this.printerName = printerName.name;   // 打印机名称
    this.cupsInstance = null;              // 创建CUPS客户端实例
    this.connected = false;                // 打印机设备连接状态(true: 已连接, false: 未连接)
    this.jobHistory = [];                  // 打印任务历史记录，可做跟踪所有打印任务的处理
  }

  /**
   * @name 连接CUPS打印服务
   * @returns - CUPS打印服务实例
   */
  async connect(directURI) {
    try {
      if (directURI === "") {
        return;
      }
      const command = `lpadmin -p ${this.printerName} -E -v ${directURI} -P /opt/epson-inkjet-printer-escpr2/share/cups/model/epson-inkjet-printer-escpr2/Epson-L8050_Series-epson-escpr2-en.ppd`;

      // * 执行命令，尝试连接到打印机
      await execAsync(command);

      // * 设置默认打印机
      await execAsync(`lpoptions -d ${this.printerName}`);

      // * 执行命令，查询已经连接到的打印机
      const { stdout } = await execAsync('lpstat -p');
      const printerRegex = new RegExp(`printer\\s+${this.printerName}\\s+is\\s+\\w+`);
      if (printerRegex.test(stdout)) {
        this.connected = true;
        console.log('✅ 打印机 EPSON_L8050 已成功添加并启用');
        return this;
      } else {
        console.warn('❌ 打印机 EPSON_L8050 未找到，请检查添加流程');
        throw new Error('打印机添加失败')
      }
    } catch (error) {
      console.error('❌ 连接CUPS服务失败:', error);
      throw error;
    }
  }

  /**
   * @name 获取打印机状态
   * @returns {Promise<string>} - 打印机状态（idle/printing/disabled/paused/offline/error/notfound/unknown）
   */
  async getPrinterStatus() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const command = `lpstat -p ${this.printerName}`;
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        console.error(`❌ 执行 lpstat -p ${this.printerName} 失败:`, stderr);
        return null;
      } else {
        // * 解析命令输出
        const output = stdout.toLowerCase();
        // * 检查标准状态
        if (output.includes('is idle')) return "idle";             // 空闲
        if (output.includes('now printing')) return "printing";    // 打印中
        if (output.includes('is stopped')) return "stopped";       // 已停止
        // * 检查扩展状态
        if (output.includes('disabled')) return "disabled";        // 已禁用
        if (output.includes('paused')) return "paused";            // 已暂停
        if (output.includes('error')) return "error";              // 错误
        if (output.includes('maintenance')) return "maintenance";  // 需要维护
        // * 检查打印机是否存在
        if (output.includes('no such printer')) {
          console.error(`❌ 未找到打印机: ${this.printerName}`);
          return "notfound";
        }
      }
    } catch (error) {
      console.error('❌ 获取打印机状态失败:', error);
      throw error;
    }
  }

  /**
   * @name 执行打印任务
   * @param {string} filePath - 文件路径
   * @param {object} options - 打印选项
   * @returns {Promise<string>} - 打印任务ID
   */
  async printFile(filePath, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const printTitle = options.title || '打印任务';
      const printPriority = options.priority || 50;
      const command = `lp -d ${this.printerName} -t "${printTitle}" -P ${printPriority} ${filePath}`;
      const { stdout } = await execAsync(command);
      const jobId = stdout.match(/request id is (\S+)/)[1];
      this.jobHistory.push({ // 记录打印任务
        jobId,
        filePath,
        timestamp: new Date()
      });
      console.log(`打印任务已提交，任务ID: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error('打印文件失败:', error);
      throw error;
    }
  }

  /**
   * @name 等待所有打印任务完成后打印订单面单
   * @param {string} filePath - 订单面单文件路径
   * @param {Object} options - 打印选项
   * @returns {Promise<string>} - 面单打印任务ID
   */
  async printOrderReceiptAfterAllJobs(filePath, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      // * 等待当前所有打印任务队列完成
      await this.waitForAllJobsToComplete();
      const receiptJobId = await this.printFile(filePath, {
        title: options.title || "订单面单",
        ...options
      });
      return receiptJobId;
    } catch (error) {
      console.error('订单面单打印失败:', error);
      throw error;
    }
  }

  /**
   * @name 等待当前所有打印任务队列完成
   * @param {number} checkInterval 检查间隔时间（毫秒）
   * @param {number} timeout - 超时时间(毫秒)
   * @returns {Promise<void>} - Promise对象，表示所有打印任务完成
   */
  async waitForAllJobsToComplete(checkInterval = 1000, timeout = 300000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const activeJobs = await this.getActiveJobs();
      if (activeJobs.length === 0) {
        console.log('✅ 所有打印任务已完成');
        return;
      }
      console.log(`等待中... 当前还有 ${activeJobs.length} 个任务在处理`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    throw new Error(`超时: 等待打印任务完成超过 ${timeout / 1000} 秒`);
  }

  /**
   * @name 获取当前活动的打印任务
   * @returns {Promise<Array>} - 活动任务列表
   */
  async getActiveJobs() {
    try {
      const command = `lpstat -o ${this.printerName}`;
      const { stdout } = await execAsync(command);
      // * 解析输出，提取任务信息
      const jobLines = stdout.trim().split('\n');
      return jobLines.filter(line => line.trim() !== '');
    } catch (error) {
      console.error('获取打印队列失败:', error);
      return [];
    }
  }

  // * 获取未完成的打印队列


  /**
 * @name 取消所有打印任务（使用 cancel -a）
 * @returns {Promise<void>}
 */
  async cancelAllJobs() {
    try {
      await execAsync(`cancel -a ${this.printerName}`);
      console.log('✅ 所有打印任务已通过 cancel -a 取消');
    } catch (error) {
      console.error('❌ 取消所有打印任务失败:', error);
      throw error;
    }
  }

  /**
   * @name 断开CUPS服务单元连接
   * @returns void
   */
  disconnect() {
    this.connected = false;
    console.log('CUPS连接已释放');
  }
}

module.exports = CupsService;
