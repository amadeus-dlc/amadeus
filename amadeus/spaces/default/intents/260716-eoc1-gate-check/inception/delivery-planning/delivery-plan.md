# Delivery Plan — eoc1-gate-check

## 上流入力(consumes 全数)

`../units-generation/unit-of-work.md`(単一ユニット)、`../units-generation/unit-of-work-dependency.md`(edge block)、`../requirements-analysis/requirements.md`(FR-5 停止条件)、`../application-design/component-methods.md`、`../user-stories/stories.md`(US-1〜3)、`../refined-mockups/mockups.md`(M-1〜M-3 契約)。

## Bolt 列(feature スコープ = walking skeleton ON、org.md 既定)

| Bolt | 内容 | ゲート |
|------|------|--------|
| Bolt 1(唯一)| eoc1-gate-guard — lib 述語+state 配線+テスト3系+dist 同期(本機能自体が最小 e2e スライス) | **walking-skeleton 単独ゲート — ユーザー明示承認まで停止**(FR-5/AC-5a、org.md 既定+leader FYI 15:16:23Z(agmsg 出典)の運用下では帰還待ち) |

単一 Bolt につき Construction Autonomy Mode のラダープロンプトは非発生(後続 Bolt なし)。

## マージ・PR

Bolt 1 → PR(スカッシュ)→ CI green+レビュアー READY で auto マージ(現行運用)。着地 grep → #1101 クローズ+ラベル除去。
