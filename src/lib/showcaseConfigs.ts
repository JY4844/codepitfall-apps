export type ShowcaseAppId =
  | "okusuri"
  | "receipt"
  | "contract"
  | "gomi"
  | "barrierfree";

export interface ShowcaseAppConfig {
  id: ShowcaseAppId;
  name: string;
  category: string;
  tagline: string;
  subtitle: string;
  badgeText: string;
  accentColor: string;
  accentSoft: string;
  inputLabel: string;
  inputPlaceholder: string;
  sampleText: string;
  sampleLocation?: string;
  showLocationInput?: boolean;
  submitLabel: string;
  section1Title: string;
  section2Title: string;
  section3Title: string;
  gasPrefix: string;
  systemInstruction: string;
}

export const SHOWCASE_APPS: Record<ShowcaseAppId, ShowcaseAppConfig> = {
  okusuri: {
    id: "okusuri",
    name: "おくすりミマモリ",
    category: "暮らしと家族の部門",
    tagline: "処方箋・お薬手帳・市販薬を撮るだけで服薬管理と飲み合わせ注意を家族へ共有",
    subtitle:
      "複数のお薬の写真やメモから、Gemini 3.8 Flash が服用タイミング・飲み合わせ注意点・家族向けの見守りリマインドを構造化抽出します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 服薬見守り AI",
    accentColor: "#0f766e",
    accentSoft: "#f0fdfa",
    inputLabel: "お薬手帳・処方箋・市販薬のメモ（または写真をアップロード）",
    inputPlaceholder: "例: ロキソニン錠60mg（食後1日3回）、市販の総合感冒薬を併用してよいか確認したい",
    sampleText:
      "【処方薬】アムロジピン錠5mg（朝食後1回）、ロキソプロフェンNa錠60mg（頓服・痛み止め）\n【追加したい市販薬】市販の総合かぜ薬（イブプロフェン配合）\n※70代の母の服薬管理。重複成分や飲み合わせの注意点、朝夕の服薬リマインドを整理したい。",
    submitLabel: "服薬スケジュールと注意点を診断",
    section1Title: "1. 服用タイミング・お薬リスト",
    section2Title: "2. 飲み合わせ・安全チェック（医師・薬剤師への確認事項）",
    section3Title: "3. 家族向けコピー用メモ（LINE・メール共有）",
    gasPrefix: "[おくすりミマモリ]",
    systemInstruction:
      "あなたは家族の服薬管理を支援する親切なヘルスケア情報整理アシスタントです（医療行為・最終診断は行わず、必ず医師・薬剤師へ確認すべきポイントとして整理してください）。入力された処方薬・市販薬情報から、alert_level (high/medium/low)、alert_title、alert_message（重複成分や飲み合わせ確認ポイント）、items（各薬の服用タイミング・注意点）、checklist（医師・薬剤師へ確認すべき項目）、copyable_draft（家族共有用のわかりやすい服薬メモ）、suggested_tasks（Googleカレンダー登録用の服薬・確認リマインド）を日本語で構造化してください。",
  },
  receipt: {
    id: "receipt",
    name: "レシート家計コーチ",
    category: "暮らしと家族の部門",
    tagline: "レシートを撮るだけで自動家計簿・栄養バランス診断・3日分の節約献立を生成",
    subtitle:
      "スーパーのレシート写真や購入メモから、Gemini 3.8 Flash が支出カテゴリ・栄養バランス・食材を使い切る節約献立をまとめて出力します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家計・献立 AI",
    accentColor: "#d97706",
    accentSoft: "#fffbeb",
    inputLabel: "レシートの購入品メモ（またはレシート写真をアップロード）",
    inputPlaceholder: "例: 鶏むね肉 320円、キャベツ半玉 128円、卵1パック 258円、菓子パン 380円...",
    sampleText:
      "【スーパー購入レシート 合計 2,486円】\n・鶏むね肉 2枚 420円\n・豚こま切れ 350g 498円\n・キャベツ 1/2玉 138円\n・もやし 2袋 76円\n・卵 10個 268円\n・豆腐 2丁 156円\n・スナック菓子・甘い飲料 680円\n・冷凍うどん 5食 250円\n※4人家族。無駄遣いを減らしつつ、この食材で3日分の節約献立を作りたい。",
    submitLabel: "家計分析と 3 日分の節約献立を生成",
    section1Title: "1. カテゴリ別支出＆買いすぎチェック",
    section2Title: "2. 食材を使い切る 3 日間の節約献立",
    section3Title: "3. そのまま家計簿・買い物メモに貼れる要約",
    gasPrefix: "[レシート家計コーチ]",
    systemInstruction:
      "あなたは家庭の食費節約と栄養バランスを支援する家計・料理コーチです。レシート内容から、alert_level (high/medium/low)、alert_title（家計＆栄養の総評）、alert_message（買いすぎ・不足栄養素のアドバイス）、items（カテゴリ別支出や栄養ポイント）、checklist（3日分の具体的な節約献立メニュー）、copyable_draft（家計簿メモ＋次回買い物リスト）、suggested_tasks（フードロス防止の消費期限・買い物タスク）を日本語で構造化してください。",
  },
  contract: {
    id: "contract",
    name: "規約・契約書イエローカード",
    category: "はたらく・まなぶ部門",
    tagline: "業務委託・バイト・賃貸契約の不利な条項を診断し、丁寧な確認メールまで自動作成",
    subtitle:
      "契約書や利用規約の写真・抜粋から、Gemini 3.8 Flash が見落としがちなリスク条項を3段階で可視化し、先方への確認文面を生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 契約リスク診断",
    accentColor: "#b91c1c",
    accentSoft: "#fef2f2",
    inputLabel: "契約書・規約の抜粋テキスト（または書類写真をアップロード）",
    inputPlaceholder: "例: 第8条（著作権）本業務で生じた一切の権利は甲に帰属し、乙は著作者人格権を行使しない...",
    sampleText:
      "【業務委託契約書 抜粋】\n第5条（報酬・支払）検収完了後、翌々月末払いとする。修正依頼は無制限に無償対応とする。\n第8条（著作権）納品物に関する著作権（27条・28条含む）および著作者人格権はすべて甲に帰属する。\n第11条（契約期間）1年間とし、期間満了1ヶ月前までに書面通知がない場合は同一条件で自動更新。途中解約時は違約金として契約総額の50%を支払う。",
    submitLabel: "リスク条項と確認メールを診断",
    section1Title: "1. 検出されたイエロー／レッドカード条項",
    section2Title: "2. 署名・合意前に必ず確認すべきチェックリスト",
    section3Title: "3. 先方へそのまま送れる丁寧な確認メール文面",
    gasPrefix: "[契約イエローカード]",
    systemInstruction:
      "あなたはフリーランスや学生・社会人が契約書の注意点を理解できるよう支援する契約レビュー補助アシスタントです（法的助言の代替ではなく確認ポイントの整理として提示してください）。入力された契約条文から、alert_level (high/medium/low)、alert_title（総合リスク判定）、alert_message（最も注意すべきポイント）、items（各条項のリスク内容と理由）、checklist（署名前に先方へ確認すべき質問リスト）、copyable_draft（角が立たず丁寧な確認・修正相談メール文面）、suggested_tasks（更新期限・確認アクションのカレンダー登録タスク）を日本語で構造化してください。",
  },
  gomi: {
    id: "gomi",
    name: "ごみ分別カメラ",
    category: "まちと地球の未来部門",
    tagline: "迷うごみの写真と自治体ルールから正確な分別・分解手順・収集日を即判定",
    subtitle:
      "モバイルバッテリーや小型家電など迷いやすいごみを撮るだけ。Gemini 3.8 Flash が分別区分と安全な出し方を判定し、収集日をカレンダー登録します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域エコ分別 AI",
    accentColor: "#15803d",
    accentSoft: "#f0fdf4",
    inputLabel: "捨てたいモノの説明・自治体名（または写真をアップロード）",
    inputPlaceholder: "例: 膨らんだモバイルバッテリーと壊れた電気ケトル（東京都世田谷区）",
    sampleText:
      "【自治体】東京都世田谷区\n【捨てたいモノ】\n1. 少し膨らんだモバイルバッテリー（リチウムイオン電池内蔵）\n2. プラスチックと金属が混ざった壊れた電気ケトル（高さ22cm）\n3. 汚れが落ちないピザの空き箱\n※火災リスクなく正しく分別して、次の回収日に出したい。",
    submitLabel: "分別区分と安全な出し方を判定",
    section1Title: "1. 品目別の分別判定＆出し方ガイド",
    section2Title: "2. 火災防止・リサイクルのための事前準備チェック",
    section3Title: "3. 粗大ごみ・拠点回収メモ（コピー用）",
    gasPrefix: "[ごみ分別カメラ]",
    systemInstruction:
      "あなたは自治体の適正分別とリサイクル・ごみ収集車火災防止を支援するエコ分別ガイドです。入力された品目・地域情報から、alert_level (high/medium/low)、alert_title（最優先の分別・安全判定）、alert_message（リチウム電池火災防止などの重要注意）、items（各品目の分別区分・理由・出し方）、checklist（出す前の解体・絶縁・清掃ステップ）、copyable_draft（拠点回収・申込用の品目メモ）、suggested_tasks（収集日・回収ボックス持ち込みのリマインドタスク）を日本語で構造化してください。",
  },
  barrierfree: {
    id: "barrierfree",
    name: "バリアフリー街歩きマップ",
    category: "まちと地球の未来部門",
    tagline: "段差・スロープ・エレベーターの写真から通行難易度を判定し地域の安心マップを構築",
    subtitle:
      "車いす・ベビーカー目線の現場写真と位置情報から、Gemini 3.8 Flash が段差リスクと迂回アドバイスを構造化し、Google マップ＆シートへ共有します。",
    badgeText: "✦ Google Gemini 3.8 Flash + バリアフリー共創 AI",
    accentColor: "#0369a1",
    accentSoft: "#f0f9ff",
    inputLabel: "場所のメモ・段差や設備の状況（または現場写真をアップロード）",
    inputPlaceholder: "例: 駅東口の横断歩道出口に約5cmの段差と狭い歩道あり。50m先にスロープ付きエレベーターあり。",
    sampleText:
      "【場所】新宿駅西口 地下連絡通路 B12出口付近\n【状況】地上への階段のみ（約25段）でエレベーターが離れている。手前の歩道は点字ブロック横に約4cmの段差があり、雨天時は滑りやすい。南側80mの商業ビル側に大型エレベーターと緩やかなスロープあり。\n※車いす・ベビーカー利用者が安心して通れるルート情報として地域マップに登録したい。",
    sampleLocation: "東京都新宿区西新宿1丁目",
    showLocationInput: true,
    submitLabel: "通行難易度とバリアフリー情報を判定",
    section1Title: "1. 車いす・ベビーカー・高齢者別の通行評価",
    section2Title: "2. 現地での安全ポイント＆迂回・設備チェック",
    section3Title: "3. 地域バリアフリーマップ共有カード（コピー用）",
    gasPrefix: "[バリアフリーマップ]",
    systemInstruction:
      "あなたは車いす・ベビーカー・高齢者・視覚障害のある方の移動を支援するバリアフリー街歩きアナリストです。現場写真・メモ・位置情報から、alert_level (high/medium/low)、alert_title（通行難易度と総合判定）、alert_message（段差・幅員・代替ルートの要点）、items（車いす・ベビーカー・高齢者など視点別の通行可否と注意点）、checklist（近隣のエレベーター・多目的トイレ・スロープ確認項目）、copyable_draft（地域マップ・SNS・自治体共有用のバリアフリー情報テキスト）、suggested_tasks（現地再確認・改善提案のフォローアップタスク）を日本語で構造化してください。",
  },
};
