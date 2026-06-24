# Self-hosting FridayRun with Apache and Cloudflare Tunnel

FridayRun stores sensitive personal information, including TFNs. Treat the server, database, backups, and admin account as sensitive systems.

## Recommended Topology

```text
Cloudflare Tunnel -> Apache reverse proxy -> FridayRun Node app -> database
```

The origin server should not expose inbound HTTP/HTTPS ports to the public internet. Let `cloudflared` create the outbound tunnel.

## Required Environment

Set these before first production startup:

```bash
NODE_ENV=production
PORT=3000
APP_ORIGIN=https://fridayrun.example.com
SESSION_SECRET=<long random secret>
SESSION_COOKIE_SECURE=true
TFN_ENCRYPTION_KEY=<32-byte base64 key or 64-character hex key>
ALLOW_PUBLIC_SIGNUP=false
SUPER_ADMIN_FULL_NAME=<your name>
SUPER_ADMIN_ADDRESS=<your address>
SUPER_ADMIN_EMAIL=<your admin email>
SUPER_ADMIN_TFN=<your TFN>
SUPER_ADMIN_PASSWORD=<strong password>
```

Generate a TFN encryption key:

```bash
openssl rand -base64 32
```

Keep `TFN_ENCRYPTION_KEY` stable. If it changes, previously stored TFNs cannot be decrypted.

In production, FridayRun refuses to start unless `SESSION_SECRET`, `TFN_ENCRYPTION_KEY`, and `SUPER_ADMIN_PASSWORD` are explicitly set. Keep public signup disabled unless you intentionally want open account creation.

## Apache Reverse Proxy

Enable proxy modules:

```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo systemctl reload apache2
```

Example virtual host:

```apache
<VirtualHost 127.0.0.1:8080>
  ServerName fridayrun.example.com

  ProxyPreserveHost On
  ProxyPass / http://127.0.0.1:3000/
  ProxyPassReverse / http://127.0.0.1:3000/

  RequestHeader set X-Forwarded-Proto "https"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
</VirtualHost>
```

Bind Apache to localhost for this vhost and point Cloudflare Tunnel to `http://127.0.0.1:8080`.

## Cloudflare Tunnel

Example ingress:

```yaml
tunnel: fridayrun
credentials-file: /etc/cloudflared/fridayrun.json

ingress:
  - hostname: fridayrun.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Add a Cloudflare Access policy for admin users, or for the entire app if this is a private tool.

## Production Checklist

- Use HTTPS through Cloudflare and keep `SESSION_COOKIE_SECURE=true`.
- Keep the server firewall closed to inbound public HTTP/HTTPS.
- Use a strong `SESSION_SECRET`.
- Use a stable, backed-up `TFN_ENCRYPTION_KEY`.
- Encrypt database backups and restrict access to them.
- Restrict super-admin accounts and consider Cloudflare Access MFA.
- Keep Node.js, Apache, `cloudflared`, and npm dependencies patched.
- Prefer PostgreSQL for larger multi-user deployments; SQLite is acceptable only for small, single-server deployments with careful backups.
