#!/bin/bash

# 脚本功能：
# 首先判断系统接入的网络是否可以连接到外部网络，若网络可以连接到外部网络，则执行以下功能，若未接入外部网络，则退出脚本运行并给出日志输出，说明网络环境无法连接到外部网络的原因，以下功能必须在网络可以连接到外部网络的前提下执行

# 1. 在系统的 /etc/systemd/system/目录下创建 systemctl 服务，并将这个服务文件命名为 start_microservice.service；
# 2. 在 start_microservice.service 服务文件中实现系统自启动脚本，自启动脚本要存放到 /usr/local/bin/目录中，脚本命名为start_microservice.sh，同时要注意这个脚本的权限，必须有可执行权限；
# 3. 将这个服务设置为系统开机自启动；

# 这个脚本内容逻辑如下：

# 1. 检测系统内是否已经安装完成 git 环境，若无 git 工具环境，则在系统内安装 git 工具环境
# 2. 检测系统内是否已经安装完成 NodeJs 环境，若无 NodeJs 环境，则安装 NodeJs@17.2.0 环境
# 3. 修改 NodeJs 的镜像仓库源为阿里云镜像源，命令为：npm config set registry https://registry.npmmirror.com
# 4. 检测系统内是否已经安装完成 pm2 环境，若无 pm2 环境，则安装 pm2 环境
# 5. 使用 git 命令拉取 https://git.code.tencent.com/printController/management-share-server.git 仓库代码到系统的 /usr/local/src 目录下
# 6. 进入到系统的 /usr/local/src/management-share-server 目录下
# 7. 运行 npm install 安装项目依赖包
# 8. 运行 npm run prd 启动项目

# 创建日志文件
LOG_DIR="/var/log"
LOG_FILE="$LOG_DIR/start_microservice.log"
mkdir -p "$LOG_DIR"

# 日志函数
log() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# 错误处理函数
handle_error() {
    log "错误: $1"
    exit 1
}

# 设置环境变量
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export NODE_PATH="/usr/lib/node_modules"

# 检查网络连接
check_network() {
    log "检查网络连接..."
    
    # 尝试连接国内 DNS
    if ! ping -c 3 www.baidu.com &> /dev/null; then
        log "无法连接到外部网络 (无法ping通www.baidu.com)"
        return 1
    fi
    
    log "网络连接正常"
    return 0
}

# 检查并安装Git
install_git() {
    log "检查Git环境..."
    
    if ! command -v git &> /dev/null; then
        log "Git未安装，开始安装..."
        apt-get update
        apt-get install -y git || handle_error "Git安装失败"
        log "Git安装完成"
    else
        log "Git已安装"
    fi
}

# 检查并安装Node.js
install_nodejs() {
    log "检查Node.js环境..."
    
    # 使用 Node.js 18.x LTS 版本
    if ! command -v node &> /dev/null || ! node -v | grep -q "18."; then
        log "Node.js 18.x未安装，开始安装..."
        
        # 添加NodeSource仓库（适用于 Ubuntu 22.04 jammy && debian）
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash - || handle_error "添加Node.js仓库失败"
        
        # 安装Node.js 18.x
        apt-get install -y nodejs || handle_error "Node.js安装失败"
        
        log "Node.js 18.x安装完成"
    else
        log "Node.js 18.x已安装"
    fi
}

# 设置npm镜像源
# 检查并设置npm镜像源为阿里云
set_npm_mirror() {
    log "检查npm镜像源配置..."

    # 获取当前npm镜像源
    current_registry=$(npm config get registry)

    # 判断当前镜像源是否为阿里云
    if [ "$current_registry" = "https://registry.npmmirror.com" ]; then
        log "npm镜像源已设置为阿里云：$current_registry"
    else
        log "当前npm镜像源不是阿里云，正在设置为阿里云镜像源..."
        npm config set registry https://registry.npmmirror.com || handle_error "设置npm镜像源失败"
        log "npm镜像源已成功设置为阿里云"
    fi
}

# 检查并安装pm2
install_pm2() {
    log "检查pm2环境..."
    
    if ! command -v pm2 &> /dev/null; then
        log "pm2未安装，开始安装..."
        npm install -g pm2 || handle_error "pm2安装失败"
        log "pm2安装完成"
    else
        log "pm2已安装"
    fi
}

# 拉取项目代码
clone_project() {
    log "开始拉取项目代码..."
    
    # 创建项目目录
    mkdir -p /usr/local/src
    cd /usr/local/src || handle_error "无法进入项目目录"
    
    # 检查项目目录是否存在
    if [ -d "management-share-server" ]; then
        log "项目目录已存在，尝试更新代码..."
        cd management-share-server || handle_error "无法进入项目目录"
        git pull || handle_error "代码更新失败"
    else
        log "克隆项目代码..."
        git clone https://git.code.tencent.com/printController/management-share-server.git || handle_error "代码克隆失败"
        cd management-share-server || handle_error "无法进入项目目录"
    fi
    
    log "项目代码准备完成"
}

# 安装项目依赖并启动
setup_and_start() {
    log "正在进入项目源目录..."
    cd /usr/local/src/management-share-server || handle_error "无法进入项目目录"

    log "安装项目依赖..."
    npm install || handle_error "依赖安装失败"

    log "正在清理pm2缓存日志..."
    pm2 flush node-server || handle_error "清理 PM2 缓存日志失败"
    log "pm2缓存日志清理完成"

    log "检查 PM2 是否已运行 node-server 实例..."
    
    # 检查是否已经有 node-server 实例在运行
    if pm2 info node-server &> /dev/null; then
        log "检测到 node-server 实例正在运行，正在重启服务..."
        pm2 restart node-server || handle_error "PM2 重启 node-server 失败"
    else
        log "未检测到 node-server 实例，正在启动新服务..."
        npm run prd || handle_error "项目启动失败"
        
        # 可选：保存 PM2 进程列表
        pm2 save || handle_error "保存 PM2 进程列表失败"

        # 可选：生成并启动用 PM2 的systemd 服务配置
        pm2 startup systemd || handle_error "生成并启动用 PM2 的systemd 服务配置失败"
    fi

    log "========= 项目启动成功 ========="
}

# 主函数
main() {
    log "========== 开始执行启动脚本 =========="

    # 刷新服务单元配置
    systemctl daemon-reload

    # 加载系统环境变量
    source ~/.bashrc
    
    # 检查网络连接
    # check_network || handle_error "网络连接失败，退出脚本"
    
    # 安装必要的工具
    # install_git
    # install_nodejs
    # set_npm_mirror
    # install_pm2
    
    # 准备项目代码
    # clone_project
    
    # 设置并启动项目
    setup_and_start
    
    log "========== 启动脚本执行完成 =========="
}

# 执行主函数
main
