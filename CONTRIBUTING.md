# Contributing

This repository contains the Noir Wallet SDK and example app. The extension and documentation site
live in the parent Noir Wallet repository, which includes this repository as a Git submodule.

## Development

```bash
pnpm install
pnpm build
pnpm type-check
pnpm --filter @noir-wallet/example build
```

Run these commands from this repository's root. The parent repository references this repository's
Git commit through the submodule; the former snapshot-sync command no longer exists there.
