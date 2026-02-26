# Teeny Tanks — Attaching a Domain via Route 53

This guide assumes you have already completed `FIRST-DEPLOY.md` and the game is reachable
at your Lightsail static IP on port 80. After completing this guide, the game will be
reachable at your domain over HTTPS.

---

## Overview

```
Browser (players)
      |
      | HTTPS :443
      v
   nginx  ──→  Let's Encrypt TLS certificate
   /    \
  /      \
static    /socket.io/ (WebSocket proxy)
files          |
               v
          Node.js :3001
```

---

## Step 1 — Get a domain name

Choose one of the two paths below depending on your situation.

### Path A — Register a new domain through Route 53 (recommended)

1. In the AWS Console, go to **Route 53** → **Registered domains**.
2. Click **Register domains**.
3. Type your desired domain name into the search box and click **Search**.
4. Pick an available domain from the results and click **Select** → **Proceed to checkout**.
5. Fill in your registrant contact details and complete the purchase.
6. Wait for the registration to complete — this usually takes **5–15 minutes** for common
   TLDs (`.com`, `.social`, etc.) but can take up to an hour. You will receive a
   confirmation email when it is done.

Route 53 automatically creates a **hosted zone** and configures the nameservers for you.
You do not need to do anything else — skip ahead to **Step 2**.

---

### Path B — You already have a domain registered elsewhere

If your domain is registered with another provider (GoDaddy, Namecheap, etc.):

1. In the AWS Console, go to **Route 53** → **Hosted zones**.
2. Click **Create hosted zone**.
3. Enter your domain name (e.g., `teenytanks.social`) and click **Create hosted zone**.
4. Route 53 will show you **4 NS (nameserver) records** for the new zone.
5. Log in to your domain registrar and find the **Nameservers** setting for your domain.
6. Replace the existing nameservers with the 4 NS values from Route 53
   (they look like `ns-123.awsdns-45.com`).
7. Save. Nameserver changes can take a few minutes to a few hours to propagate.

---

## Step 3 — Create an A record pointing to your Lightsail static IP

1. Inside your Route 53 hosted zone, click **Create record**.
2. Configure the record:
   - **Record name**: leave blank (for the root domain) or enter `www` for a subdomain
   - **Record type**: `A`
   - **Value**: your Lightsail static IP (e.g., `54.196.95.235`)
   - **TTL**: `300` (5 minutes is fine)
3. Click **Create records**.

If you want both `teenytanks.social` and `www.teenytanks.social` to work, create two A records —
one with the name blank and one with the name `www`, both pointing to the same IP.

---

## Step 4 — Update your nginx config to use the domain name

SSH into your Lightsail instance and edit the nginx config:

```bash
sudo nano /etc/nginx/sites-available/teeny-tanks
```

Change the `server_name` line from `_` to your actual domain:

```nginx
server_name teenytanks.social;
```

Save and exit (Ctrl+O, Enter, Ctrl+X), then test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5 — Open port 443 in the Lightsail firewall

HTTPS runs on port 443. You need to allow it through Lightsail's firewall before Certbot
can obtain a certificate.

1. In the Lightsail console, click on your instance.
2. Go to the **Networking** tab.
3. Under **IPv4 firewall**, click **Add rule**.
4. Set **Application** to `HTTPS` (port 443) and click **Create**.

---

## Step 6 — Install Certbot and get a TLS certificate

Certbot gets you a free certificate from Let's Encrypt and automatically configures nginx
to use it.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d teenytanks.social
```

Follow the prompts:
- Enter your email address (used for renewal reminders)
- Agree to the terms of service
- Choose whether to share your email with the EFF (optional)

Certbot will:
1. Verify you own the domain (via HTTP challenge — this is why port 80 must still be open)
2. Obtain and install the certificate
3. Automatically update your nginx config to enable HTTPS and redirect HTTP → HTTPS
4. Install a cron job that auto-renews the certificate before it expires (certificates last
   90 days; renewal is automatic)

---

## Step 7 — Verify it works

Open a browser and navigate to your domain:

```
https://teenytanks.social
```

You should see the Teeny Tanks lobby with a padlock in the address bar. HTTP requests
(`http://teenytanks.com`) should automatically redirect to HTTPS.

---

## Troubleshooting

**Certbot fails with "Could not resolve host" or "Connection refused"**
- DNS has not propagated yet. Wait a few minutes and try again.
- Confirm the A record exists in Route 53 and points to the right IP.
- Test with: `dig teenytanks.social A` — you should see your static IP in the answer.

**Site loads over HTTP but not HTTPS after Certbot**
- Make sure port 443 is open in the Lightsail firewall (Step 5).
- Run `sudo nginx -t` to check for config errors.

**Certificate renewal**
Certbot installs a systemd timer that handles renewal automatically. To test it manually:
```bash
sudo certbot renew --dry-run
```
