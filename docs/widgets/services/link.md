---
title: Link
description: Static text links without API requests
---

The link widget displays a compact text link on a service card without fetching API data.

```yaml
widgets:
  - type: link
    label: Open dashboard
    href: https://example.com/dashboard
```

Both `label` and `href` are required. HTTP(S), root-relative paths, and fragment
destinations are supported. Links open in a new tab with `noopener noreferrer`.
Multiple link widgets can appear alongside API widgets in the same `widgets` list.