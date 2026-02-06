#!/bin/bash

set -e  # 遇到错误立即退出

echo "🚀 XOVIS 安装和运行脚本"
echo "================================"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ 未找到 pnpm，请先安装 pnpm:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ 找到 pnpm: $(pnpm --version)"

# 配置国内镜像（自动检测并配置）
echo ""
echo "🌐 配置 npm 镜像源..."
CURRENT_REGISTRY=$(pnpm config get registry 2>/dev/null || echo "")
CHINA_REGISTRY="https://registry.npmmirror.com"

if [ -z "$CURRENT_REGISTRY" ] || [ "$CURRENT_REGISTRY" != "$CHINA_REGISTRY" ]; then
    echo "📦 设置使用国内镜像源: $CHINA_REGISTRY"
    pnpm config set registry $CHINA_REGISTRY
    echo "✅ 镜像源配置完成"
else
    echo "✅ 已使用国内镜像源"
fi

# 步骤1: 安装依赖
echo ""
echo "📦 步骤 1/3: 安装依赖..."
echo "这可能需要几分钟时间，请耐心等待..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 步骤2: 构建核心库
echo ""
echo "🔨 步骤 2/3: 构建核心库..."
cd packages/core
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ 核心库构建失败"
    exit 1
fi

echo "✅ 核心库构建完成"
cd ../..

# 步骤3: 启动开发服务器
echo ""
echo "🌐 步骤 3/3: 启动开发服务器..."
echo "================================"
echo "开发服务器将在 http://localhost:3000 启动"
echo "按 Ctrl+C 停止服务器"
echo ""

cd packages/web
pnpm dev
