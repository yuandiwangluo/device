[TOC]

# CUPS(Common UNIX Printing System)

cups官网下载地址：[cups](https://www.cups.org/)

## 1. 介绍

CUPS是苹果公司开发的基于标准的开源打印系统。
适用于macOS®和其他类UNIX®操作系统。
CUPS使用互联网打印协议（“IPP”），并提供System V和Berkeley命令行接口，一个web接口和一个C API来管理打印机和打印作业。
它支持打印到本地（并行，串行，USB）和网络打印机，
打印机可以从一台计算机共享到另一台计算机，甚至通过互联网！

在内部，CUPS使用PostScript打印机描述（“PPD”）文件来描述
打印机的功能和特点与各种通用和设备不同
特定的程序转换和打印许多类型的文件。示例驱动程序如下
包括CUPS支持许多Dymo，爱普生，惠普，Intellitech， OKIDATA，和
斑马打印机。更多的驱动程序可以在线使用（在某些情况下）
你的打印机附带的驱动光盘。

## 2. 文档

一旦安装了软件，就可以访问文档(在<http://localhost:631/>上)和使用‘ man ’

命令，例如‘ man cups ’。

## 3. CUPS(Common Unix Printing System)

[CUPS(Common Unix Printing System)](https://openprinting.github.io/cups/index.html)是一个用于打印服务的开源软件，它为Unix-like系统提供了一个灵活、强大的打印服务解决方案。Ubuntu作为一个流行的Linux发行版，内置了对CUPS的支持。

## 4. 安装CUPS

> 在install cups之前，请确保系统已经连接到外部网络。

```bash{.line-numbers}
sudo apt-get update
sudo apt-get install cups

# 若存在依赖缺失，可执行 sudo apt --fix-broken install 修复破损的依赖包
```

安装完成后，CUPS会自动启动并监听631端口，一旦安装了软件，就可以访问文档(在<http://localhost:631/>上)和使用"man"命令，例如"man cups"。

## 5. 配置CUPS

想要通过同一网络内的其他网络设备（笔记本电脑、台式机）访问CUPS的管理平台，需要配置CUPS。

进入CUPS的配置文件：

```bash{.line-numbers}
root@raspberrypi:/etc/cups# vi /etc/cups/cupsd.conf

1)找到
Listen location:631

1)修改为
Listen 0.0.0.0:631

2)找到
# Restrict access to the server...
<Location />
  Order allow,deny
</Location>

2)修改为
# Restrict access to the server...
<Location />
  Order allow,deny
  Allow from all
</Location>

3)找到
# Restrict access to the admin pages...
<Location /admin>
  Order allow,deny
</Location>

3)修改为
# Restrict access to the admin pages...
<Location /admin>
  Order allow,deny
  Allow from all
</Location>

4)找到
# Restrict access to the configuration files...
<Location /admin/conf>
  Order allow,deny
</Location>

4)修改为
# Restrict access to the configuration files...
<Location /admin/conf>
  Order allow,deny
  Allow from all
</Location>

5)找到
# Restrict access to the log files...
<Location /admin/log>
  Order allow,deny
</Location>

5)修改为
# Restrict access to the log files...
<Location /admin/log>
  Order allow,deny
  Allow from all
</Location>
```

## 6. 重启 cups 服务

```bash{.line-numbers}
sudo systemctl restart cups
```

## 7. 配置 cups 服务开机启动

```bash{.line-numbers}
sudo systemctl enable cups
```

## 8. 配置开放 cups 端口

[防火墙配置手册](./Firewalld.md)

```bash{.line-numbers}
sudo ufw allow 631
sudo ufw reload
```

## 9. 访问 CUPS Web 界面

获取到 cups 服务所在的系统IP地址，并在浏览器中访问，比如 http://192.168.1.100:631

## 10. 安装爱普生打印机驱动程序

可到爱普生官网下载对应的打印机驱动程序，将驱动程序文件传输至 linux 开发板内

在下载驱动程序时，需要考虑到开发板 cpu 架构，下载对应架构的驱动程序。

```bash{.line-numbers}
# 查看系统信息的命令
lsb_release -a

# 查看cpu架构的命令
lscpu
```

```bash{.line-numbers}
root@wukongpi:/home/user# dpkg -i epson-inkjet-printer-escpr2_1.2.34_armhf.deb
(Reading database ... 45087 files and directories currently installed.)
Preparing to unpack epson-inkjet-printer-escpr2_1.2.34_armhf.deb ...
Unpacking epson-inkjet-printer-escpr2 (1.2.34) over (1.2.34) ...
Setting up epson-inkjet-printer-escpr2 (1.2.34) ...
Processing triggers for libc-bin (2.31-13+deb11u5) ...
```

安装完成后打印机驱动程序后，可在 /opt/epson-inkjet-printer-escpr2/share/cups/model/epson-inkjet-printer-escpr2 目录下查看驱动程序 .ppd 文件。
