# 打印共享盒

打印共享盒的功能

提供 REST API 服务接口

## 1. CUPS 服务

[cups.md](./markdown/cups.md)

## 2. 项目 package.json 文件重要的配置说明

```json
"scripts": {
  "prd": "pm2 start bin/www --name=node-server --no-autorestart --max-memory-restart 200M",
}
```

参数说明：

- --name=node-server：指定服务名称

- --no-autorestart：禁止 PM2 的自启动（由系统的 systemd 服务单元管理）
