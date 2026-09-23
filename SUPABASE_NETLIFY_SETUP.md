# Dashboard Manual Input Online Storage

## 1. Supabase

In Supabase SQL Editor, run `supabase/manual_state_schema.sql`.

## 2. Netlify environment variables

Set these values in Site configuration > Environment variables. Do not place the service-role key in the HTML file.

| Variable | Example |
| --- | --- |
| `SUPABASE_URL` | `https://project-ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret |
| `DASHBOARD_ALLOWED_CIDRS` | `203.0.113.45/32,198.51.100.0/29` |
| `DASHBOARD_SITE_ORIGIN` | `https://your-dashboard.netlify.app` |

`DASHBOARD_ALLOWED_CIDRS` must contain the company public egress IP or CIDR, not an internal address such as `192.168.13.0/24`.

## 3. Deploy

Deploy this folder as the Netlify site root. The configured build runs `netlify-build.mjs` and publishes only the current dashboard and `index.html`; source workbooks and backup HTML files in this folder are not deployed. Netlify automatically deploys `netlify/functions/manual-state.mjs` as `/.netlify/functions/manual-state`.

The dashboard keeps a local browser copy when offline. When served from Netlify, manual entries are loaded from and saved to Supabase through the Netlify Function.
