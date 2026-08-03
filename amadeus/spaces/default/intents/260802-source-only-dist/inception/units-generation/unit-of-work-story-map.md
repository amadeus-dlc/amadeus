# Unit of Work Story Map — 260802-source-only-dist

> 注記: user-stories ステージは self-feature スコープで SKIP のため stories 成果物は不存在。本 story map は requirements の Intent Analysis(利用者価値)を価値軸の代替として用いる(N/A 根拠の明示 — approval-handoff:c4 準拠)。

上流入力(consumes 全数): requirements(Intent Analysis の利用者価値 — スライスの価値軸)、components / component-methods(Unit 実体)、component-dependency(合流構造)、decisions(ADR-A8 原子切替 — Slice 3 の一体性)、services(Slice 1 の外部境界)。

## 価値スライス

| Slice | 価値仮説 | Unit | 出荷判定 |
|---|---|---|---|
| Slice 1: asset 配布の実証(walking skeleton) | 「配布物はリリース時に決定的に生成・検証・公開できる」— 最大リスクの外部境界を最初に実証 | u1-asset-build → u2-installer-asset | draft release への asset 付与 → installer が asset 経路+checksum 検証で1ハーネスを実インストール(G10)。ゲート付き Bolt 1 |
| Slice 2: 切替の前提整備 | 「切替に必要な足場(正本昇格・bootstrap・allowlist・CI 基盤)がすべて揃う」 | u3-scope-promotion / u4-hook-dispatcher / u5-agents-import / u6-allowlist-canonical / u7-ci-stage1(並行) | 各 Unit の FR 受け入れ+全体 CI green(旧 check 並存のまま) |
| Slice 3: source-only 切替 | 「レビュー差分が正規ソースだけになる」— 本 intent の中核価値が観測可能になる | u8-source-only-switch(原子切替) | 追跡対象ゼロ・`git status` クリーン・境界ガード落ちる実証・クリーン checkout CI 完走 |
| Slice 4: 契約の固定 | 「新境界が文書・規範として恒久化される」 | u9-docs-norms | 文書一致+ノルム PR 5点マージ(人間承認) |

## 利用者ジャーニー別の価値到達

- **コントリビューター**: Slice 3 で PR diff から機械投影が消える(PR #2017 型の 84% ノイズ解消)。Slice 2 の u4/u5 でフレッシュクローン体験が明示案内付きになる
- **自己開発チーム**: Slice 2 の u7 で build-before-test が確立、Slice 3 で再生成漏れ・生成面 conflict が構造的に消滅
- **installer 利用者**: Slice 1 で新版の決定的インストール(42M asset + checksum)が成立。旧版は全 Slice を通じて無影響(codeload フォールバック)

## スライスの順序拘束

Slice 1 が先頭(リスク先行 — G10)、Slice 2 は Slice 1 と並行可能(u3〜u7 は u1/u2 と独立)、Slice 3 は Slice 1+2 の全完了+クリーン環境検証後、Slice 4 は Slice 3 の着地後。Bolt 編成・ゲート方針は delivery-planning で確定する。
