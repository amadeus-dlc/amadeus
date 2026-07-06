# Requirements — 260706-persona-loading（Issue #582）

## Intent 分析

subagent stage の persona 読み込みについて、stage-protocol.md §5（「persona context を Task prompt に含める」）と skills/amadeus/SKILL.md（「named agent が自動読込 — prompt へ注入しない」）が真逆を規定している（#568 の stage reviewer が発見）。実行経路の正は SKILL.md 側であり（エンジン駆動の公開入口 = [business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md) のエンジン seam、guide 06 章も同側）、conductor persona と stage 定義（[code-structure.md](../../../../codekb/amadeus/code-structure.md) の amadeus-common 配下）も同側である。上流 b67798c3 も同じ旧文言を持つため、修正はローカル適応差分になる。

## 機能要求

### FR-1: stage-protocol.md §5 の修正

- FR-1.1: 「For subagent stages」節（L603 付近）を実体へ書き換える（questions Q1 = A）。修正後の項目内容を明記する: ①Task は stage metadata の subagent_type で named agent を呼び、persona と knowledge は自動で読み込まれる — persona を prompt へ注入しない ②prompt には prior artifacts と workspace state を context として渡す（subagent は会話履歴を見ないため）。
- FR-1.2: 修正は .agents/amadeus/amadeus-common/protocols/stage-protocol.md（実行時参照される側）に行う。skills/ 側に対応ファイルは存在しない（#534 で実測済みの構造）ため、同一反映の対象はなし。
- FR-1.3: 同一矛盾の第 2 出現箇所 = §11「Context budget for subagent prompts」（L834 付近）の「Always include: Agent persona (agent.md), knowledge files, ...」も同じ実体（自動読込・注入しない）へ修正する。swarm worker も plain Task 呼び出しであり同規則が適用される（amadeus-swarm.ts に独自の persona 処理なし = reviewer 実測）。内部整合は parity:check の対象外のため、両箇所の修正が受け入れ条件 1 の充足に必須（reviewer iteration 1 の blocking 指摘による追加）。

### FR-2: parity の宣言

exceptions[] の既存 stage-protocol.md エントリ（#504/#534 で理由統合済み）へ本修正の理由（persona 読み込み規定の実体整合 = Issue #582。上流が同修正を取り込んだら解除）を統合する。新規エントリを作らない。engineFileExceptions は宣言済みで不変。

### FR-3: 上流フィードバック候補の記録

上流も同じ旧文言を持つ事実と修正内容を decision に記録し、上流提案候補とする（提案するかは人間判断。#534 の前例と同じ扱い）。

## 非機能要求

- NFR-1: `npm run parity:check` が pass する（受け入れ条件）。
- NFR-2: 変更は stage-protocol.md の該当 2 箇所（§5 L603 付近と §11 L834 付近）と parity-map の reason のみ（SKILL.md・conductor persona・stage 定義は既に正しいため触れない）。

## 制約

- ディスパッチ補足 3 点（SKILL.md 側が正、parity 留意、#572 より先に merge = PR は速やかに）。
- draft PR ルール、gate は auto 委任範囲。

## 前提

- 上流 b67798c3 の同箇所 = 同旧文言（fresh clone 実測、RE の decision に記録）。
- exceptions[] に stage-protocol.md の既存エントリが実在（#534 で理由統合の前例）。

## スコープ外

- 上流への実際の提案（人間判断）。
- SKILL.md / conductor persona / stage 定義の変更（既に正しい）。
- #572 の三層化 restructure との統合（先行 merge の調停順序のみ）。

## 未解決事項

- なし（文言範囲は questions Q1 で自己判断確定済み。gate の人間承認で確定する）。

## 受け入れ条件

| 区分 | 受け入れ条件 | 対応要求 |
|---|---|---|
| Issue 条件 | persona 読み込み規定が単一の正に収束し、stage-protocol.md と SKILL.md が矛盾しない | FR-1 |
| Issue 条件 | `npm run parity:check` が pass する | FR-2、NFR-1 |
| ディスパッチ | 判断（修正 vs 明文化）と上流フィードバック候補が decision に記録されている | FR-3（+ RE の decision） |
