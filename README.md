# TemplateForge Marketplace

Public template catalog for TemplateForge. The repository is designed to be served through jsDelivr after it is pushed to a public GitHub repo.

## jsDelivr URLs

After publishing this repo as `YOUR_GITHUB_USER/templateforge-marketplace`, the manifest URL is:

```txt
https://cdn.jsdelivr.net/gh/obafemiolorungbon/templateforge-marketplace@main/manifest.json
```

Set this in TemplateForge:

```env
TEMPLATEFORGE_MARKETPLACE_MANIFEST_URL="https://cdn.jsdelivr.net/gh/obafemiolorungbon/templateforge-marketplace@main/manifest.json"
```

## Structure

```txt
manifest.json
templates/
  welcome-account@1.0.0.json
  payment-failed@1.0.0.json
  ...
```

`manifest.json` lists packages. Each template package is self-contained and includes MJML, text fallback, variables, and sample payload.

The catalog includes premium transactional templates across onboarding, billing, authentication, commerce, and notifications.

## Template Package Rules

- Use standard Handlebars double braces only, for example `{{first_name}}`.
- Never use unsafe triple braces.
- Include `mjml`, `text`, `variables`, and `sampleVariables`.
- Keep sample payloads fake and generic. Do not include secrets, real user data, or customer-specific brand content.
- Use kebab-case ids and slugs.
