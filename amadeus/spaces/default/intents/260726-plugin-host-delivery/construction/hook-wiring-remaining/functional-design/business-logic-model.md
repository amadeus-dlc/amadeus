# Business Logic Model — U4 hook-wiring-remaining

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U4 行(C4 残面)。requirements FR-3b(残面)の実体 — story-map ジャーニー 1「使い始める」の残ハーネス展開。services.md どおりフック単発実行。

## フロー 1: 対応面の配線(clazz != manual-only)

```
U1 マトリクスの確定列挙(BR-U1-7)から HookWiring[] を構成
  → 各面の wiringPoint(実測済みアダプタ/設定)へ HookInvocation を 1 点追加
      codex / cursor / kimi / kiro / kiro-ide: harness/<name>/hooks/ アダプタ
      opencode: plugin/amadeus-opencode-plugin.ts
      (最終的な対象集合と挿入位置は U1 マトリクスの composeTrigger セルが正 — 本 FD で面を確約しない)
  → 投影(U3)がフック snippet を配布し、self-install ツリーで実効化
```

## フロー 2: 非対応面の degrade(clazz == manual-only、または composeTrigger deferred の面 — BR-U4-4 の 2 軸閉包)

```
DegradeContract を作成
  → 手順書(INSTALL 手順 — U3 の layout に同梱)へ手動 compose 1 コマンドを明記
  → DropsRecord へ advisory エントリを記録(compose 時 — 書き手は compose 経路、U5 分界どおり)
  → doctor に [advisory: auto-compose-trigger missing] が現れる(U5)
```

## フロー 3: 実起動検証(FR-3b 合否 — verification theatre 禁止)

各対応面で native hook を実起動し、compose --if-stale の実行(noop 経路含む)を観測するテストを持つ。実起動がテスト環境で構造的に不能な面は、U1 マトリクスの deferred 記録に従い「文書化された手動 fallback を実行する E2E」(requirements FR-8 合否の同型)で代替し、代替した事実を期待値として固定する(暗黙成功禁止)。

## 実行順(Bolt 内リスク制御)

U3 の投影生成物(フック snippet)着地後に配線(bolt-plan の Bolt 3→6 依存)。面ごとに独立コミットし、1 面の失敗が他面の着地を塞がない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:18:07Z
- **Iteration:** 1
- **Scope decision:** none

配線・degrade・実起動検証・分界は概ね良好。Major 1: マトリクス駆動の 2 軸(clazz vs composeTrigger 測定状態)が未整合で、deferred かつ非 manual-only の面が配線も DegradeContract も受けず沈黙欠落しうる(FR-1/FR-5 違反の芽)。Minor 1: components.md の直接参照欠落。

### Findings

- [Major] deferred-but-not-manual-only 面の沈黙欠落 — BR-U4-4 の発火条件拡張が必要
- [Minor] components.md の逐語参照が本文に不在(装飾トークン気味)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:19:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major は BR-U4-4 の 2 軸閉包+XOR 全数 assert で解消、Minor も components.md C4 引用で解消。新規ギャップなし。

### Findings

- None
