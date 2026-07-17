# Security Test Instructions — CodeKB hygiene verification handoff

## Security scope

`code-generation-plan.md`と`code-summary.md`はapplication source、dependency、IaC、container、auth、secret storeの変更を0件としている。従って新規SAST / DAST / dependency vulnerability / IaC / container scanの対象はN/Aであり、存在しないruntimeへscan環境を作らない。既存lint、diff、provenance、segregation-of-dutiesを検証する。

## 実行方法とpass condition

- Static quality/security proxy: `bun run lint`がexit 0、blocking error 0。
- Dependency / config surface: Code Generation前のSHAから現在SHAまで、`package.json`、`bun.lock`、TypeScript / Biome / CI configの変更0件。
- Target integrity: 対象2 CodeKB Markdownの変更0件、marker 8 / 8 fieldsが0。
- Secret boundary: 新規成果物にcredential / token / customer payloadを転記しない。
- Provenance: content、ancestry、repository suite、sensor、§13、gate、pushを別fieldで保持する。
- External operation: PR操作、main merge、Issue close、force push、branch protection変更0件。

## STRIDE disposition

Spoofingは有効なhuman / standing grant、Tamperingはfull SHAとsame-SHA counts、Repudiationはtool-owned audit、Information Disclosureは公開技術情報限定、Denial of Serviceは固定2 pathのlocal bounded scan、Elevation of Privilegeはhuman-owned landing境界で制御する。missing / expired / mixed-ref evidenceはgreenへ補正しない。
