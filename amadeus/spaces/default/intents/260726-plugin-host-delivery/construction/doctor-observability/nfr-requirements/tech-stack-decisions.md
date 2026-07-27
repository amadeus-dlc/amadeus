# 技術スタック決定 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 依存追加ゼロ・Bun 単独

technology-stack の実測所見「`git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は出力 0 件」「新規外部パッケージもゼロ」「plugin 機構のために runtime dependency を追加せず、Bun/TypeScript と既存 manifest/FS API で実装する」を継承する。requirements の NFR-3(Bun-only、配布フレームワークへの runtime dependency 追加禁止)と一致する。

U5 の実装(doctor plugin 節の構築)は、business-logic-model のとおり `buildDoctorPluginSection` 純関数の新設と `amadeus-utility.ts` の既存 doctor ハンドラへの編入に閉じ、diagnosePlugins・composition record・U6 判定という既存戻り値の射影のみで構成する(business-rules BR-U5-1)。新規の外部ライブラリを必要としない。

- 決定: 新規 runtime dependency を追加しない(合否: `package.json` / `bun.lock` の U5 由来 diff が 0 件)
- 決定: doctor 節は既存戻り値の射影に閉じ、新走査・新判定機構を導入しない

## 既存 --doctor 経路への編入(新 verb を作らない)

business-logic-model のとおり、`amadeus-utility.ts` の doctor ハンドラへの編入は「Adding a Utility Handler」チェックリスト対象外(既存 `--doctor` の節追加であり新 verb ではない)である。project.md DECIDED(新ユーティリティハンドラ実装時のチェックリスト)を不要に発動させず、既存 doctor 出力へ節を足す最小変更に留める。

- 決定: 新規 utility verb を作らず、既存 `--doctor` へ節を追加する
- 決定: DoctorLine の基底 3 フィールドは U2 正本を逐語継承し、U5 拡張は追加のみとする(BR-U5-5 / cross-unit-type-canonical-lift)

## 配布同期の既存機構踏襲

business-rules の BR-U5-6(既存テスト同期)のとおり、doctor 出力の変更は全ハーネス dist / self-install の再生成と drift ガード green を伴う。technology-stack の既存様式(`bun scripts/package.ts` / `bun run promote:self`)を用い、新規の配布ツール・件数台帳を発明しない(requirements NFR-4 の count-free 原則)。

- 決定: 配布は既存の manifest-driven 投影機構を用い、新規ツール・件数台帳を新設しない
