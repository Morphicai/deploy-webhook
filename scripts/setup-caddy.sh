#!/bin/bash

# Caddy 快速部署脚本
# 用于快速设置和部署 Caddy 反向代理

set -e

echo "🚀 Deploy Webhook - Caddy Setup"
echo "================================"

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script must be run as root (use sudo)" 
   exit 1
fi

# 1. 安装 Caddy
echo "📦 Installing Caddy..."
if command -v caddy &> /dev/null; then
    echo "✅ Caddy is already installed"
    caddy version
else
    echo "Installing Caddy from official repository..."
    
    # Debian/Ubuntu
    if command -v apt-get &> /dev/null; then
        apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
        apt update
        apt install -y caddy
    # CentOS/RHEL/Fedora
    elif command -v dnf &> /dev/null; then
        dnf install -y 'dnf-command(copr)'
        dnf copr enable @caddy/caddy -y
        dnf install -y caddy
    else
        echo "❌ Unsupported OS. Please install Caddy manually:"
        echo "   https://caddyserver.com/docs/install"
        exit 1
    fi
    
    echo "✅ Caddy installed successfully"
fi

# 2. 创建必要的目录
echo "📁 Creating directories..."
mkdir -p /var/log/caddy
mkdir -p /etc/caddy
chown -R caddy:caddy /var/log/caddy

# 3. 配置文件检查
echo "📝 Checking configuration..."
if [ ! -f "./Caddyfile" ]; then
    echo "❌ Caddyfile not found in current directory"
    echo "   Please create a Caddyfile first"
    exit 1
fi

# 4. 配置域名提示
echo ""
echo "⚙️  Configuration Setup"
echo "======================="
read -p "Enter your domain (e.g., example.com): " DOMAIN
read -p "Enter your email for Let's Encrypt: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Domain and email are required"
    exit 1
fi

# 5. 更新 Caddyfile
echo "📝 Updating Caddyfile..."
sed -i.bak "s/example\.com/$DOMAIN/g" Caddyfile
sed -i "s/admin@example\.com/$EMAIL/g" Caddyfile

echo "✅ Caddyfile updated"

# 6. 验证配置
echo "🔍 Validating Caddyfile..."
if caddy validate --config Caddyfile; then
    echo "✅ Caddyfile is valid"
else
    echo "❌ Caddyfile validation failed"
    echo "   Restoring backup..."
    mv Caddyfile.bak Caddyfile
    exit 1
fi

# 7. 复制配置文件
echo "📄 Installing Caddyfile..."
cp Caddyfile /etc/caddy/Caddyfile
chown caddy:caddy /etc/caddy/Caddyfile

# 8. 防火墙配置
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    echo "Detected UFW firewall"
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp  # HTTP/3
    echo "✅ Firewall rules added"
elif command -v firewall-cmd &> /dev/null; then
    echo "Detected firewalld"
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=443/udp  # HTTP/3
    firewall-cmd --reload
    echo "✅ Firewall rules added"
else
    echo "⚠️  No firewall detected. Please manually open ports 80, 443 (TCP and UDP)"
fi

# 9. 启动 Caddy
echo "🚀 Starting Caddy..."
systemctl enable caddy
systemctl restart caddy

# 10. 检查状态
echo "🔍 Checking Caddy status..."
sleep 2
if systemctl is-active --quiet caddy; then
    echo "✅ Caddy is running"
    systemctl status caddy --no-pager -l
else
    echo "❌ Caddy failed to start"
    echo "   Check logs: journalctl -u caddy -n 50"
    exit 1
fi

# 11. DNS 检查提示
echo ""
echo "📋 Next Steps"
echo "============="
echo "1. Ensure your DNS records point to this server:"
echo "   A    deploy.$DOMAIN    -> $(curl -s ifconfig.me)"
echo "   A    api.deploy.$DOMAIN -> $(curl -s ifconfig.me)"
echo "   A    *.apps.$DOMAIN     -> $(curl -s ifconfig.me)"
echo ""
echo "2. Wait a few minutes for certificate generation"
echo ""
echo "3. Test your setup:"
echo "   curl https://deploy.$DOMAIN"
echo ""
echo "4. View logs:"
echo "   journalctl -u caddy -f"
echo "   tail -f /var/log/caddy/*.log"
echo ""
echo "✅ Caddy setup complete!"

