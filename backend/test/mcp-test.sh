#!/bin/bash

# MCP 快速测试脚本
# 使用 curl 测试 MCP HTTP/SSE 端点

set -e

# 配置
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 辅助函数
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 检查依赖
check_dependencies() {
    info "Checking dependencies..."
    
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed (optional, for pretty JSON output)"
        warning "Install with: brew install jq"
    fi
    
    success "Dependencies OK"
}

# 测试服务器连接
test_connection() {
    info "Testing server connection..."
    
    if curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
        success "Server is running at $BASE_URL"
    else
        error "Server is not reachable at $BASE_URL"
        error "Make sure to run: npm run dev"
        exit 1
    fi
}

# 测试 MCP Info
test_mcp_info() {
    echo ""
    info "Test 1: MCP Server Info"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    response=$(curl -s "$BASE_URL/api/mcp/info")
    
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi
    
    success "MCP Info retrieved"
}

# 测试 List Tools
test_list_tools() {
    echo ""
    info "Test 2: List Tools (requires API Key)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -z "$API_KEY" ]; then
        warning "Skipped: API_KEY not set"
        echo "  Set API_KEY to run this test:"
        echo "  export API_KEY=your-api-key"
        return
    fi
    
    response=$(curl -s -X POST "$BASE_URL/api/mcp/message" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        }')
    
    if command -v jq &> /dev/null; then
        tool_count=$(echo "$response" | jq '.result.tools | length')
        echo "Found $tool_count tools:"
        echo "$response" | jq -r '.result.tools[] | "  • \(.name) - \(.description | split("\n")[0])"'
    else
        echo "$response"
    fi
    
    success "Tools list retrieved"
}

# 测试 Get Applications
test_get_applications() {
    echo ""
    info "Test 3: Get Applications"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -z "$API_KEY" ]; then
        warning "Skipped: API_KEY not set"
        return
    fi
    
    response=$(curl -s -X POST "$BASE_URL/api/mcp/message" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "get_applications",
                "arguments": {}
            }
        }')
    
    if command -v jq &> /dev/null; then
        content=$(echo "$response" | jq -r '.result.content[0].text')
        app_count=$(echo "$content" | jq -r '.count')
        echo "Found $app_count applications:"
        echo "$content" | jq -r '.applications[] | "  • \(.name) (\(.image):\(.version))"'
    else
        echo "$response"
    fi
    
    success "Applications retrieved"
}

# 测试 Get Domains
test_get_domains() {
    echo ""
    info "Test 4: Get Domains"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -z "$API_KEY" ]; then
        warning "Skipped: API_KEY not set"
        return
    fi
    
    response=$(curl -s -X POST "$BASE_URL/api/mcp/message" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "get_domains",
                "arguments": {}
            }
        }')
    
    if command -v jq &> /dev/null; then
        content=$(echo "$response" | jq -r '.result.content[0].text')
        domain_count=$(echo "$content" | jq -r '.count')
        echo "Found $domain_count domains:"
        echo "$content" | jq -r '.domains[] | "  • \(.domainName) → \(.targetUrl)"'
    else
        echo "$response"
    fi
    
    success "Domains retrieved"
}

# 主函数
main() {
    clear
    echo "╔════════════════════════════════════════════════╗"
    echo "║        MCP Quick Test Script                   ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    
    check_dependencies
    test_connection
    test_mcp_info
    test_list_tools
    test_get_applications
    test_get_domains
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    success "All tests completed!"
    echo ""
    
    if [ -z "$API_KEY" ]; then
        echo "💡 Tip: Set API_KEY to run all tests:"
        echo "   export API_KEY=your-api-key"
        echo "   ./test/mcp-test.sh"
    fi
    
    echo ""
}

# 运行
main

