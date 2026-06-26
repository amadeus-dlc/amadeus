# AI-DLC Method Definition

この文書は、Raja SP 氏による AI-DLC の手法定義スライドを amadeus で再参照しやすくするための読み取りメモである。

原典 PDF は [aidlc-method-definition-ja.pdf](aidlc-method-definition-ja.pdf) である。

ページ画像は [aidlc-method-definition-assets](aidlc-method-definition-assets/) に保存している。

## 読み取り結果

AI-DLC は、既存の開発手法に AI を後付けする方法ではない。

AI の速度、分解能力、設計候補の提示能力を前提に、開発ライフサイクルを組み直す方法論である。

AI は計画、分解、設計候補、実装候補を提示する。

人間は目的、リスク、設計品質、最終判断を承認する。

この関係は、amadeus では Intent Contract を正本にし、Unit Traceability を通じて Unit、Bolt、Spec へ進める構造に対応する。

## 中心構造

```text
Intent -> Unit -> Bolt -> Deployment Unit
```

**Intent**：達成したい目的を表す出発点である。
ビジネス目標、機能目標、技術的成果を含む。

**Unit**：Intent から導かれる自己完結した価値単位である。
測定可能な価値を持ち、疎結合に分けられる。

**Bolt**：Unit を短い反復で実装、検証する実行単位である。
時間から日単位の短いサイクルを想定する。

**Domain Design**：Unit の業務規則を表す設計成果物である。
技術構成よりも、境界づけられた業務概念を先に扱う。

**Logical Design**：Domain Design を非機能要求や構成上の制約へ接続する設計成果物である。

**Deployment Unit**：実行可能で、検証済みで、運用へ渡せる単位である。

## 主要原則

AI-DLC は、長いスプリントや見積もりを前提にした流れではなく、短い反復と人間の承認点を組み合わせる。

そのため、開発者は AI に作業を依頼するだけの立場ではない。

開発者は、AI が提示する選択肢、推奨、トレードオフを検証し、必要な判断を下す。

AI-DLC は、専門分業を固定したまま AI を追加するのではなく、AI の分解能力を使って責任を統合する。

ただし、責任を AI に移すわけではない。

人間は、承認者、検証者、リスク判断者として残る。

## Green-field の流れ

新規開発では、Intent を定義してから Unit に分解する。

次に Domain Design を作り、Bolt によって短い実装と検証を回す。

最後に Deployment Unit としてリリースし、運用へ移る。

スライドでは、レコメンデーションエンジンの構築が例として使われている。

AI は要件を整理し、選択肢を提示する。

Product Owner と開発者は、各フェーズで検証し、承認する。

## Brown-field の流れ

既存システムでは、最初に現状分析を行う。

次に変更意図を定義し、影響範囲を特定する。

そのうえで Bolt 実装を行い、統合、検証へ進む。

この流れは、既存資産を活かしながら段階的に改善するためのものだ。

amadeus では、既存 Spec を無視して新しい Spec を作るのではなく、Intent Drift と Scope Creep を検出しながら追跡関係を保つ必要がある。

## amadeus への対応

```text
AI-DLC Intent -> amadeus Intent Contract
AI-DLC Unit -> amadeus Unit
AI-DLC Bolt -> amadeus Bolt
AI-DLC Deployment Unit -> cc-sdd 実装後の運用可能な成果
```

amadeus では、Bolt と Spec を同一視しない。

Bolt は実現単位である。

Spec は Bolt を cc-sdd の requirements、design、tasks へ接続する契約である。

そのため、amadeus の関係は次の形になる。

```text
Intent Contract 1 -> 1..* Unit 1 -> 1..* Bolt 1 -> 1..* Spec
```

## ページ対応

| ページ | 内容 | 画像 |
|---:|---|---|
| 1 | 表紙とAI-DLCの位置づけ | [page-01.png](aidlc-method-definition-assets/page-01.png) |
| 2 | AI支援からAI駆動への変化 | [page-02.png](aidlc-method-definition-assets/page-02.png) |
| 3 | 既存手法の限界とAI-DLCの必要性 | [page-03.png](aidlc-method-definition-assets/page-03.png) |
| 4 | 主要原則1、プロセスの再設計と対話方向の反転 | [page-04.png](aidlc-method-definition-assets/page-04.png) |
| 5 | 主要原則2、複雑性への対応と責任の統合 | [page-05.png](aidlc-method-definition-assets/page-05.png) |
| 6 | AI-DLCのコア成果物 | [page-06.png](aidlc-method-definition-assets/page-06.png) |
| 7 | Inception、Construction、Operations | [page-07.png](aidlc-method-definition-assets/page-07.png) |
| 8 | 階層的ワークフローと人間の監督点 | [page-08.png](aidlc-method-definition-assets/page-08.png) |
| 9 | Green-fieldでの適用例 | [page-09.png](aidlc-method-definition-assets/page-09.png) |
| 10 | Brown-fieldでの適用例 | [page-10.png](aidlc-method-definition-assets/page-10.png) |
| 11 | 導入アプローチと開発者体験 | [page-11.png](aidlc-method-definition-assets/page-11.png) |
| 12 | AI-DLCの価値と留意点 | [page-12.png](aidlc-method-definition-assets/page-12.png) |
