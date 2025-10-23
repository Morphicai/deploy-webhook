#!/bin/bash

# 测试环境清理脚本
# 清理测试产生的所有资源

set -e

echo "🧹 Deploy Webhook 测试环境清理"
echo "=================================="
echo ""

# 清理测试容器
echo "🐳 清理测试容器..."
TEST_CONTAINERS=$(docker ps -a --filter "name=test-" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$TEST_CONTAINERS" ]; then
    COUNT=$(echo "$TEST_CONTAINERS" | wc -l | tr -d ' ')
    echo "   发现 $COUNT 个测试容器"
    echo "$TEST_CONTAINERS" | xargs docker rm -f 2>/dev/null || true
    echo "✅ 测试容器清理完成"
else
    echo "✅ 没有需要清理的测试容器"
fi
echo ""

# 清理测试数据库
echo "💾 清理测试数据库..."
if [ -d "data/test" ]; then
    rm -rf data/test/*
    echo "✅ 测试数据库清理完成"
else
    echo "✅ 测试数据目录不存在"
fi
echo ""

# 清理覆盖率报告
echo "📊 清理覆盖率报告..."
if [ -d "coverage" ]; then
    rm -rf coverage
    echo "✅ 覆盖率报告清理完成"
else
    echo "✅ 覆盖率报告目录不存在"
fi
echo ""

# 清理悬空镜像（可选）
echo "🖼️  是否清理悬空 Docker 镜像？(y/n)"
read -r PRUNE_IMAGES

if [ "$PRUNE_IMAGES" = "y" ] || [ "$PRUNE_IMAGES" = "Y" ]; then
    echo "   清理悬空镜像..."
    docker image prune -f
    echo "✅ 悬空镜像清理完成"
else
    echo "✅ 跳过镜像清理"
fi
echo ""

echo "=================================="
echo "✅ 测试环境清理完成！"
echo ""
echo "💡 提示："
echo "   - 测试容器已删除"
echo "   - 测试数据库已清空"
echo "   - 覆盖率报告已删除"
echo ""
echo "🚀 运行 npm test 重新开始测试"

