# Build and Test Results — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(検証コマンドの宣言)と `code-summary.md`(unit 単位の実測) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 測定 ref

| 項目 | 値 |
|---|---|
| conductor ツリー | `worktree-intent-2378-autonomy-reachability`、HEAD = `08074d77a`(origin/main を `--no-ff` マージ済み — parent 2 を機械確認) |
| base 対照ツリー | `origin/main` = `b84e4a77d` の detached worktree(scratchpad/bt-base) |
| 実行コマンド | `bash tests/run-tests.sh --ci`(集計コマンド = 同 runner の SUMMARY 出力からの転記) |

## フルスイート実測(conductor ツリー)

| 指標 | 値 |
|---|---|
| Test files | 907 |
| Total assertions | 12,186 |
| Failed files | **3** |
| Failed assertions | **3** |
| runner exit | 3 |

失敗3ファイル: `tests/unit/t17.test.ts` / `tests/integration/t66.test.ts` / `tests/unit/t-runtime-dispatch-seam.test.ts`。

## 失敗3件の帰属 — すべて既存事象(ambient 入力起因)、自変更由来なし

帰属手続きは `cid:build-and-test:bt-20260730-2`(未改変ベースでの同一失敗集合の再現後にのみ環境起因と分類)+ `cid:build-and-test:c1-tsr-ambient-repro-on-base`(per-user の gitignored 外部入力をベース側へ同一値で再現)に準拠。検証は Sonnet サブエージェントが実施し、conductor が assertion 実文まで監査した。

**手順**: (1) base ツリーで `bun run build`(exit 0) → (2) カーソル無しで対象3ファイルを実行 → **全て green**(t17: 85 pass / seam: 9 pass / t66: 1 pass、いずれも 0 fail) → (3) ambient 入力を再現 — `active-intent` カーソル(`260807-autonomy-reachability`)と本 intent の `amadeus-state.md` を byte-copy、runtime-graph.json は生成物のため byte-copy せず base 自身の `compile` で生成(exit 0) → (4) 再実行 → **3件とも conductor と同一の失敗シグネチャで赤**。

| ファイル | 失敗シグネチャの一致 | 機序 |
|---|---|---|
| t17(84 pass / 1 fail) | 期待 `market-research` / 受領 `build-and-test` — 完全一致 | `amadeus-state.ts` の `lookup next-stage` が `readStateFile(pd)` で**アクティブ intent の live state を無条件に読む設計**(per-stage suffix override を尊重する意図的挙動)と、テストの「静的グリッド固定」前提の齟齬。カーソル単独では再現せず(readStateFile が intent dir 不在で fallback)、state.md を与えて初めて再現 — 発火には両方が要る |
| t66(89 pass / 1 fail) | 全10 scope 名・順序とも完全一致 | t17 と**同一機序・同根** — 同じ `lookup next-stage` を全 scope の walk parity へ spawnSync 連鎖するため、1 intent の override が全 scope へ漏れる |
| t-runtime-dispatch-seam(8 pass / 1 fail) | 期待 exit 1 / 受領 0 — 完全一致 | `summary` は runtime-graph.json 不在時に exit 1 の設計。gitignored な生成物が実在すれば exit 0 になる — base 自身の compile 生成でも同一結果 |

**出荷面への非波及**: GitHub CI には per-user カーソルが存在しないため、この3件は本 intent の全 PR(#2492 / #2487 / #2477 / #2524 / #2532)で green だった。赤が出るのは「active intent を持つローカル worktree」だけである。

**既起票の確認**: 3件とも既知でオープン Issue が実在する — [#2464](https://github.com/amadeus-dlc/amadeus/issues/2464)(t17/t66 の ambient workspace 読取)、[#2469](https://github.com/amadeus-dlc/amadeus/issues/2469)(seam の runtime-graph 実在依存)。関連する規範裁定の question として [#2519](https://github.com/amadeus-dlc/amadeus/issues/2519) もオープン。新規起票はしない(pre-filing-dup-and-branch-check)。

**AC 内外の認定**(cid:build-and-test:c2-unconditional-ready-boundary の実文照合): requirements.md の FR-1〜5・NFR-1〜5 のいずれもこの3テストの前提(cursor 無し実行)を名指ししておらず、NFR-3 が要求する blocking gate は PR CI 側で全件 green。したがって3件は **AC 外**であり、`no-silent-scope-narrowing` が縛る「実装時実測」規定項目にも該当しない。

## PR 単位の CI 実績(全マージ着地)

| unit | PR | マージ | CI |
|---|---|---|---|
| u1-autonomy-core | [#2492](https://github.com/amadeus-dlc/amadeus/pull/2492) | 2026-08-08T03:47:04Z | 全 check green |
| u3-question-route-observability | [#2487](https://github.com/amadeus-dlc/amadeus/pull/2487) | 2026-08-08T03:51:30Z | 全 check green |
| u6-plugin-docs-drift | [#2477](https://github.com/amadeus-dlc/amadeus/pull/2477) | 2026-08-08T04:26:43Z | 全 check green |
| u2-birth-declaration | [#2524](https://github.com/amadeus-dlc/amadeus/pull/2524) | 2026-08-08T09:18:57Z | 全 check green |
| u4-conduit-parity | [#2532](https://github.com/amadeus-dlc/amadeus/pull/2532) | 2026-08-08T10:55:40Z | 全 check green(是正2コミット後も失敗ゼロ維持) |
| u5-measurement-report | PR なし(record のみ — N/A の根拠は u5 の pr-convergence-report.md) | — | — |

Coverage(Project/Patch)・complexity・drift の blocking gate はすべて **PR CI を正**として全 PR で通過(NFR-3 充足)。

## 個別検証(補助)

- `bun run build` → exit 0、追跡ファイル不変(source-only 境界)
- `bun run typecheck` / `bun run lint` → 各 unit の PR CI と conductor ツリーの双方で exit 0
- 落ちる実証: t481(BR-U1-1 grep ガード+audit commit 失敗注入)、t482(refusal)、t490/t491(birth 宣言の拒否経路)、t492(導線パリティ — builder と conductor が別面で各1セット)

## 判定

**フルスイートの赤3件はすべて既存・AC 外・既起票**であり、本 intent の変更に起因する失敗はゼロ。詳細の verdict は build-and-test-summary.md に記す。
