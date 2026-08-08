# Code Summary — u1-autonomy-core

上流入力(consumes 全数): code-generation-plan.md(FR-2a〜2d の逐語受け入れ基準と Step 1〜6)、functional-design/business-rules.md(BR-U1-1〜8 の充足判定)、nfr-design/reliability-design.md(失敗様式4点の注入対応)。

## 着地内容(コミット列 — すべて conductor ブランチ `worktree-intent-2378-autonomy-reachability`)

- `c7d2ec0dc` — FR-2b: `nonAutoDecidedKinds` を集合差で導出・preview へ追加(t483 unit/integration)
- `8afe25dbe` — FR-2c/2d: `applyProductionAutonomyMode` への state 3フィールド書込内部化、`handleSetAutonomy` の書込4行削除(verb 契約不変)、`readAutonomyMode` export、既存テスト3ファイル+fixture 2件の整形(writer 経路化に伴う正当な整形)、t481
- `e5ed888a3` — FR-2a: `INTENT_AUTONOMY_HUMAN_REQUIRED` 新設(登録6面同期: VALID_EVENT_TYPES / EVENT_HEADINGS / REGISTERED_EVENTS / EXPECTED_CANONICAL_COUNT 91 / audit-format.md / 12-state-machine 両言語)、fail-open emit(BR-U1-6)、t482
- 波及是正(conductor コミット): mechanism ratchet 台帳へ t481〜483 登録、count pin 90→91(t28/t81)、イベント列 pin 更新(t115)、rejected 経路の audit assert を「prefix+観測1行のみ許容」へ更新(t247)、fail-open catch の no-silent-drop grant(`01KZF9NRBGK501B11V339CZY2F`、approval 再束縛 213→215)

## 検証実測(exit code は各コマンド単独捕捉)

- `bun run typecheck` 0 / `bun run lint` 0
- 対象テスト(t481/t482/t483 ×2 + event-registry-drift + t28/t81/t115/t247/t413/no-silent-drop 系)全 green
- full CI `bash tests/run-tests.sh --ci` → **RESULT: PASS**(取込・是正後の最終断面)
- `bun run build` 後の追跡ファイル不変(coverage-ratchet の前進 85→86 は別コミットで採用)
- `bun run no-silent-drop -- --base-revision 4a3da7d6…` → 是正前 POLICY_VIOLATIONS(2件)→ grant 後 NO_SILENT_DROP_OK(両側実測)

## 独立レビュー(swarm referee 代替 — read-only reviewer)

- Verdict: **READY**(reviewer-u1b、2026-08-08)
- NIT 1件(t28 タイトル文言 90 のまま)→ 是正済み(91 へ)
- FOLLOW-UP 1件(audit commit 失敗の直接注入が t481/t482 に不在)→ conductor 実測: state 書込は `coordinator.applyHumanCommand` 成功分岐内のみに存在し、t481:175 の provenance 不成立ケースが「commit なし→state 書込なし」の順序を pin 済み。repository commit 失敗の直接注入は残余ギャップとして開示(認可 fail-closed 本体は不変のため非 blocker — reviewer 判定と一致)

## 遅着 verdict の差分吸収(初代 reviewer-u1 — NOT-READY、cid:late-verdict-diff-absorption)

打切り後に遅着した初代 reviewer の NOT-READY verdict(MAJOR 2 / MINOR 1 / NIT 1)を照合し、全件を吸収した:

- **MAJOR 1(CONFIRMED・是正済み)**: BR-U1-1 の「grep で書込点1箇所をテスト固定」が未実装 → t481 に「the canonical write point is unique (BR-U1-1)」を追加(core 全域走査で3フィールドの setter 呼出しが production.ts のみであることを固定)。落ちる実証: amadeus-bolt.ts への一時注入で赤(注入行を名指し)→ 復元・残渣0 → 緑の1セットを実測
- **MAJOR 2(CONFIRMED・是正済み)**: plan Step 5 の「audit commit 失敗」注入が未実装 → t481 に追加。実測で判明した実挙動: commit 失敗は typed error でなく **EACCES 例外の伝播+fatal health latch(FR-EVT-4)** — いずれも fail-closed の loud 形で、state バイト不変・projection 不変・(latch 解除後の)再実行が新規 commit で収束することを固定
- **MINOR(記録)**: FR-2a 受け入れ基準の reason 対応が plan 転記と実装で逆(実測: semi+phase-gate→`SCOPE_OUT`、mode 未設定→`MODE_REQUIRES_HUMAN` — `amadeus-intent-autonomy.ts:732-741` の一次証拠に忠実。t482 内コメントで自己申告済み)。requirements.md:29 の「(ii) SCOPE_OUT 相当」記述は実装に合わせた訂正候補として申し送る(要件文書の遡及編集はしない)
- **NIT(記録)**: state 書込失敗の注入手段は plan の dangling symlink でなく chmod 0o444(t47/t77/t137 既習慣用句)— 同一失敗経路(`writeStateFile` の書込例外)を突いており等価

2代目 reviewer-u1b は READY(NIT 是正済み・FOLLOW-UP は上記 MAJOR 2 の是正で閉包)。両レビューの指摘は相互に矛盾せず、u1b の FOLLOW-UP が u1 の MAJOR 2 と同一箇所を指していた。

## 執行導出の記録(plan「逸脱の扱い」への回答)

- Step 1 の集合差の被減数 = `ALL_INTERACTIONS`、減数 = mode 別 auto 裁定集合(domain-entities.md:35 正本どおり)
- Step 3 の冪等判定述語 = mode 一致 ∧ modeProvenance.kind="human-command" ∧ commandOccurrenceId 一致(BR-U1-3 どおり、t481 で「再実行が transaction を重複発行しない」ことを pin)
