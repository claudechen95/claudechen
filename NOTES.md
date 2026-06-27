# Admin Notes

## Delete guestbook entries

```bash
# Get entry IDs
curl https://claudechen.me/api/guestbook

# Delete by ID (one or more)
curl -L --location-trusted -X DELETE 'https://claudechen.me/api/guestbook' \
  -H 'Authorization: Bearer <ADMIN_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{"ids": ["abc123", "def456"]}'
```

`ADMIN_SECRET` is in Vercel → Settings → Environment Variables.
