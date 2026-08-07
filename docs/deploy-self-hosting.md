# Self-hosted deployment

This project is a static `Vite + React` site. You do not need GitHub Pages or a
long-running Node.js process in production. The deployment model is:

1. Build the site into `dist/`.
2. Serve `dist/` with Nginx.
3. Point your domain at the server with Cloudflare DNS.
4. Install an origin certificate and switch Cloudflare to `Full (strict)`.

The commands below assume:

- repository path: `/sdb-disk/zyq/lhvisual`
- web root: `/var/www/lhvisual/current`
- domain: `yourdomain.com`

## 1. Server packages

Install the packages you need on the server:

```bash
sudo apt-get update
sudo apt-get install -y nginx rsync certbot python3-certbot-nginx
```

Install Node.js 22 on the server as well, because the repository currently
builds with Node 22 in GitHub Actions.

## 2. Nginx site config

Copy the template into Nginx and replace the placeholder domain:

```bash
sudo cp /sdb-disk/zyq/lhvisual/deploy/nginx/lhvisual.conf.example /etc/nginx/sites-available/lhvisual.conf
sudo editor /etc/nginx/sites-available/lhvisual.conf
```

The only values you must update are:

- `server_name yourdomain.com www.yourdomain.com;`
- `root /var/www/lhvisual/current;` if you choose a different web root

Then enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/lhvisual.conf /etc/nginx/sites-enabled/lhvisual.conf
sudo nginx -t
sudo systemctl reload nginx
```

If the default Nginx site is still enabled and conflicts with this one, remove
it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 3. First deployment

Use the included deployment script:

```bash
cd /sdb-disk/zyq/lhvisual
chmod +x deploy/deploy-static.sh
SITE_ROOT=/var/www/lhvisual/current VITE_BASE_PATH=/ ./deploy/deploy-static.sh
```

What it does:

- runs `npm ci`
- runs `npm run build`
- syncs `dist/` to `/var/www/lhvisual/current`

For later updates, run the same command again.

If dependencies are already installed and you only want a fast redeploy:

```bash
cd /sdb-disk/zyq/lhvisual
SITE_ROOT=/var/www/lhvisual/current VITE_BASE_PATH=/ INSTALL_DEPS=0 ./deploy/deploy-static.sh
```

If you want the script to validate and reload Nginx after syncing files:

```bash
cd /sdb-disk/zyq/lhvisual
SITE_ROOT=/var/www/lhvisual/current VITE_BASE_PATH=/ INSTALL_DEPS=0 RELOAD_NGINX=1 ./deploy/deploy-static.sh
```

## 4. Cloudflare DNS setup

Create these records in Cloudflare DNS:

- `A` record, `Name = @`, `IPv4 address = <your server public IP>`
- `A` record, `Name = www`, `IPv4 address = <your server public IP>`

Recommended rollout:

1. Create both records as `DNS only` first.
2. Verify plain HTTP from the server works.
3. Issue the origin certificate with Certbot.
4. Switch both records to `Proxied` after HTTPS works on the origin.

If your server also has IPv6, add matching `AAAA` records.

## 5. Origin HTTPS with Certbot

After DNS resolves to the server, issue a certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

When Certbot finishes, it will update the Nginx config and usually add the
HTTPS server blocks automatically.

You can verify the origin directly:

```bash
curl -I http://yourdomain.com
curl -I https://yourdomain.com
```

## 6. Cloudflare SSL/TLS settings

After the origin certificate is installed:

1. Open `SSL/TLS -> Overview`
2. Set encryption mode to `Full (strict)`

Then open `SSL/TLS -> Edge Certificates` and enable:

- `Always Use HTTPS`
- `Automatic HTTPS Rewrites`

You can leave the default Cloudflare edge certificate in place. Cloudflare will
present that certificate to visitors, while your Nginx server presents the
Let's Encrypt certificate to Cloudflare.

## 7. Recommended Cloudflare record state

After HTTPS is working end-to-end:

- keep the `@` record as `Proxied`
- keep the `www` record as `Proxied`

That gives you Cloudflare's CDN, TLS termination, and DDoS/WAF layer in front
of the server.

## 8. Daily deploy workflow

Every time you update the site:

```bash
cd /sdb-disk/zyq/lhvisual
git pull
SITE_ROOT=/var/www/lhvisual/current VITE_BASE_PATH=/ INSTALL_DEPS=0 RELOAD_NGINX=1 ./deploy/deploy-static.sh
```

If `package-lock.json` changed, run with `INSTALL_DEPS=1` or just omit that
variable.

## 9. Optional cleanup

If you no longer want GitHub Pages involved at all:

- disable Pages in the GitHub repository settings
- remove or stop using `.github/workflows/deploy-pages.yml`
- optionally delete `public/CNAME`

None of those are required for Nginx deployment to work.

## 10. Troubleshooting

### Refreshing a subpage returns 404

Your Nginx config is missing this line in `location /`:

```nginx
try_files $uri $uri/ /index.html;
```

### Cloudflare shows `526`

Cloudflare is trying to use `Full (strict)`, but the origin certificate is
missing, expired, or does not match the hostname.

### Cloudflare shows the old site after deployment

Purge cache in Cloudflare, or wait for cached content to expire.

### Certbot challenge fails

Temporarily switch the Cloudflare DNS records from `Proxied` to `DNS only`, run
Certbot again, then switch them back to `Proxied` after the certificate is
issued.
