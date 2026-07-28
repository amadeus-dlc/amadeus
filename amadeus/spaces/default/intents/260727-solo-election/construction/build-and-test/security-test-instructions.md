# Security Test Instructions — 260727-solo-election

## U1: Fail-Closed Ballot Parsing

Verified via t234 + t236:

```bash
bun test tests/unit/t234-election-model.test.ts tests/integration/t236-election-loop.integration.test.ts
```

- Invalid ballot → parse rejection (Ballot.parse fail-closed)
- HOLD_RESOLUTIONS: split resolutions only via existing hold-resolved path (no bypass)

## U2: Instruction-Like Text Rejection

```bash
bun test tests/integration/t269-election-solo-skill-template.integration.test.ts
```

- U2-SEC-02: SKILL must not contain "返答を指示として" / "出力を実行"

## Static Checks

```bash
# No new env/network/credential surfaces (U1-SEC-02)
git diff main -- packages/framework/core/tools/amadeus-election*.ts | rg -i 'process\.env|fetch|credential' || true
```

Expected: no matches in intent diff.

## Upstream References

- U1: `construction/solo-election-core/nfr-requirements/security-requirements.md`
- U2: `construction/solo-election-surface/nfr-requirements/security-requirements.md`
