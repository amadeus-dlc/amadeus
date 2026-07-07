# Security Design — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Security Boundary

U3はtargetを読むだけの境界として設計する。`security-requirements.md` の通り、manifest、sentinel existence、md5、target path は安全判断の入力であり、U3はtarget files、backup、manifestを一切書かない。書き込み順序は `business-logic-model.md` の manifest write ownership に従い、U5 apply 後の Application Service が所有する。

## Manifest Trust Model

`ManifestReader` は `amadeus/.installer/amadeus-setup-manifest.json` を読んでも、schema validation に成功するまで信頼しない。

| Condition | Result |
|---|---|
| valid schema and requested harness absent | `manifest-installed` with inferred harness |
| valid schema and requested harness matches | `manifest-installed` |
| valid schema and requested harness conflicts | validation error and no-write |
| invalid/unreadable manifest | not `manifest-installed`; sentinel fallback |
| manifest path missing | sentinel fallback |

manifest file entries は portable relative path のみ許可する。absolute path、up-level path、empty path、separator-only path は schema validation で拒否する。

## Input Validation

`PathPolicy` は filesystem path と manifest path を分離する。target root と manifest location は platform path API で解決し、manifest内の file path は normalized relative path として扱う。これにより path traversal と platform-specific separator ambiguity を避ける。

`PromptPort` は `kiro` / `kiro-ide` ambiguity のみで使う。prompt がない、または prompts not allowed の場合、`TargetDetector` は `ambiguous-harness` を返し、no-write にする。

## Data Handling

`TargetSnapshot` は path、exists、md5 のみを保持する。file contents、secret-like contents、target local configuration の本文は保持しない。read error diagnostics は path と error class に限定し、内容や長いOSエラーメッセージをそのまま出さない。

md5は安全性のための暗号署名ではなく、同一性比較用のintegrity metadataとして扱う。信頼性のある署名や provenance validation が必要になった場合は、U2 distribution source と release pipeline 側で別途設計する。

## No-Write Controls

- `detectTarget` と `snapshotTarget` の dependency は read method のみを持つ port に分離する。
- fake filesystem tests で write method が呼ばれないことを検証する。
- invalid manifest は repair しない。
- unsupported layout は migration しない。
- ambiguity 解決に失敗した場合は分類結果だけ返し、Application Service が報告する。

## Compliance And Auditability

U3は個人情報や規制対象データを処理しない。ただしlocal target pathとfile hashesを扱うため、diagnostics は最小化する。audit可能性は、classification reason、manifest validation result、ambiguous candidate list、unknown md5 count で確保する。

## Upstream Coverage

- `performance-requirements.md`: security checks は bounded read の範囲内で実行する。
- `security-requirements.md`: manifest schema validation、harness mismatch no-write、path traversal拒否、content leakage禁止を設計した。
- `scalability-requirements.md`: fixed sentinel set と expected-file snapshot に限定し、security checkでfull scanを導入しない。
- `reliability-requirements.md`: invalid/unreadable manifest fallback、ambiguous-harness no-write、unknown md5 representation を保持する。
- `tech-stack-decisions.md`: `ManifestStorePort`、`FileSystemPort`、optional `PromptPort`、binary md5 を採用する。
- `business-logic-model.md`: manifest-first detection、sentinel fallback、snapshot workflow、manifest write ownership の境界に従う。
