# Code Summary — u8-e2e-acceptance(S1/S2 先行分)

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

- **測定 ref(HEAD SHA)**: `849f8ce0a4597e96e0bb8376825a29e2388a39ce`
- **コード変更**: 0 件(u8 は検証専用 Unit — BR-U8-1)
- **新規成果物**: `e2e-evidence.md`(S5 の実測記録 = E1)、本書、`code-generation-plan.md`

## 到達点

**FR-E1(advisory 到達)** — 機構面は貫通した。`next` が発火点ステージで raise した Advisory が directive JSON の `advisories` フィールドに `{plugin, code, message, stage}` として載り、同文が stderr にも出ることを実測(`never-run` / `changed` の両コード)。`current` 判定では stderr 0 行・フィールド欠落で完全に沈黙することも実測。compose 済み plugin ステージ `formal-model-check` が `--stage` で解決され、`run-model-check` CLI が実 TLC 完全探索(5,203,730 states generated / 529,692 distinct / 0 states left on queue / depth 9、`completion-marker.json` の `complete: true`)から verdict `NOT_DETECTED`(exit 0)を導出することも実測した。

未充足は1点 — audit shard の formal-model-check ステージイベント。`next` は directive を stdout へ出すだけで audit を書かず、`STAGE_STARTED` は conductor の `report`/advance 経路(`amadeus-jump.ts:590-592`)からのみ生まれる。本 Unit のディスパッチは `report` を禁じているため conductor へ引き継ぐ。

**FR-E2(チェックポイント両貫通)** — CP1(requirements-analysis)と CP2(functional-design)の双方で、両コードの Advisory が directive へ載ることを実測。ラッチは `(plugin, code)` キーであり checkpoint 単位ではないため、1 run では最初の1点でしか発火しない(設計どおり)。CP2 単独の観測にはラッチ leaf の消去を要した。

**FR-E3** — u7 Phase B 未着地のため範囲外。

## 最重要の発見(S4-1、未修正・裁定待ち)

spec-hash watcher の watch glob `specs/tla/**` は plugin host root(実運用では `.claude/`)相対で展開されるが、実 spec はプロジェクトルート `specs/tla/` にある。watch 集合が常に空になり、記録される `lastVerdictHash` は空入力の SHA-256(`sha256:e3b0c442...b855`)になる。一度 verdict が記録されると判定は恒久 `current` に固定され、実 spec を変更しても advisory は二度と出ない(実測 STEP1〜STEP7)。

すなわち **FR-E1 の価値チェーン「実 spec 変更 → advisory」は実運用で不通**であり、現状 advisory が出ているのは state ファイル不在(`never-run`)によるものにすぎない。既存テスト 66/66 green はいずれも composition record と spec を同一 fixture host に置くため構造的に検出できない — #1738 (d) が問題視した「機構は green だが価値に届かない」構造そのもので、#1591(CLOSED、compose 書込ルートと engine 読取ルートの乖離)と同クラスの別インスタンスである。

修正には watch root の解決方式(spec のみプロジェクトルート基準 / host root 自体の変更 / spec を plugin 同梱資産へ移動)の決定が要り、u6 の着地契約に波及するため、BR-U8-3 (ii) に従い u8 では実装せず Issue 起票文案を添えて裁定へ回した(詳細と起票文案は `e2e-evidence.md` S4-1)。

## その他の発見

- **S4-2(軽微・docs)**: stage file Step 3 が exit 0 を「detected」、exit 1 を「not-detected」と記すが、CLI は exit 0 に `NOT_DETECTED` を返す。語彙が反転しており読み手が verdict を取り違えうる。
- **S4-3(記録のみ)**: `run-model-check --out` は既存ディレクトリを `OUT_CONFLICT`、親不在を `OUT_PATH` で拒否する(仕様どおりの fail-closed)。ステージ本文に「未作成のパスを渡す」明示がない。
- **S4-4(記録のみ)**: §11a advisory 提示規範は `stage-protocol.md:894-910` に着地済みで追加是正不要。

## 検証

`bun run typecheck` = `0`、`bun run dist:check` = `0`(全ハーネスツリー同期)、`bun test`(t319 / t320 / t321 / t322 / t378 / t381)= `0`(66 pass / 0 fail / 181 expect / 6 files)。実験用の一時ファイル(`.claude/specs/`、`.claude/.amadeus-plugin-activation.json`、advisory latch)と注入した spec 変更はすべて撤去・復元済みで、`git status --porcelain` の残余2件はいずれも本作業開始前に conductor の Bolt fork が書いたもの。`Current Stage` は `code-generation` のまま不変で、本作業は state 前進を行っていない。
