#!/bin/bash

echo "🚀 启动测试环境服务..."
echo "=================================="
echo ""

# 检查并清理端口
echo "🔍 检查端口占用..."
if lsof -i :9001 > /dev/null 2>&1; then
    echo "⚠️  端口 9001 已被占用，正在清理..."
    lsof -i :9001 -t | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  端口 5173 已被占用，正在清理..."
    lsof -i :5173 -t | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 清理测试数据库
echo ""
echo "🧹 清理测试数据库..."
rm -rf backend/data/test/*
echo "✅ 测试数据库已清理"

# 清理测试容器
echo ""
echo "🐳 清理测试容器..."
docker ps -a --filter "name=test-" -q | xargs docker rm -f 2>/dev/null || true
echo "✅ 测试容器已清理"

echo ""
echo "=================================="
echo "✅ 测试环境准备完成！"
echo ""
echo "📝 接下来的步骤："
echo "   1. 在新终端运行: cd backend && NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev"
echo "   2. 在新终端运行: cd ui && VITE_API_BASE_URL=http://localhost:9001 npm run dev"
echo "   3. 在新终端运行: cd ui && npm run test:e2e"
echo ""
echo "或者使用 tmux/screen 在后台运行服务"
echo ""

