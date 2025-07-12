#!/bin/bash
# 脚本编写者/维护者：xiaomengge
# 脚本版本：1.0
# 脚本功能：获取服务器的 IP 地址和 MAC 地址。

# ================= 脚本解释开始 ============================
# get_ip_and_mac：获取服务器的 IP 地址和 MAC 地址。
# 使用 hostname -I 获取 IP 地址。
# 使用 cat /sys/class/net/wlan0/address 获取 MAC 地址（假设系统内网卡是 eth0 接口，如果使用其他网卡，可以替换为相应的网卡名称）。
# 如果 IP 或 MAC 地址为空，则返回失败（return 1），否则返回成功（return 0）。
# report_data：将获取到的 IP 和 MAC 地址通过 HTTP POST 请求上报到指定接口。

# 使用 curl 将数据以 JSON 格式发送到 API。

# 主循环：
# 每5秒调用 get_ip_and_mac 获取 IP 和 MAC 地址。
# 如果获取成功，就上报数据并停止脚本。
# 如果获取失败，则等待5秒后继续尝试。

# ================= 脚本结束结束 ============================

# ================= 脚本功能开始 ================================
# 1. 添加了日志函数和日志目录创建功能
# 2. 增强了错误处理和日志记录
# 3. 解析接口返回的 JSON 数据
# 4. 根据 success 字段判断上报结果
# 5. 添加了尝试次数限制（10 次）
# 6. 优化了日志格式，便于查看

# ================= 脚本功能结束 ================================

# ================= 脚本使用方法 ================================
# 将这个脚本保存为 report_ip_mac.sh。
# 给予执行权限：chmod +x report_ip_mac.sh。
# 测试执行脚本：./report_ip_mac.sh。

# ================== 配置脚本为系统服务 ========================
# 创建 systemd 服务配置文件
# systemd 服务配置文件需放置在/etc/systemd/system/目录下，命名规则为服务名.service：
# 粘贴以下内容：
    # [Unit]
    # Description=Report IP and MAC Address to cloud Server
    # After=network.target # 确保网络启动后执行该服务
    #
    # [Service]
    # Type=simple
    # User=root # 指定服务运行的用户
    # Group=root # 指定服务运行的用户组
    # WorkingDirectory=/home/user/shell
    # ExecStart=/bin/bash /home/user/shell/report_ip_mac.sh
    # Restart=on-failure
    # 
    # [Install]
    # WantedBy=multi-user.target

# 重载服务
# systemctl daemon-reload

# 启用服务（开机自启动）
# sudo systemctl enable report_ip_mac.service

# 立即启动服务（可选，用于测试）
# sudo systemctl start report_ip_mac.service

# ================= 脚本开始执行 ============================

# 创建日志目录
LOG_DIR="/home/user/logs"
LOG_FILE="$LOG_DIR/ip_mac.log"
mkdir -p "$LOG_DIR"

# 日志函数
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# 获取服务器的IP和MAC地址
get_ip_and_mac() {
    ip=$(hostname -I | awk '{print $1}')
    mac=$(cat /sys/class/net/wlan0/address 2>/dev/null)

    # 检查是否成功获取到IP和MAC地址
    if [[ -z "$ip" || -z "$mac" ]]; then
        log_message "错误: 未获取到IP或MAC地址 - IP:[$ip] MAC:[$mac]"
        return 1 # 获取失败
    else
        log_message "成功获取IP和MAC - IP:[$ip] MAC:[$mac]"
        return 0 # 获取成功
    fi
}

# 上报数据到接口
report_data() {
    local ip=$1
    local mac=$2
    local deviceStatus=1
    local clientid="mqttjs_client_$2"
    local url="http://47.121.141.176:5050/share/receiveNode"

    # 使用 curl 上报数据并捕获返回值
    response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "{\"deviceIp\": \"$ip\", \"deviceMac\": \"$mac\", \"deviceStatus\": \"$deviceStatus\", \"clientid\": \"$clientid\"}")
    curl_status=$?
    
    # 检查 curl 执行状态
    if [[ $curl_status -ne 0 ]]; then
        log_message "错误: curl请求失败，状态码: $curl_status"
        return 1
    fi
    
    # 解析JSON响应
    success=$(echo "$response" | grep -o '"success": *[[:alpha:]]*' | awk -F': ' '{print $2}')
    message=$(echo "$response" | grep -o '"message": *"[^"]*"' | awk -F': ' '{print $2}' | tr -d '"')
    
    # 记录响应结果
    if [[ "$success" == "true" ]]; then
        log_message "上报成功 - 接口返回: $message"
        return 0
    else
        log_message "上报失败 - 接口返回: $message"
        return 1
    fi
}

# 每5秒尝试获取IP和MAC地址，最多尝试10次
max_attempts=10
attempt=1

while [[ $attempt -le $max_attempts ]]; do
    log_message "尝试 $attempt/$max_attempts: 获取IP和MAC地址..."
    
    if get_ip_and_mac; then
        log_message "开始上报数据到接口..."
        if report_data "$ip" "$mac"; then
            log_message "脚本执行完成，上报成功"
            exit 0
        else
            log_message "上报失败，将重试"
        fi
    fi
    
    attempt=$((attempt + 1))
    if [[ $attempt -le $max_attempts ]]; then
        log_message "等待5秒后进行下一次尝试..."
        sleep 5
    fi
done

log_message "错误: 达到最大尝试次数($max_attempts)，脚本退出"
exit 1

# ================= 脚本执行结束 ============================
