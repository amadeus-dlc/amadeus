# Security Design: seam-bridge(U1)

上流入力(consumes 全数): business-logic-model

nfr-requirements は本 scope で SKIP のため設計どおり不在 — セキュリティ要求は requirements.md の FR-2d(trust 3層)・org/construction ガードレールと、business-logic-model の install/drop フロー+FR-2d 関係節から導出する。

## 脅威と対策(compose 時のファイル書換え面)

| 脅威 | 対象フロー | 対策(設計) |
|---|---|---|
| ステージファイル破損(serializer 欠陥) | install/drop の serialize | 不変条件1-3(バイト保存往復・対象外不変・serialize 後再 parse 検証)— roundtrip-mismatch で書き込まない(BR-U1-1〜3) |
| 部分適用(途中失敗の残骸) | compose 全体 | 既存 `createPluginInstallSnapshot` の rollback に相乗り — parse 失敗・serialize 失敗は compose 全体を中止(BR-U1-6) |
| trust 検証の迂回 | run 時 | U1 は plugin stage バイトへ書込 0(BR-U1-11)— O_NOFOLLOW 同一 inode 検証・TrustGrant digest・provenance stamp の各機構に非干渉(business-logic-model の FR-2d 関係節) |
| 書換え面の拡大(将来の乱用) | serialize API | 受理集合を produces seam のみに固定(BR-U1-4 — unsupported-target-seam で fail-closed 拒否)。拡張は明示の設計変更のみ |
| 無音の受理集合変化 | parse | 実ステージ様式で parse 失敗は loud error(無音 skip 禁止 — BR-U1-6)。既存合成バイト形の挙動は byte 単位不変(BR-U1-5、t301) |
| symlink 経由の意図しない書換え | serialize の書込先 | 書込先は host snapshot が列挙した実在パスのみ(snapshot 由来のパス以外へ書かない)。plugin 側の symlink 脱出は既存 `repoFileReader` の realpath 境界(import-closure guard)が別途封鎖 |

## 認可境界

- U1 の全操作は compose/drop の内部 — 人間の install/uninstall 指示(plugin CLI の明示 verb)が起点であり、U1 自身は新たな認可面を作らない
- ゲート(unitCovered)の判定コードへは触れない(C-2 — データ点火のみ。検証劇場を作らない)

## 入力検証

- parse 対象は host workspace のステージファイルのみ(バイト列 → StageFrontmatterDocument のスマートコンストラクタが唯一の入口 — parse-don't-validate)
- seam 値(pr-convergence-report 等)は manifest 由来 — 既存 manifest parse の検証(SAFE 形)に相乗りし、U1 で再検証を二重実装しない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:04:17Z
- **Iteration:** 1
- **Scope decision:** none

seam-bridge の security-design/logical-components は脅威網羅性・NFR比例適用・FDとの結線整合・テスト可能性すべて充足しREADY

### Findings

- FOLLOW-UP | repoFileReader realpath境界の引用にfile:line逐語引用が無い
- FOLLOW-UP | BR-U1-1〜11等のラベル引用にfile:line逐語引用が無い(scope外出典の可能性)
