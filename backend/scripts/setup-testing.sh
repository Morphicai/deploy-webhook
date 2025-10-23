#!/bin/bash

# 测试环境设置脚本
# 用于快速设置测试环境

set -e  # 遇到错误立即退出

echo "🚀 Deploy Webhook 测试环境设置"
echo "=================================="
echo ""

# 检查 Node.js
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js (>=18)"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"
echo ""

# 检查 npm
echo "📦 检查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm 版本: $NPM_VERSION"
echo ""

# 检查 Docker
echo "🐳 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ 未找到 Docker，请先安装 Docker"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "❌ Docker 未运行，请启动 Docker"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
echo "✅ Docker 版本: $DOCKER_VERSION"
echo ""

# 安装依赖
echo "📥 安装测试依赖..."
npm install
echo "✅ 依赖安装完成"
echo ""

# 创建测试数据目录
echo "📁 创建测试数据目录..."
mkdir -p data/test
echo "✅ 测试数据目录创建完成"
echo ""

# 清理旧的测试容器（如果有）
echo "🧹 清理旧的测试容器..."
TEST_CONTAINERS=$(docker ps -a --filter "name=test-" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$TEST_CONTAINERS" ]; then
    echo "   发现 $(echo "$TEST_CONTAINERS" | wc -l) 个测试容器，正在清理..."
    echo "$TEST_CONTAINERS" | xargs docker rm -f 2>/dev/null || true
    echo "✅ 测试容器清理完成"
else
    echo "✅ 没有需要清理的测试容器"
fi
echo ""

# 运行测试（可选）
echo "🧪 是否立即运行测试？(y/n)"
read -r RUN_TESTS

if [ "$RUN_TESTS" = "y" ] || [ "$RUN_TESTS" = "Y" ]; then
    echo ""
    echo "运行测试..."
    echo "=================================="
    npm test
else
    echo ""
    echo "跳过测试运行"
fi

echo ""
echo "=================================="
echo "✅ 测试环境设置完成！"
echo ""
echo "📚 接下来你可以："
echo "   npm test              - 运行所有测试"
echo "   npm run test:watch    - 监听模式（推荐）"
echo "   npm run test:coverage - 生成覆盖率报告"
echo ""
echo "📖 查看文档："
echo "   TESTING_QUICKSTART.md - 快速开始指南"
echo "   TESTING_GUIDE.md      - 完整测试指南"
echo ""
echo "Happy Testing! 🚀"

