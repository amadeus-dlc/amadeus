# Election Record — E-AD-2695-LEARNINGS

- question: Application Designの学習候補から次回以降のproject practiceとして最も価値の高い1件を選ぶ

裁定: 既存約1,000行のCLIを互換façadeとして維持し、domain/candidates/intervals/reportをpure moduleへ分離した。import/type数は増えるが、変更理由、PBT seam、既存consumer互換を守れる。(choice 4: 2票)
内訳: choice1=0票 choice2=0票 choice3=0票 choice4=2票 choice5=0票 choice6=0票
- 留保(application-design-learning-voter-1, GoA3): pure moduleの境界は、実在する変更理由と独立して検証できる契約に対応させ、単なるファイル分割や抽象化の増加にしないこと。互換façadeには既存consumer向けの挙動だけを残すこと。
- 留保(application-design-learning-voter-2, GoA2): 分離先は変更理由と検証 seam が明確な cohesive module に限定する。行数削減だけを目的に façade から薄い委譲層を大量生成すると、import/type 増加のコストだけが残るため避ける。
票タイムライン: 配信 2026-08-09T15:07:11Z → 配信 2026-08-09T15:07:11Z → application-design-learning-voter-1 2026-08-09T15:08:03Z → application-design-learning-voter-2 2026-08-09T15:08:05Z → 開票 2026-08-09T15:08:23Z
GoA[E-AD-2695-LEARNINGS]: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
