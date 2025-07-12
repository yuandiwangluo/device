[TOC]

# 系统防火墙

## 1. 简介

在Ubuntu系统中，防火墙是一个重要的安全工具，可以控制网络流量，保护系统免受未经授权的访问。默认情况下，Ubuntu系统安装了ufw（Uncomplicated Firewall）防火墙。以下是一些常用的防火墙命令和端口管理方法。

## 2. 查看防火墙状态

```bash{.line-numbers}
sudo ufw status
```

若防火墙未开启，状态会显示为 "inactive"

## 3. 开启防火墙

> 注意：此命令会终端现有的ssh远程连接会话

```bash{.line-numbers}
sudo ufw enable
```

## 4. 添加端口

```bash{.line-numbers}
# 添加 ssh 远程会话端口
sudo ufw allow 22

# 添加 cups 端口
sudo ufw allow 631

# 添加 http 端口
sudo ufw allow 80

# 重启防火墙，让端口的配置生效
sudo ufw reload

# 查看防火墙状态，确认端口已打开
sudo ufw status

# 可以查看22端口的监听状态
sudo netstat -tulpn | grep 22
```

## 5. 关闭端口

要关闭特定的端口，例如关闭22端口，可使用以下端口：

```bash{.line-numbers}
# 删除22端口的监听
sudo ufw delete allow 22

# 重启防火墙，让端口的配置生效
sudo ufw reload
```

## 6. 开放指定协议的端口

要开放指定协议的端口，例如开放 18001 端口的 TCP 协议，可使用以下命令：

```bash{.line-numbers}
sudo ufw allow 18001/tcp

# 重启防火墙，让端口的配置生效
sudo ufw reload
```

## 7. 关闭指定协议的端口

要关闭指定协议的端口，例如关闭 18001 端口的 TCP 协议，可使用以下命令：

```bash{.line-numbers}
sudo ufw delete allow 18001/tcp

# 重启防火墙，让端口的配置生效
sudo ufw reload
```

## 8. 开放指定IP地址的端口

要开放指定IP地址的端口，例如开放IP地址 192.168.1.100 的计算机访问本机的 18001 端口，可使用以下命令：

```bash{.line-numbers}
sud ufw allow from 192.168.1.100 to any port 18001

# 重启防火墙，让端口的配置生效
sudo ufw reload
```

## 9. 查看 ufw 的状态，查看端口开放列表及状态

```bash{.line-numbers}
sudo ufw status verbose
```
