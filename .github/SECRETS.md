# GitHub Secrets sozlash

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Misol |
|---|---|
| `SERVER_HOST` | `1.2.3.4` |
| `SERVER_USER` | `root` |
| `SERVER_PASSWORD` | SSH paroli |
| `SERVER_PORT` | `22` (ixtiyoriy) |
| `DASHBOARD_DEPLOY_PATH` | `/root/beshmarket-dashboard` |
| `GH_TOKEN` | GitHub Personal Access Token |
| `NEXT_PUBLIC_API_URL` | `https://api.beshmarket.uz` |

## Server tayyorlash (bir marta)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
npm install -g pm2
pm2 startup   # chiqgan sudo buyrug'ini ishga tushiring

# Loyihani clone
git clone https://github.com/iskanderovv/beshmarket_dashboard.git /root/beshmarket-dashboard
cd /root/beshmarket-dashboard

# .env.local yaratish
echo "NEXT_PUBLIC_API_URL=https://api.beshmarket.uz" > .env.local

# Birinchi deploy
npm ci
npm run build
pm2 start npm --name beshmarket-dashboard -- start
pm2 save
```
