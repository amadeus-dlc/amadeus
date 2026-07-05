# Requirements — engine/validator/swarm のギャップ 3 件（260705-engine-gap-trio）

対象 Issue: [#478](https://github.com/amadeus-dlc/amadeus/issues/478)

## 意図分析

Intent 260705-github-kanban-sync（feature scope、マルチ Unit）の Construction で、swarm・worktree・validator の 3 箇所に契約の穴を検出した（いずれも回避策で通過し、経緯は #478 と当該 record に記録済み）。
本 Intent はその恒久修正を行う。gap ごとに独立して検証可能であり、粒度制約（skill 変更 PR は skill 変更のみ）に従い、エンジン修正（gap1 / gap2）と validator skill 変更（gap3）を別 PR に分割する。

## 機能要求

### gap1: audit-fork の再入（R101〜R103）

- R101: `amadeus-audit.ts audit-fork` は、worktree 側に shard が既存でも、**worktree 側の内容が main 側 shard の先頭部分である（`main.startsWith(wt)` または同一。wt ⊆ main の方向のみ）**場合に再入を許し、AUDIT_FORKED を記録して fork 内容で上書きする（questions Q2 = A、reviewer M2 で方向を確定）。
- R102: 上記以外（worktree 側が main より先行している、交差している、無関係）はすべて分岐として明示エラーで拒否する（監査の喪失防止。wt が先行するケースの許容は、必要になった実例が観察されてから検討する）。
- R103: 再入時の AUDIT_FORKED には再入である旨（Reentrant: true 等のフィールド）を含め、初回 fork と監査上区別できるようにする。

### gap2: worktree slug の正規化（R201〜R203）

- R201: slug の正規化（小文字化）は `amadeus-lib.ts` の単一チョークポイント関数（`normalizeWorktreeSlug` + `worktreePath`）に置き、**独立した slug validator を持つ全 CLI**（`amadeus-worktree.ts` の `validateSlug`、`amadeus-state.ts` の `validateSlug`、`amadeus-lib.ts` の `validateBoltSlug` = audit / runtime / utility 共有）が正規化後の値で検証・受理する（`U001-registry-issues-field` → `u001-registry-issues-field`。reviewer C1 で対象を拡大）。
- R202: 正規化は worktree の派生物（ディレクトリ名、branch 名）と後続 lookup（info / merge / discard、bolt / swarm 経由の参照）で一貫して適用され、大文字入力と小文字入力が同じ worktree を指す。一貫性は R201 の単一チョークポイント + 各 validator の同一関数使用で担保し、eval は `swarm prepare → bolt start --worktree` が通過していた実障害経路の独立 validator（state fork、audit-fork）と worktree info を実 CLI で確認する。
- R204（non-goal）: 大文字小文字違いだけの 2 つの Unit 名が同一の正規化後 slug へ収束するケースの衝突検出は対象外とする（命名規約 `Unnn-<slug>` の連番一意性により実務上発生しない。reviewer m1）。
- R203: 命名規約（project.md）は変更しない（questions Q1 = A。sub の注意点 1 に対する回答として decision に記録済み）。

### gap3: validator の Per unit マルチ Unit 対応（R301〜R303）

- R301: `aidlc-state-contract.ts` は、連続する `Per unit:` 行を**unit の集合**として解釈する（現状は後勝ちで 1 unit のみ）。
- R302: `lifecycle-v2.ts` の per-unit ステージ completed 判定は、集合内の**全 unit** について `construction/<unit>/<stage>/` の produces を検査する（現状は最後の 1 unit のみで検査が弱い）。
- R303: 単一 `Per unit:` 行の既存 record（全既存 Intent）の判定結果は変わらない（後方互換）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI を駆動する（jump-phase-guard / hooks-state-bugfix と同型）。RED 先行。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: エンジン修正は parity-map の engineFileExceptions へ宣言する。新規宣言は `tools/aidlc-audit.ts`、`tools/aidlc-worktree.ts` の 2 件で、`tools/aidlc-state.ts`、`tools/aidlc-lib.ts` は宣言済み（#479 ほか先行修正時）。
- N4: validator 変更は `skills/amadeus-validator` を正とし、`dev-scripts/promote-skill.ts <name> --replace` で昇格、`npm run test:it:promote-skill` を実行する。skill 変更 PR は skill 変更のみで構成する。
- N5: swarm の bolt_dag 静的 batch（完了 batch を除外しない件）は本 Intent のスコープ外とし、#478 に残件として追記する。

## 受け入れ条件

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | phase PR で shard が commit 済みの base から `swarm prepare`（bolt start --worktree ～ audit-fork）が成功する | R101 |
| 2 | 分岐 shard を持つ worktree への audit-fork は拒否される | R102 |
| 3 | `U001-...` 形式の unit 名が、実障害経路の独立 validator（worktree info、state fork、audit-fork）で形式拒否されず、小文字の同一 worktree パスへ解決される | R201 / R202 |
| 4 | 複数 `Per unit:` 行の record で、いずれか 1 unit の produces 欠落を validator が fail として検出する | R301 / R302 |
| 5 | 既存の単一 unit record の validator 判定が変わらない | R303 |
| 6 | 既存検証に退行がない | N2 |
| 7 | PR の diff に `aidlc/spaces/default/memory/project.md` を含まない | R203 |

## スコープ外

swarm bolt_dag の完了 batch 除外（N5 で残件化）、project.md の命名規約変更、#477 / #481 済み事項の再修正。
