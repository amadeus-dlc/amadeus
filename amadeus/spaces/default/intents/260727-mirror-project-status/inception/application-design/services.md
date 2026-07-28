# Services — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

本プロジェクトは常駐サービスを持たない CLI フレームワーク(architecture.md の実測構造、team-practices の CI/リリース制約)であり、「サービス」はプロセス境界と外部依存の記述に読み替える(cid:nfr-design:c1 の CLI 適用と同旨)。requirements の FR-1b(チェーン内実行・polling なし)を境界契約とする。

## プロセス境界

| 境界 | 実体 | 契約 |
|---|---|---|
| Amadeus CLI プロセス | bun 直接実行の mirror lifecycle(boundary/manual/repair の3経路) | 既存 eligible boundary / manual invocation のみで実行(FR-1b)。daemon / polling / GitHub Actions なし |
| gh CLI サブプロセス | runner の argv spawn(shell 不使用) | optional dependency — 不在・未認証は loud fail、workflow は継続(FR-7e、gh-scripts-boundary)。deadline/stdout cap は既存 profile(single: 30s/1MiB) |

## 外部サービス依存

| 依存 | 用途 | 失敗時 |
|---|---|---|
| GitHub REST(既存) | Issue create/view/edit/close | 既存分類(classifyHttpStatus) |
| GitHub GraphQL(新規 — repo 初) | ProjectV2 照会(projectItems / Status field・options)+ mutation(addProjectV2ItemById / updateProjectV2ItemFieldValue) | HTTP 層は既存分類+body `errors` の新解釈層(FR-7d)。retryable → pending、構成起因 → safety-blocked |

## 認証・権限(FR-10b)

- token は gh の credential store に委譲(保持・出力しない)。ProjectV2 の読取・更新には `project` scope が必要 — docs 4文書体系の認証節に記載し、不足時は対象と必要権限を秘匿情報なしで診断する。scope の自動変更は行わない。

## デプロイ・運用面

- 配布は 7 ハーネス projection の再生成のみ(FR-12b)。新しい常駐面・ジョブ・workflow は増えない(reuse inventory — decisions.md)。
