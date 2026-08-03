# Scope Document — source-only 構成への移行と Release Asset 配布

上流入力(consumes 全数): intent-statement(必須・実参照は下記各節)。feasibility-assessment / constraint-register は optional consume だが self-feature スコープで feasibility ステージが SKIP のため不存在 — 制約・リスクは intent-statement の確定済み裁定表(G1〜G13)と Issue #2043 の実測(クロスレビュー2名検証済み)で代替する。

## スコープ境界(In / Out)

### In(実施する)

intent-statement.md の Problem Statement が挙げる三層追跡の実害4点を解消する、次の変更一式。

1. **正本昇格(ステップ0)**: scope 定義22ファイル + scope-grid root-only 5エントリを `packages/framework/**` へ昇格、self-scope-consistency センサー追随
2. **Release Asset 配布**: 全ハーネス同梱の単一 tar + SHA-256 checksum + manifest(G9)、codeload 同一 wrapper 契約(G6)、release.yml への build ジョブ追加(workflow_dispatch 一本は維持)
3. **installer 移行**: asset 優先取得 + checksum 検証、導入バージョン定数による fail-closed 境界(G7)、`ALLOWED_HOSTS` 拡張、ADR-003 改訂、旧版 codeload フォールバック
4. **bootstrap 解決**: フック単一ディスパッチャ(G1)、AGENTS.md import 参照方式(G2)、onboarding 手順文書化
5. **CI 再設計**: build-before-test 前提化(G4)、第3ガードの意味再定義(G5)、隔離2回 build 再現性検査、境界ガード(落ちる実証込み)、detect-ci-changes 改訂
6. **追跡除外**: `dist/**` + self-install 面(allowlist 除く)の Git 追跡除外、allowlist 正本一元化+整合テスト(G8)
7. **文書・規範**: README / CONTRIBUTING / `.gitattributes` / `.gitignore` 契約コメント更新、規範衝突5点のノルム PR(手編集検出消失の受容論証 = G3 を含む)

### Out(実施しない — Won't)

Issue #2043 非目標 + grilling 裁定による確定除外。

- Amadeus ランタイム・ステージ挙動そのものの変更
- ハーネスごとの出力内容・互換性の意図的変更
- プロジェクト固有設定の廃止
- Git 履歴からの生成物除去(履歴書き換え)
- `amadeus/` ワークスペースツリー(最大の肥大要因)の扱い変更
- composed scope・plugin 合成状態のクリーン checkout からの再現
- テストの dist 参照の source 直参照への書き換え(G4)
- per-harness の asset 分割(G9 — 退路のみ確保)
- #1865(Rust 全面移行)— 本 intent 先行を G13 で確定、着地後に再評価

## バリューストリーム(現状 → 移行後)

| 工程 | 現状 | 移行後 |
|---|---|---|
| 正本編集 | packages/framework 編集 → package.ts で 7 dist ツリー再生成 → promote:self で 6面再投影 → 全部コミット | packages/framework 編集のみコミット。生成はローカル `bun run build`(未追跡) |
| レビュー | PR の 84% が機械的投影(PR #2017 実測) | 差分は正規ソース+意図した設定変更のみ |
| CI 検証 | コミット済みコピーとの byte 同期確認 | クリーン checkout から build → テスト → 再現性検査(隔離2回 build) |
| リリース | tag + Release ノートのみ(asset なし) | 単一 tar asset + checksum + manifest を決定的に生成・公開 |
| インストール | codeload でリポ全体(83M 超)取得 | asset(42M)取得 + checksum 検証、旧版は codeload フォールバック |

## 制約(feasibility SKIP の代替)

- 移行順序 0→6 厳守(installer 移行前の追跡除外は installer を決定的に破壊 — `payload-factory.ts:36-45`)
- 期日なし(Q1 裁定)。品質と順序を優先し、マイルストーンは Bolt 完了で刻む
- build は追跡ファイルを書き換えない(G2/G8)。生成処理は allowlist・per-user ランタイム・稼働中 worktree を削除しない
- 人間承認境界の維持: 全ステージゲート・ノルム PR・PR マージ・リリース実行
