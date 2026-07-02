# D001: Functional Design scope

## 背景

Inception から引き継いだ未確定事項（見出しの名前と位置、並び順規則、`discoveries.md` の抽出規約、スクリプトの名前と引数体系、検査の実装方式）は、いずれも既存データと既存実装を根拠に設計で確定できる調査解消型である。

## 判断

U001 の Functional Design を必須（`requirement: required`、`frontendSurface: absent`）とし、core 3 文書で次を確定する。

- 見出し契約: Intent モジュールファイルの H1 直後に `## 概要`（本文 1 段落）、その次に `## 依存`（依存と理由の 2 列の表）を置く。
- 並び順: 識別子の辞書順。`YYYYMMDD-<slug>` 形式のため日付昇順、同日内は slug の辞書順になる。
- `discoveries.md` の抽出規約: テーマは H1 から末尾の「 Discovery Brief」を除去した値、状態と判定は `state.json`、推奨次アクションは `## 推奨次アクション` の箇条書きから導出する。
- スクリプト契約: `skills/amadeus-validator/scripts/IndexGenerate.ts`。CLI は `bun run IndexGenerate.ts <workspace>`（生成、上書き）と `--check`（不一致検出時に exit 1）。生成ロジックは export し、validator が import して再利用する。
- 検査方式: 生成ロジックで導出した期待内容と実ファイルの完全一致（マーカーを含む）。行単位の対応検査ではなく完全一致とする。

## 理由

- 見出し契約と抽出規約は、既存モジュールファイルの実データ（H1 の「 Discovery Brief」suffix、既存の `## 推奨次アクション` 見出し）と整合し、新しい見出しの追加を Intent 側の 2 つに抑えられる。
- 識別子の辞書順は、日付 prefix により現行の時系列順とほぼ一致し、追加位置の判断を不要にする。
- 完全一致検査は、生成ロジックの再利用により実装が単純で、部分的な手書き編集も確実に検出できる。行単位の対応検査は生成規則と検査規則の二重実装になる。
- スクリプト名と CLI は `StateScaffold.ts` の確立済みパターンに合わせる。

## 影響

migration（B004）では、既存 `intents.md` の行順が識別子の辞書順へ正規化される。
内容の差分は概要、依存、理由の情報が失われないことで確認する。
