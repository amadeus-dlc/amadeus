# Design Decisions — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US-1.1〜3.1)、codekb の architecture.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、`../reverse-engineering/scan-notes.md`(Architect 合成)。

## ADR-1: 列挙拡張パターンの踏襲(新規分岐ゼロ)

- Context: installer は列挙単一起点で全経路へ自動伝播(RE 面2 実測 — per-harness ハードコード0)
- Decision: 8サイトの値追加のみで実装し、per-harness 分岐・ヘルパー・抽象化を一切追加しない(FR-1 AC-1e)
- Alternatives Rejected: (a) dist ディレクトリからの動的列挙 — installer が受理すべき集合と dist 実在が結合し共変偽 green(R-3)。(b) 列挙の一元化リファクタ(単一定義から8サイト生成)— 本 intent のスコープ外の構造変更で、literal 契約テストの独立性(検証劇場回避)も損なう
- Consequences: 7値目追加も同型の機械的作業(FR-4 AC-4b の台帳が手順書)

## ADR-2: engine dir は各固有(共有にしない)

- Context: kiro/kiro-ide は .kiro を共有するが、opencode/cursor は各自の dir(dist 実在で確認済み)
- Decision: `opencode: ".opencode"` / `cursor: ".cursor"` の個別エントリ(AC-1b)
- Alternatives Rejected: (a) 共有 dir 化(opencode/cursor を単一 dir へ)— dist ツリーの実構造と矛盾(t149 が固定する存在面に反する)。(b) 命名規則からの機械導出(`"."+harness`)— kiro-ide→.kiro の既存共有が規則の反例で全称導出は成立せず、暗黙規則は将来ハーネスの逸脱時に silent 破綻する(明示 map は fail-fast throw :15-20 と対で安全)
- Consequences: allEngineDirNames() が5要素へ(重複排除の既存挙動保存)

## ADR-3: 検証は fixture 注入の in-process 完走(ネットワーク・タグ不要)

- Context: 取得は codeload 固定だが、既存テストが Http port+buildCodeloadFixture の seam を保有(RE Architect 合成 (c) 実測)
- Decision: fixture へ dist/opencode・dist/cursor エントリを追加し install→verify を in-process 実証(FR-3)
- Alternatives Rejected: 実ネットワーク検証 — CI 不安定・タグ依存。スキップ — Mandated(落ちる実証)違反
- Consequences: 新規テスト行は in-process 被覆(C-6 patch gate 適合)

## ADR-4: advisory 2面は install 正しさと分離(Q1=B 裁定の設計化)

- Context: E-1048-RA-Q1 = B+留保2件(advisory 分離 / 権威は script-path derivation のまま)
- Decision: C6 は配列 literal 追加のみ・advisory assert のみ(AC-6c — hard gate を作らない)。core 面につき dist 6ツリー+セルフインストール2ツリー = 計8ミラーの regen(package.ts+promote:self)を同 PR で(Mandated — components.md C6 と同表記)
- Alternatives Rejected: hard gate 化 — 裁定留保違反+検証劇場リスク。別 PR 化 — 同一裁定の分断で着地検証が二重化
- Consequences: doctor 出力の一貫性が installer 対応と同時に成立
