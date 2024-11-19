# pnpm
FROM node:22-alpine AS pnpm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
RUN apk add alpine-conf && \
  /sbin/setup-timezone -z Asia/Shanghai && \
  apk del alpine-conf

WORKDIR /app


###################创建 构建容器, 用于编译代码#####################
FROM pnpm AS builder

COPY pnpm-lock.yaml ./
RUN pnpm fetch -P false

COPY . .

RUN pnpm install -P false --offline
RUN pnpm run build


############################## 接口容器 ########################
FROM pnpm AS api 

RUN npm install pm2 -g

COPY --from=builder /app/pnpm-lock.yaml /app/package.json ./
RUN pnpm fetch -P
COPY --from=builder /app/dist ./
RUN pnpm install -P --offline
CMD ["pm2-runtime", "/app/index.cjs"]

