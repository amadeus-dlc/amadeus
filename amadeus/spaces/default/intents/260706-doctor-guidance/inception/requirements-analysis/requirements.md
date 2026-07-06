# Requirements（260706-doctor-guidance）

対象 Issue: [#573](https://github.com/amadeus-dlc/amadeus/issues/573)（導入直後の doctor / installer smoke が新規利用者を誤誘導する）

## 意図分析

導入直後（Intent 未作成）の workspace では、doctor の「workspace shell ready」検査が fail し、fix 誘導が存在しない `dist/` への copy を案内する（実行不能）。installer の smoke は doctor の exit 1 を受けて「installed but smoke check failed」を表示し、正常な状態なのに新規利用者を不安にさせる。実際は初回 intent-birth（workspace-scaffold）が `tools/data/memory-seed/` から shell を seed して解消する。現行構造の把握は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（エンジン層構成・doctor の位置づけ）、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md)（utility verb 面）、[codekb/amadeus/code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)（eval 規約）を上流入力として参照する。

## 再現実測（2026-07-06、隔離 workspace）

導入（`scripts/amadeus-install.ts --target`）→ doctor: `✗ workspace shell ready (.claude/ + amadeus/spaces/default/memory/) — copy the workspace shell from \`dist/claude/\` into your project root`（31 passed, 1 failed）、installer は「installed but smoke check failed」。初回 birth 後 → doctor fail 0。Issue 記載と一致。

## 現行実装の実測

- doctor の shell 検査（amadeus-utility.ts:625 付近）: `harnessDir()` エンジン dir と `amadeus/spaces/default/memory/` の**両方の存在**を 1 検査で判定し、fail 時の fix が `dist/` copy 案内。
- doctor は fail が 1 件でもあると exit 1（amadeus-utility.ts:1757）。
- installer smoke（scripts/amadeus-install.ts:444）: doctor を spawn し exit 0 を pass とする。pass 時は出力を破棄、fail 時は全出力 + 「installed but smoke check failed」。
- 先例: doctor の hook heartbeats 検査は「fresh install（dir 不在）→ pass with advisory label — not drift」の 3 状態設計を既に持つ（amadeus-utility.ts:633 付近のコメント）。

## 機能要求

- FR-1（doctor の shell 検査の 2 状態分離）:
  - FR-1.1: エンジン dir（`harnessDir()`）不在 → 従来どおり fail。fix 文言は実行可能な誘導へ変更する（`dist/` copy ではなく installer の再実行: `bun scripts/amadeus-install.ts --target <workspace>`。配布物に dist/ は存在しないため）。
  - FR-1.2: エンジン dir あり + default memory 不在 → **pass with advisory label**（hook heartbeats の fresh-install 先例と同型）。label は固定 marker 文字列 `workspace shell pending first workflow` で始め、全文を `workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)` とする。installer と eval はこの固定 marker の完全一致部分文字列で advisory を判定する（決定論的判定基準）。これにより導入直後の doctor は exit 0 になる。
  - FR-1.3: 初回 birth 後（memory あり）→ 従来どおりの pass label（advisory なし）。
- FR-2（installer smoke の info 表示）:
  - FR-2.1: smoke pass 時、doctor stdout に FR-1.2 の固定 marker `workspace shell pending first workflow` が含まれる場合は「note: workspace shell is seeded at your first /amadeus workflow (known state on a fresh install)」の info 1 行を表示する（fail 扱いにしない。判定は固定 marker の部分文字列一致）。
  - FR-2.2: smoke fail 側（本物の故障）の文言・exit 1 は従来どおり維持する。
- FR-3（TDD）:
  - FR-3.1: installer eval（dev-scripts/evals/installer/check.ts）へ「導入 → doctor が exit 0 + advisory marker 表示 → 初回 birth → doctor が fail 0 + advisory marker 消滅」の一連を先行追加する（現状 FAIL = RED。現状は導入直後 doctor exit 1 + dist/ 文言）。細目:
    - 初回 birth は proxy（mkdir）ではなく実 CLI（導入先で `bun .agents/amadeus/tools/amadeus-utility.ts intent-birth --scope poc ...`）を実行する（エンジン実出力を正とする eval 規約。再現実測で隔離 workspace の実 birth 成功を確認済み）。
    - eval 構造: 既存 `makeWorkspace()`（memory 事前 seed = 現行 shell 検査への回避策）は既存シナリオ非破壊のため維持し、新シナリオ用に memory を seed しない `makeFreshWorkspace()` を追加する。既存の FR-2.1 assertion（"doctor check passed"）と FR-2.12 mirrorSmoke は pre-seed workspace のまま共存する（memory ありでは挙動不変のため）。
  - FR-3.2: エンジン dir 不在ケース（FR-1.1 の fail 経路 + 新 fix 文言）は、installer 実行後に `.agents/amadeus/` を削除してから doctor を直接呼ぶ形で installer eval 内に置く（導入導線の破損検知という同一責務内。installer 非経由の doctor 単独 eval は新設しない）。
  - FR-3.3: 既存の installer eval / doctor 関連 eval（#554 doctor 警告 / #451 smoke 領域）の回帰確認を必ず行う。
- FR-4（parity と正準反映）:
  - 実測結論: `tools/aidlc-utility.ts` は engineFileExceptions 宣言済み → exceptions へ #573 の理由 entry を追記する。`scripts/amadeus-install.ts` はリポジトリローカル（上流 parity 対象外）で宣言不要（実測: parity-baseline の対象は skills + engine files のみ）。skills/ にエンジン tools の正準コピーなし = 反映対象なし。

## 非機能要求

- NFR-1: 接触面 — engineer5 の guide-intro（#533）が同挙動をガイドに記載中。着手一報済み・回答受領（ガイドは独立先行、merge 後の注記簡素化はどちらが拾っても可）。本 Intent はエンジン + installer + eval に閉じ、ガイドは触らない。
- NFR-2: 成果物・PR は日本語、TS は英語。PR は draft 作成 → 3 条件充足で Ready 化。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | 導入直後（Intent 未作成）の doctor が exit 0 で、実行不能な誘導（dist/ copy）を表示せず、advisory が初回 workflow への実行可能な誘導を含む | FR-1 |
| 2 | 導入直後の installer smoke が fail を表示せず、既知の正常状態の info を表示する。本物の故障（エンジン dir 不在）は従来どおり fail + 実行可能な fix | FR-1.1 / FR-2 |
| 3 | 隔離 workspace での導入 → doctor → 初回 birth → doctor の一連が installer eval で検証される（先に fail する RED つき） | FR-3 |
| 4 | parity 宣言（utility の理由 entry 追記）を伴い `npm run parity:check` ok、既存 eval の回帰なし（test:all pass）、validator（Intent 指定）pass、gate の upstream-coverage sensor pass（questions の consumes 参照段落を含む） | FR-3.3 / FR-4 |

## スコープ外

- ガイド（getting-started）側の注記簡素化（engineer5 と調整済み。本 Intent はエンジン側のみ）。
- doctor の他の検査項目の見直し。
- installer の smoke 以外のステップ変更。
