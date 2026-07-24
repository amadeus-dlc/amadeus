# Security Design — U4 ci-integration

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Supply chain

- checkoutと`oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2`を検証済みcommit SHAへ固定する。CI ownerが公式tagを`git ls-remote`で検証し、Bun 1.3.13をreceiptへ記録する。
- Temurin image digestとTLA+ jar URL/SHA-256を固定し、checksum後にnetwork-none containerへread-only mountする。

## Permissions

- job permissionsは`contents: read`、secretなし、write tokenなし、privilegedなしとする。
- event条件を`github.event_name == 'workflow_dispatch'`へ固定し、push/PRでformal stepを起動しない。
