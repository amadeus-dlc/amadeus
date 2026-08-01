# Security Test Instructions — formal-verif-value-chain

上流入力(consumes 全数): requirements, nfr-design(各 unit の security-design), code-generation

比例選定(bt-proportional-selection): 実在攻撃面へ trace できる検査のみ。DAST・依存スキャンの機械追加はしない(既存 CI の必須検査は不変)。

## 実施したセキュリティ面の検査

- **パス検証(u4)**: manifest `tools` の parseTools は `expectRelPath`(絶対パス・空セグメント・`.`/`..` 拒否)+`tools/` 配下限定 — 不正パス拒否を t379 で実測(системa 境界の入力検証)。
- **digest 照合(u4)**: compose⇔drop の ownedContentDigests 対称 — 改竄された tools/stage の drop 拒否を t379 で実測(trust grant の維持)。
- **境界ガード(u3)**: t377 が配布4面の repo-only 参照(`scripts/`)0 件を機械保証 — 配布物への非公開パス漏出の恒久検査。
- **TLC 実行の隔離**(u8 e2e 実測): env-receipt 4 件 passed(jar-sha256 pin / network-deny / jdk-snapshot / sandbox-profile)— jar SHA-256 は FIXED_TLC_ARTIFACT_DESCRIPTOR と一致確認。
- **fail-closed 維持**(u5/u6): activation 判定の不明時 never-run 側・model-map v2 の schemaVersion 不一致 loud 拒否 — t320/t322/t-formal-verif-model-map-v2 で実測。

## 生成しなかった検査と根拠

- 認証・認可検査: 対象機能に認証面が存在しない(ローカル CLI・ファイル境界のみ)。
- 依存監査の追加実行: 本 intent は依存を追加していない(bun.lock 無変更)。
