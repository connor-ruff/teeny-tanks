# Teeny Tanks — First Deployment on AWS Lightsail

This guide walks you through deploying Teeny Tanks for the first time on an AWS Lightsail
Linux instance. After completing it, your game will be reachable at your instance's public
IP address on port 80. Future updates are handled by the `redeploy.sh` script in this folder.

---

## Overview of what you are building

```
Browser (players)
      |
      | HTTP :80
      v
   nginx
   /    \
  /      \
static    /socket.io/ (WebSocket proxy)
files          |
(client/       v
 dist/)   Node.js :3001  (PM2-managed game server)
```

nginx serves the compiled client files and proxies WebSocket connections to the Node.js
game server. The game server port (3001) is never exposed publicly.

---

## Step 1 — Create a Lightsail instance

1. In the AWS Console, go to **Lightsail**.
2. Click **Create instance**.
3. Choose **Linux/Unix** platform, **OS Only** blueprint, **Ubuntu 22.04 LTS**.
4. Choose a plan. Recommended: **$10/month (1 GB RAM, 2 vCPUs, 40 GB SSD)**.
   The extra RAM is needed for building the app with TypeScript + Vite. You can use the
   $5/month plan but you must add swap (covered in Step 6).
5. Give the instance a name (e.g., `teeny-tanks`) and click **Create instance**.
6. Wait about 60 seconds for the instance to reach **Running** state.

---

## Step 2 — Attach a static IP

Without this, your instance's IP changes whenever it restarts.

1. In the Lightsail sidebar, click **Networking**.
2. Click **Create static IP**.
3. Attach it to your `teeny-tanks` instance.
4. Note the static IP address — this is the address players will use to reach your game. (54.196.95.235)

---

## Step 3 — Open port 80 in the Lightsail firewall

1. Click on your `teeny-tanks` instance to open its detail page.
2. Go to the **Networking** tab.
3. Under **IPv4 firewall**, click **Add rule**.
4. Set **Application** to `HTTP` (port 80), click **Create**.
5. Port 22 (SSH) should already be open. Port 3001 does NOT need to be opened — it is
   internal only.

---

## Step 4 — Connect via SSH

From the Lightsail instance detail page, click the **Connect using SSH** button to open a
browser-based terminal. Alternatively, use your own SSH client:

```bash
ssh -i ~/.ssh/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP
```

All remaining steps are run inside this SSH session.

---

## Step 5 — (Optional) Add a swap file

Skip this if you chose the 1 GB+ plan. Required if using the 512 MB ($5) plan so the
build does not run out of memory.

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 6 — Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v22.x.x
npm --version    # should print 10.x.x
```

---

## Step 7 — Install PM2

PM2 keeps the Node.js game server running in the background and restarts it automatically
if it crashes or the machine reboots.

```bash
sudo npm install -g pm2
```

---

## Step 8 — Install nginx

```bash
sudo apt-get install -y nginx
```

---

## Step 9 — Clone the repository

Replace the URL below with your actual GitHub repo URL.

```bash
cd ~
git clone https://github.com/connor-ruff/teeny-tanks.git
cd teeny-tanks
```

If your repository is private, you will need to authenticate. The easiest way is to use a
GitHub Personal Access Token:

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/teeny-tanks.git
```

---

## Step 10 — Install dependencies and build

```bash
cd ~/teeny-tanks
npm install
npm run build
```

This compiles the shared TypeScript package, the server, and the Vite client bundle in
that order. It will take 30-90 seconds. The built client files end up in
`packages/client/dist/` and the server in `packages/server/dist/`.

---

## Step 11 — Start the game server with PM2

```bash
cd ~/teeny-tanks
pm2 start packages/server/dist/index.js --name teeny-tanks
pm2 save
```

Then generate the systemd startup hook so PM2 (and your game server) restarts automatically
after a machine reboot:

```bash
pm2 startup
```

PM2 will print a command that starts with `sudo env PATH=...`. Copy that exact command and
run it. It will look something like:

```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Verify the server is running:

```bash
pm2 status
# Should show teeny-tanks with status "online"
pm2 logs teeny-tanks --lines 20
# Should show: Teeny Tanks server listening on port 3001
```

---

## Step 12 — Configure nginx

Remove the default nginx config and copy the one from this repo:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo cp ~/teeny-tanks/deploy/nginx.conf /etc/nginx/sites-available/teeny-tanks
```

Enable the config, test it, and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/teeny-tanks /etc/nginx/sites-enabled/
sudo nginx -t
# Should print: syntax is ok / test is successful
sudo systemctl reload nginx
```

> **Note:** If you later run `certbot --nginx` (Step 14), Certbot will modify this file
> to add SSL directives. The canonical version of the nginx config going forward is
> `deploy/nginx.conf` in this repo — keep it in sync with any manual server changes.

---

## Step 13 — Verify it works

Open a browser and navigate to:

```
http://YOUR_STATIC_IP
```

You should see the Teeny Tanks lobby screen. Open a second browser tab (or have a friend
open it) to test multiplayer.

If something is not working, check:

```bash
# nginx error log
sudo tail -f /var/log/nginx/error.log

# Game server log
pm2 logs teeny-tanks

# Is the server running?
pm2 status

# Is nginx running?
sudo systemctl status nginx
```

---

## Step 14 — (Optional) Custom domain + HTTPS

If you have a domain name, point an A record at your static IP. Then install Certbot to
get a free TLS certificate from Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot will automatically update your nginx config to redirect HTTP → HTTPS and reload
nginx (changing `listen 80` to `listen 443 ssl` and adding certificate paths). It also
installs a cron job that renews the certificate before it expires. Do not overwrite
these changes — when updating the nginx config in the future, only add/modify specific
blocks rather than replacing the whole file.

---

## Making future updates

See `redeploy.sh` in this folder. Copy it to the instance and run it whenever you have
pushed new changes to your main branch:

```bash
bash ~/teeny-tanks/deploy/redeploy.sh
```

Or make it executable once and run it directly:

```bash
chmod +x ~/teeny-tanks/deploy/redeploy.sh
~/teeny-tanks/deploy/redeploy.sh
```
