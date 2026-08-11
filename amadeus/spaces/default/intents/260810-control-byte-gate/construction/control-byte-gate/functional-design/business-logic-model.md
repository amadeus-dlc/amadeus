# Business Logic Model — control-byte-gate(Issue #2814)

上流入力(consumes 全数): requirements.md(FR-CBG 各受け入れ基準 → 処理ステップの合否条件)、unit-of-work.md(U1 境界 = 本モデルの範囲)、unit-of-work-story-map.md(コミッター体験 → 診断出力の要件)、components.md(predicate/CLI の責務分離)、component-methods.md(署名契約 — 本書はその内部意味論を確定)、services.md(exit code 契約)

## 処理フロー(単一パス)

```
1. 列挙   : spawnSync("git", ["ls-files", "-z"]) → NUL 区切り path 列
            └ spawn 失敗/非0 exit → 列挙段エラー: メッセージ出力 + exit 1(BR-1)
2. allowlist 前処理: BINARY_ALLOWLIST の各 path が列挙集合に存在するか照合
            └ 不在エントリ → staleAllowlist へ(BR-4)
3. 走査   : 各 path(allowlist 命中は skip)を readFileSync(Buffer) で読取
            └ 読取失敗 → readErrors へ(BR-5、skip しない)
4. 判定   : findControlByte(buffer) — 先頭から最初の違反バイト {offset, byte} を返す(BR-2/3)
5. 集計   : violations / staleAllowlist / readErrors + scannedCount
6. 出力   : 違反 1 件 = 1 行名指し。正常時は scannedCount サマリ 1 行(BR-6)
7. exit   : 3集合すべて空 → 0、いずれか非空 → 1(BR-7)
```

テキストフォールバック(上図の等価記述): 列挙 → allowlist 照合 → 読取 → 判定 → 集計 → 出力 → exit の直列 7 段。分岐は「列挙失敗」「allowlist 命中 skip」「stale」「読取失敗」「違反検出」の5つで、いずれも green への無音合流を持たない(fail-closed)。

## in-process seam の意味論

`runControlByteGate({repoRoot, listFiles?})` は段 2〜5 を担う(段 1 は listFiles 省略時のみ内部 spawn、テストは listFiles 注入で置換 — 本番分岐とテスト分岐は同一コード経路で、注入は port 差し替えのみ)。段 6〜7 は `--check` の CLI main が GateResult から導出する。これにより判定・集計ロジック全行が in-process 計測可能(bun-coverage-spawn-blindspot 回避)。

## 落ちる実証・sweep の運用ロジック(FR-CBG-9/10)

- sweep(clean 実測): `bun tests/control-byte-gate.ts --check` → exit 0 + scannedCount を記録。
- 落ちる実証: working tree の一時ファイルでなく **tracked ファイルへの注入**が必要(ゲートは git ls-files の tracked 集合を読む — 注入面の実測が先行: untracked 新規ファイルは列挙されず赤にならない)。手順: 既存 tracked ファイル1つへ生バイト追記 → --check 赤実測(exit 1 + 名指しメッセージ)→ `git checkout -- <path>` 復元 → バイト走査 0 件 + git status clean を機械確認。コミットは不要(ゲートは working tree の内容を読む — 実装時に read 面を再実測して確定)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:09:03Z
- **Iteration:** 1
- **Scope decision:** none

FD 3成果物は相互整合・fail-closed で FR/NFR 全数へ写像。実コード照合(isUtf8/CONTROL_CHARS の byte 一致・t55 fail-open の否定)成立。落ちる実証の注入面は実装時再実測として適切に留保。FOLLOW-UP(symlink デリファレンス意味論)と NIT(型二重定義リスク)は conductor が BR へ是正済み(実装時実測条項 + BR-11 単一定義規則)。

### Findings

- FOLLOW-UP | business-rules.md:例外・エッジケース — symlink は readFileSync がデリファレンスするため走査内容と tracked blob が乖離しうる(是正済み: 実装時実測条項+mode 120000 棚卸しを BR へ追記)。
- NIT | domain-entities.md vs component-methods.md — Violation/GateResult の形が二重宣言でドリフトリスク(是正済み: BR-11 で domain-entities 形を正本とする単一定義規則を追加)。
- FOLLOW-UP | business-rules.md:BR-6 — NFR-2 の「全件列挙」がファイル粒度である旨は成果物内で既に明示的に解決済み(対応不要の記録)。
