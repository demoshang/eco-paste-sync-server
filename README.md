# eco-paste-sync-server

配合 [demoshang/EcoPaste](https://github.com/demoshang/EcoPaste) 实现剪切板同步

## 部署

### docker-compose.yml

```yml
services:
  api:
    restart: unless-stopped
    image: demoshang/eco-paste-sync-server:latest
    environment:
      - NODE_ENV=prod
      - PORT=80
    ports:
      - 改成你想要的端口:80
```

### nodejs

```bash
pnpm build
node dist/index.cjs
```

## 开发

```bash
pnpm i
pnpm start
```

## 接口

### 前置说明

```plain
BASE_URL:     服务器地址，需要前缀https,不需要后缀 /，如 https://demo.com
CLIENT_ID:    客户端ID, 一个客户端每次请求时需要相同，如 D60E28264AC94D0DAE0F9146E7A3ABE7
ROOM_ID：     同步用户组，各个客户端之间配置需要相同, 如 E456A8DB521E452E8BDA3DCDD6B7E4F3
```

### 获取服务器最近一次记录

```bash
curl --request GET \
  --url {{BASE_URL}}/api/sync \
  --header 'x-client-id: {{CLIENT_ID}}' \
  --header 'x-room-id: {{ROOM_ID}}'
```

```json
{
 "type": "text",
 "value": "文本"
}

{
 "type": "image",
 "value": "图片.png"
}

{
 "type": "files",
 "value": "[\"1.pdf\", \"图片.png\"]"
}
```

### 获取文件（当 type 为 image 或者 files 时）

_多个文件需要请求多次，将 i=0 改成 i=1; i=2_

```bash
curl --request GET \
  --url {{BASE_URL}}/api/sync/file?i=0 \
  --header 'x-client-id: {{CLIENT_ID}}' \
  --header 'x-room-id: {{ROOM_ID}}'
```

### 上传内容到服务器

- 上传文本

  ```bash
  curl --request POST \
    --url {{BASE_URL}}/api/sync \
    --header 'Content-Type: multipart/form-data' \
    --header 'x-client-id: {{CLIENT_ID}}' \
    --header 'x-room-id: {{ROOM_ID}}' \
    --form type=text \
    --form 'value=文本'
  ```

- 上传图片

  ```bash
  curl --request POST \
  --url {{BASE_URL}}/api/sync \
  --header 'Content-Type: multipart/form-data' \
  --header 'x-client-id: {{CLIENT_ID}}' \
  --header 'x-room-id: {{ROOM_ID}}' \
  --form type=image \
  --form 'value=图片.png' \
  --form 'blobs=@/root/图片.png'
  ```

- 上传文件

  ```bash
  curl --request POST \
  --url {{BASE_URL}}/api/sync \
  --header 'Content-Type: multipart/form-data' \
  --header 'x-client-id: {{CLIENT_ID}}' \
  --header 'x-room-id: {{ROOM_ID}}' \
  --form type=files \
  --form 'value=["1.pdf", "图片.png"]' \
  --form 'blobs=@/root/1.pdf' \
  --form 'blobs=@/root/图片.png'
  ```

### 变更通知

```js
const source = new EventSource(`${BASE_URL}/api/sync/sse?clientId=${CLIENT_ID}&roomId=${ROOM_ID}`);
// 返回内容和 【获取服务器最近一次记录】相同
```

## 注意事项

1. 自用, 不负任何责任
1. 目前未实现加密, 请注意剪切板同步数据保密
1. 接口未进行诸如账户密码/IP白名单/请求数等限制, 可能存在某些漏洞, 请谨慎使用
