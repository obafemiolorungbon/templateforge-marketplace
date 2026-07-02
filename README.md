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

## Packs

Packs are curated starter sets defined in `manifest.json` beside the template catalog. A pack references existing templates by stable marketplace template ID:

```json
{
  "id": "saas-starter",
  "name": "SaaS Starter",
  "description": "Authentication, onboarding, trial, and billing templates.",
  "category": "saas",
  "tags": ["saas", "onboarding"],
  "templateIds": ["welcome-account", "email-verification"]
}
```

TemplateForge resolves those IDs at runtime through the same jsDelivr manifest URL. To add or change a pack, update this marketplace repo and run validation before publishing. Do not rename template IDs casually; pack references depend on them. If a replacement template is needed, add the new template package and update the pack in the same change.

## Template Package Rules

- Use standard Handlebars double braces only, for example `{{first_name}}`.
- Never use unsafe triple braces.
- Include `mjml`, `text`, `variables`, and `sampleVariables`.
- Keep sample payloads fake and generic. Do not include secrets, real user data, or customer-specific brand content.
- Use kebab-case ids and slugs.

## Validation

```sh
pnpm validate
```

Validation checks that every manifest template has a matching package and preview, and that every pack references existing template IDs.
