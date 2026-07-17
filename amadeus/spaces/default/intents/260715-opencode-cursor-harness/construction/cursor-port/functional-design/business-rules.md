# Business Rules — U3 cursor-port

intent: `260715-opencode-cursor-harness` / Unit: U3
上流入力: requirements.md(FR-3/FR-4)、application-design の component-methods.md(C2)/ components.md / services.md、unit-of-work.md / unit-of-work-story-map.md。

## ルール一覧(検証可能形)

| ID | ルール | 検証 |
| --- | --- | --- |
| R-U3-1 | Bolt 3 冒頭の外部実測(照会日・出典付き)を hooks.json.example 出荷の前提条件とする — 対象: (a) tool_name 語彙 (b) **exit コード意味論の再確認**(components.md の AC-3d 記録では公式 docs 実測で「exit 0=stdout 採用 / exit 2=deny / その他=fail-open」— 実装前に版付きで再実測し、fail-closed へ変わっていれば設計を停止して報告)。実測記録なしに hook エントリを出荷しない | code-summary に実測記録節(語彙+exit 意味論)が実在+レビュー観点(E-OC9 準拠 — 2026-07-15 時点 PR #1024 で persist 審議中、裁定自体は E-OC9 で確定済み) |
| R-U3-2 | 写像不能イベントは出荷せず、機能表(services.md 原型→U4 docs)の該当行を「未対応」へ降格 | 出荷 hooks.json のイベント集合 ⊆ 実測写像可能集合(grep 照合) |
| R-U3-3 | manifest は U1 と同一の型契約(authoredExempt = cursor アダプタ regex、skipRunnerGen=true) | typecheck + package.ts exit 0 |
| R-U3-4 | emit は emission table 駆動の write⇔check 対称(U1 と同一様式、`EmitResult.written`/`problems`) | dist:check 冪等 exit 0+落ちる実証1回 |
| R-U3-5 | `.cursor/rules/amadeus.mdc` は frontmatter(description/alwaysApply: true)を持ち、本文は amadeus-rules/ チェーンへの参照のみ(ルール本文の二重管理禁止 — ADR-2) | .mdc の frontmatter 実在+本文にルール本文の複製がないこと(grep) |
| R-U3-6 | アダプタのエラー方針: parse 失敗・未登録 tool_name は**非ゼロ(2 以外)exit** — Cursor 契約(AC-3d 実測: exit 2=deny、その他=fail-open)では codex の exit 0(amadeus-codex-adapter.ts:83-87 の fail-open)と**値は異なるが「advisory 側に倒す」意図は同一**。exit 2 は使わない(意図せぬ deny の禁止)。この対応関係を実装コメントに保持 | アダプタ単体テスト(不正 stdin / 未登録 tool_name の2ケース以上、exit 値のアサート付き) |
| R-U3-7 | core・scripts・installer 変更ゼロ(U1 と同一)+ 閉じ列挙目録の第3再列挙 | AC-4d grep ヒット0 / enumeration-reverify-at-implementation |

## 完了条件(Bolt 3)

package.ts / dist:check / typecheck / lint / promote:self:check / tests --ci すべて exit 0 + 手動配置で --version・--doctor・directive 受領実測(AC-3b、AC-6b 様式)+ アダプタ単体テスト green + **tool_name 語彙と exit 意味論の実測記録(照会日・出典・値集合)が code-summary/diary に実在** + push 前 lcov + deslop。
