# Reliability Design — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-requirements/reliability-requirements.md`(RR-1〜4)、`../nfr-requirements/performance-requirements.md`、`../nfr-requirements/security-requirements.md`、`../nfr-requirements/scalability-requirements.md`、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(F-2/F-4)。

## 設計(層別の失敗様式と検出)

| 失敗様式 | 検出・防御機構 | 設計 |
|---|---|---|
| 未知ハーネス名 | parse 拒否 → exit 2+6値列挙(loud、RR-1) | 挙動保存 — fail-open を作らない |
| map entry 追加漏れ | engineDirNameFor の throw(:15-20)+契約テスト literal(2機構、RR-2) | 型検査では検出されない(Record<string,string>)ことを実装者向けに明記済み(domain-entities.md) |
| hook の worktree 誤収束 | KNOWN_HARNESS_DIRS 6値化で rung 2 が opencode/cursor worktree を認識(RR-3) | 検証 = AC-6e テスト1本: opencode/cursor 名 worktree レイアウトを一時 dir に構築し `resolveProjectDirFromHook`(export 済み)の戻り値を behavioral に assert(in-process — spawn 盲点回避)。`hasWorkspaceMarker` は module-private(amadeus-lib.ts:268、export なし)のまま戻り値経由で間接検証し、**新規 export は追加しない**(狭い API 維持 — レビュー Minor-1 反映) |
| インストール中断 | 既存アトミック性へ非接触(RR-4) | 設計変更なし — 触れる必要が生じたら実装前停止 |

## リトライ・フォールバック

導入しない — 全失敗様式が fail-fast で、回復可能エラーの新規発生源がない(エラー分類: いずれも呼び出し元へ即伝播)。

## SLO・アラート

N/A(RR の根拠を継承 — 対象サービス不存在)。
