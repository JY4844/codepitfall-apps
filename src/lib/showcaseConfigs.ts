export type ShowcaseAppId =
  | "okusuri"
  | "receipt"
  | "contract"
  | "gomi"
  | "barrierfree"
  | "allergy"
  | "disaster"
  | "petcare"
  | "kaigo"
  | "pitch"
  | "english"
  | "minutes"
  | "heatstroke"
  | "foodloss"
  | "inbound"
  | "fridge"
  | "nazenaze"
  | "shikaku"
  | "softmail"
  | "akiya"
  | "nenmatsu"
  | "hikkoshi"
  | "kodomokyuu"
  | "moshimo"
  | "kaji"
  | "subsc"
  | "kaden"
  | "pta"
  | "norikae"
  | "sagi"
  | "invoice"
  | "dokusho"
  | "gokinjo"
  | "codemistake"
  | "tsundoku"
  | "zuborali"
  | "shinsei"
  | "taishoku"
  | "tenpu"
  | "packing"
  | "byoinmemo"
  | "hoshosho"
  | "kafun"
  | "denki"
  | "gift"
  | "shaken"
  | "kakeibo"
  | "sleep"
  | "bento"
  | "studyplan"
  | "renrakucho"
  | "water";

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
  allergy: {
    id: "allergy",
    name: "アレルゲン安心レンズ",
    category: "暮らしと家族の部門",
    tagline: "食品パッケージや外食メニューを撮るだけで家族のアレルゲンと交差接触リスクを即警告",
    subtitle:
      "原材料表示の写真やメニュー文面から、Gemini 3.8 Flash が特定原材料・コンタミネーション注意・代替案を構造化し、家族へ共有します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 食物アレルギー支援",
    accentColor: "#e11d48",
    accentSoft: "#fff1f2",
    inputLabel: "家族のアレルギー対象と食品の原材料表示・メニュー（または写真）",
    inputPlaceholder: "例: 対象: 卵・乳・くるみ / 原材料: 小麦粉、植物油脂、脱脂粉乳、全卵粉末...",
    sampleText:
      "【家族のアレルギー対象】小学生の子ども：卵・乳製品・くるみ\n【確認したい食品】市販のクッキー原材料：小麦粉（国内製造）、砂糖、ショートニング、アーモンドプードル、ホエイパウダー、加糖練乳、食塩／膨脹剤、乳化剤（大豆由来）※本品製造工場では卵・くるみを含む製品を生産しています。",
    submitLabel: "アレルゲンと交差接触リスクを診断",
    section1Title: "1. 検出されたアレルゲン・原材料チェック",
    section2Title: "2. 購入・飲食前に確認すべき安全チェックリスト",
    section3Title: "3. 家族・園・学校へそのまま送れる確認メモ",
    gasPrefix: "[アレルゲン安心レンズ]",
    systemInstruction:
      "あなたは食物アレルギーのある家族の安全な食生活を支える情報整理アシスタントです（最終判断は必ずメーカー表示・医師の指示を優先するよう明記してください）。入力されたアレルギー対象と原材料表示から、alert_level (high/medium/low)、alert_title（摂取可否の警戒判定）、alert_message（該当アレルゲンと製造ラインのコンタミ注意）、items（検出成分ごとのリスクと由来）、checklist（店舗・メーカー確認項目や代替食品のヒント）、copyable_draft（家族や学校・親戚への共有メモ）、suggested_tasks（代替おやつ購入や成分表確認のタスク）を日本語で構造化してください。",
  },
  disaster: {
    id: "disaster",
    name: "わが家の防災バッグ診断",
    category: "暮らしと家族の部門",
    tagline: "備蓄棚や防災リュックを撮るだけで家族構成に合わせた不足品と賞味期限を診断",
    subtitle:
      "防災グッズの写真やリストから、Gemini 3.8 Flash が3日間の生存に必要な不足アイテムとローリングストック点検予定を自動生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家庭防災診断 AI",
    accentColor: "#ea580c",
    accentSoft: "#fff7ed",
    inputLabel: "家族構成と現在の防災バッグ・備蓄品リスト（または写真）",
    inputPlaceholder: "例: 夫婦＋2歳児＋猫1匹 / 水2L×3本、アルファ米4食、懐中電灯1個...",
    sampleText:
      "【家族構成】大人2人、2歳の幼児1人、高齢の母1人（持病薬あり）\n【現在の備蓄】水2L×3本（2026年12月期限）、乾パン2缶、レトルトご飯6食、LEDランタン1個、モバイルバッテリー1台、絆創膏\n※3日間在宅避難できるか不足品を診断し、半年に1回の点検予定を組みたい。",
    submitLabel: "不足品とローリングストック計画を診断",
    section1Title: "1. 家族構成別の不足アイテム＆優先度",
    section2Title: "2. 今週末に揃える買い足しチェックリスト",
    section3Title: "3. 家族共有用の備蓄＆避難メモ（コピー用）",
    gasPrefix: "[わが家の防災バッグ診断]",
    systemInstruction:
      "あなたは家庭の災害備蓄とローリングストックを支援する防災アドバイザーです。家族構成と備蓄状況から、alert_level (high/medium/low)、alert_title（現在の防災充足度判定）、alert_message（水・衛生・幼児/高齢者特有の最優先不足点）、items（カテゴリ別の充足状況と必要量）、checklist（すぐ買い足すべきアイテムリスト）、copyable_draft（家族で共有する備蓄・集合場所メモ）、suggested_tasks（賞味期限チェック・半年後点検のカレンダー登録タスク）を日本語で構造化してください。",
  },
  petcare: {
    id: "petcare",
    name: "ペット症状メモ＆受診ガイド",
    category: "暮らしと家族の部門",
    tagline: "犬・猫の気になる症状メモから獣医師へ伝える問診票と緊急度・持ち物を整理",
    subtitle:
      "ペットの様子や写真・メモから、Gemini 3.8 Flash が診察室でそのまま見せられる時系列の問診メモと受診チェックリストを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ペット見守り AI",
    accentColor: "#7c3aed",
    accentSoft: "#f5f3ff",
    inputLabel: "ペットの種類・年齢・気になる症状や食事メモ（または写真）",
    inputPlaceholder: "例: 柴犬8歳、今朝から食欲がなく2回吐いた。普段のフードは変えていない...",
    sampleText:
      "【ペット】柴犬（オス・9歳・体重10.5kg）\n【症状】昨夜から元気があまりなく、今朝フードを半分残して透明な胃液を1回吐いた。水は少しずつ飲んでいる。下痢はなし。散歩は少し歩きたがらない。\n※動物病院へ行くべき緊急度の目安と、先生に正確に伝えるための問診メモを作りたい。",
    submitLabel: "緊急度目安と獣医師向け問診メモを作成",
    section1Title: "1. 観察ポイント＆緊急度の確認項目",
    section2Title: "2. 動物病院へ行く前の持ち物・撮影チェックリスト",
    section3Title: "3. 獣医師にそのまま見せられる時系列問診メモ",
    gasPrefix: "[ペット受診ガイド]",
    systemInstruction:
      "あなたはペットの飼い主が動物病院で正確に症状を伝えられるよう支援する情報整理アシスタントです（獣医療診断は行わず、異常があれば速やかに動物病院を受診するよう案内してください）。入力されたペット情報と症状から、alert_level (high/medium/low)、alert_title（受診検討の緊急度目安）、alert_message（すぐ受診すべき危険サインの確認）、items（症状別の観察ポイント）、checklist（病院へ持参すべきもの・事前に記録すべき項目）、copyable_draft（獣医師にそのまま提示できる簡潔な問診メモ）、suggested_tasks（経過観察・ワクチン/投薬リマインドタスク）を日本語で構造化してください。",
  },
  kaigo: {
    id: "kaigo",
    name: "介護・通院バトンノート",
    category: "暮らしと家族の部門",
    tagline: "デイサービス連絡帳や診察メモを撮るだけで家族・きょうだい間の介護引き継ぎを自動化",
    subtitle:
      "介護連絡票や通院メモから、Gemini 3.8 Flash が体調変化・次回受診の準備・家族への共有サマリーを構造化し、カレンダーへ連携します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 介護チーム連携 AI",
    accentColor: "#0d9488",
    accentSoft: "#f0fdfa",
    inputLabel: "デイサービス連絡帳・診察メモ・ケアマネ連絡内容（または写真）",
    inputPlaceholder: "例: 血圧138/82、昼食8割摂取。来週火曜の整形外科受診時に紹介状が必要...",
    sampleText:
      "【デイサービス連絡帳】11/19 血圧142/84、体温36.5℃。昼食は7割摂取、水分少なめ。午後の歩行訓練で右膝の痛みを訴えたため途中で休憩。\n【ケアマネ連絡】次回11/26の整形外科受診時に、お薬手帳と現在の痛みメモを持参してください。12月分のサービス利用票の押印も11/28までにお願いします。",
    submitLabel: "体調変化と家族引き継ぎノートを生成",
    section1Title: "1. バイタル・体調変化の注目ポイント",
    section2Title: "2. 次回受診・手続きの引き継ぎチェックリスト",
    section3Title: "3. 家族グループへそのまま送れる共有レポート",
    gasPrefix: "[介護バトンノート]",
    systemInstruction:
      "あなたは介護を分担する家族・きょうだい間の情報共有を支援する介護連携アシスタントです。連絡帳やケアマネ連絡の内容から、alert_level (high/medium/low)、alert_title（今日の体調＆引き継ぎ重要度）、alert_message（特に注意すべき体調変化や期限）、items（バイタル・食事・水分・痛み等の整理）、checklist（受診準備・書類提出などの引き継ぎチェック）、copyable_draft（離れて暮らすきょうだいへLINE等でそのまま送れる簡潔な共有レポート）、suggested_tasks（受診予定・書類提出期限のカレンダータスク）を日本語で構造化してください。",
  },
  pitch: {
    id: "pitch",
    name: "90秒ピッチ・面接リハーサルコーチ",
    category: "はたらく・まなぶ部門",
    tagline: "発表原稿やESを入れるだけで審査員・面接官の鋭い想定質問と改善スクリプトを即生成",
    subtitle:
      "ハッカソン発表原稿や面接自己PRから、Gemini 3.8 Flash が論理の穴・想定ツッコミ質問・説得力を高める改善案を構造化します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 審査・面接コーチ",
    accentColor: "#4f46e5",
    accentSoft: "#eef2ff",
    inputLabel: "発表原稿・企画概要・面接の自己PR（またはスライド写真）",
    inputPlaceholder: "例: 90秒ピッチ原稿：私たちは地域の防災課題を解決するために...",
    sampleText:
      "【90秒ハッカソン発表原稿】\n私は学生時代に専門書で挫折した経験から、AI学習アプリを作りました。ノートを撮るとGeminiがわかりやすく解説してくれて、クイズも作ってくれます。データベースにも保存できるので復習もバッチリです。これで世界中の学生の勉強を楽にしたいです！\n※審査員から突っ込まれそうな弱点と、グランプリを狙える改善スクリプトを作ってほしい。",
    submitLabel: "審査員目線の想定質問と改善案を生成",
    section1Title: "1. 審査員・面接官からの鋭い想定質問＆弱点指摘",
    section2Title: "2. 本番までに磨くべき構成チェックリスト",
    section3Title: "3. 説得力を引き上げた 90 秒ブラッシュアップ原稿",
    gasPrefix: "[90秒ピッチコーチ]",
    systemInstruction:
      "あなたはコンテスト審査員および採用面接官の視点を持つ厳しくも温かいプレゼンコーチです。入力された原稿から、alert_level (high/medium/low)、alert_title（現状の説得力・差別化診断）、alert_message（審査員が一番最初に疑問に思う核心ポイント）、items（鋭い想定質問3〜4個と模範回答の方向性）、checklist（本番前の時間配分・デモ見せ方チェック）、copyable_draft（課題→独自性→変化が際立つ90秒改善スクリプト）、suggested_tasks（リハーサル・検証データ収集のタスク）を日本語で構造化してください。",
  },
  english: {
    id: "english",
    name: "専門英語・論文スキャナー",
    category: "はたらく・まなぶ部門",
    tagline: "英語論文や海外エラー画面を撮るだけで背景前提・3行要約・英語返信文まで一括生成",
    subtitle:
      "英語の論文アブストラクトや技術ドキュメントから、Gemini 3.8 Flash が専門用語をかみ砕き、実務で使える英語質問文まで作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 専門英語リーディング",
    accentColor: "#0284c7",
    accentSoft: "#f0f9ff",
    inputLabel: "英語論文・技術ドキュメント・英語エラー文（またはスクリーンショット）",
    inputPlaceholder: "例: We propose a lightweight retrieval-augmented framework that reduces hallucination...",
    sampleText:
      "Abstract: While large multimodal models excel at zero-shot visual reasoning, their structured outputs frequently degrade under noisy real-world mobile captures. We introduce a two-stage schema-constrained decoding pipeline that improves JSON validity by 34% while cutting latency by 41% on edge-to-cloud hybrid workloads.",
    submitLabel: "専門英語の要点と用語・質問文を生成",
    section1Title: "1. 専門用語・キーフレーズのかみ砕き解説",
    section2Title: "2. 論文・技術文書を読み解く確認チェックリスト",
    section3Title: "3. 日本語 3 行要約 ＋ そのまま使える英語質問・返信文",
    gasPrefix: "[専門英語スキャナー]",
    systemInstruction:
      "あなたは英語論文や海外技術文書の読解を支援するバイリンガル研究・開発チューターです。入力された英文から、alert_level (high/medium/low)、alert_title（読解難易度＆最重要結論）、alert_message（この英文が主張する一番のブレイクスルーや注意点）、items（専門用語・重要表現の直感的な日本語解説）、checklist（本文で次に確認すべき実験条件や前提チェック）、copyable_draft（日本語3行要約＋著者に質問したりIssueに投稿したりできる自然な英語メッセージ例）、suggested_tasks（関連概念の復習・検証タスク）を日本語で構造化してください。",
  },
  minutes: {
    id: "minutes",
    name: "ホワイトボード＆会議アクション化",
    category: "はたらく・まなぶ部門",
    tagline: "会議後のホワイトボード写真や雑多なメモを決定事項と期限つきタスクへ自動変換",
    subtitle:
      "手書きホワイトボードや箇条書きメモから、Gemini 3.8 Flash が決定事項・未決課題・担当者別タスクを抽出し、カレンダーへ一括登録します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 議事録アクション AI",
    accentColor: "#2563eb",
    accentSoft: "#eff6ff",
    inputLabel: "会議メモ・チャットログ（またはホワイトボード写真をアップロード）",
    inputPlaceholder: "例: 11/25までにLP公開。デザイン佐藤、文言田中。予算は来週再確認...",
    sampleText:
      "【プロジェクト定例メモ 11/19】\n・新機能のβ公開日は11/28（金）で合意\n・API制限対策：山田さんが11/22までにキャッシュ導入案を作る\n・LPのデモ動画：佐藤さんが11/25までに90秒版を収録\n・未決：有料プランの価格帯（500円か980円か）は次回11/24の会議で最終決定\n・鈴木さんは競合3社の価格表をそれまでにスプレッドシートにまとめる",
    submitLabel: "決定事項と期限つきタスクを抽出",
    section1Title: "1. 担当者別アクションアイテム＆決定事項",
    section2Title: "2. 次回会議までに解消すべき未決事項チェック",
    section3Title: "3. Slack・メールにそのまま貼れる議事録サマリー",
    gasPrefix: "[会議アクション化]",
    systemInstruction:
      "あなたは会議の生産性を最大化する優秀なプロジェクトマネージャーです。ホワイトボード写真や会議メモから、alert_level (high/medium/low)、alert_title（会議の進捗・リスク総評）、alert_message（期限が迫っている最重要アクションや未決リスク）、items（決定事項・担当者別タスクと期限）、checklist（次回会議の冒頭で確認すべき未決事項リスト）、copyable_draft（Slackやメールにそのまま共有できる整形済み議事録）、suggested_tasks（担当者・期限つきのGoogleカレンダー登録タスク）を日本語で構造化してください。",
  },
  heatstroke: {
    id: "heatstroke",
    name: "地域の熱中症・みまもり予報",
    category: "まちと地球の未来部門",
    tagline: "気象・屋外イベント情報から子ども・高齢者・作業者別の危険度と予防行動を配信",
    subtitle:
      "地域の気温・湿度や屋外行事メモから、Gemini 3.8 Flash が対象別の警戒レベル・給水計画・涼み処チェックリストを構造化します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域みまもり防災",
    accentColor: "#dc2626",
    accentSoft: "#fef2f2",
    inputLabel: "地域の気象状況・屋外イベントや見守り対象のメモ",
    inputPlaceholder: "例: 明日36℃・湿度75%予報。小学校の運動会練習と町内会の清掃活動あり...",
    sampleText:
      "【地域状況】最高気温36℃、湿度72%、無風、熱中症警戒アラート発表見込み\n【地域予定】午前9時〜11時：町内会の公園草刈り（高齢者15名参加予定）／午後1時〜3時：地域少年サッカー練習（小学生20名）\n※参加者別の危険度判定と、町内会・保護者向けの見守り案内を作りたい。",
    sampleLocation: "東京都練馬区光が丘公園周辺",
    showLocationInput: true,
    submitLabel: "対象別の危険度と予防アクションを生成",
    section1Title: "1. 高齢者・子ども・屋外作業者別の危険度トリアージ",
    section2Title: "2. 開催判断・給水・冷却の安全チェックリスト",
    section3Title: "3. 町内会・保護者連絡網にそのまま貼れる注意喚起文",
    gasPrefix: "[熱中症みまもり予報]",
    systemInstruction:
      "あなたは地域の熱中症予防と高齢者・子どもの見守りを支援する公衆衛生防災アシスタントです。気象条件と地域行事メモから、alert_level (high/medium/low)、alert_title（総合警戒レベルと中止・短縮判断目安）、alert_message（最も危険な時間帯と対象者への警告）、items（高齢者・子ども・屋外作業者別の具体リスクと対策）、checklist（クーリングシェルター・塩分水分・見守り巡回チェック）、copyable_draft（町内会LINEや保護者連絡網へそのまま送れるやさしい注意喚起文）、suggested_tasks（当日の声かけ・給水アラームのカレンダー登録タスク）を日本語で構造化してください。",
  },
  foodloss: {
    id: "foodloss",
    name: "まちのフードドライブ支援",
    category: "まちと地球の未来部門",
    tagline: "余剰食品の写真を送るだけでフードバンク受入可否・仕分け・寄付リストを自動作成",
    subtitle:
      "家庭や商店で余った食品の写真・メモから、Gemini 3.8 Flash が賞味期限や保存条件を確認し、地域フードドライブへの寄付手順を整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 食品ロス削減 AI",
    accentColor: "#16a34a",
    accentSoft: "#f0fdf4",
    inputLabel: "寄付したい余剰食品のメモ・賞味期限（または食品の写真）",
    inputPlaceholder: "例: 未開封レトルトカレー5箱（2027年3月）、缶詰3個、開封済みパスタ1袋...",
    sampleText:
      "【家庭・職場の余剰食品】\n1. 未開封レトルトカレー 6箱（常温保存・賞味期限2027年4月）\n2. 未開封ツナ缶 4缶（賞味期限2027年8月）\n3. 開封済みの小麦粉 1袋（残量半分）\n4. 要冷蔵のヨーグルト 2パック（賞味期限あと3日）\n※地域のフードドライブ窓口に持ち込めるものだけを仕分けして寄付メモを作りたい。",
    sampleLocation: "地域の社会福祉協議会・フードドライブ窓口",
    showLocationInput: true,
    submitLabel: "受入可否の仕分けと寄付リストを作成",
    section1Title: "1. 品目別のフードドライブ受入可否判定",
    section2Title: "2. 持ち込み前の梱包・確認チェックリスト",
    section3Title: "3. フードバンク窓口へ渡せる寄付品目リスト",
    gasPrefix: "[まちのフードドライブ]",
    systemInstruction:
      "あなたは地域のフードドライブと食品ロス削減を支援するサステナビリティ案内役です。入力された食品リスト・写真から、alert_level (high/medium/low)、alert_title（寄付可能品目の総合判定）、alert_message（未開封・常温・賞味期限1〜2ヶ月以上などの基本ルールとNG品目の理由）、items（各食品の受入可否と理由・自宅消費の提案）、checklist（持ち込み前の状態確認・持ち運びチェック）、copyable_draft（フードドライブ窓口へ添えられる簡潔な寄付品目一覧）、suggested_tasks（窓口持ち込み予定・自宅消費リマインドのカレンダータスク）を日本語で構造化してください。",
  },
  inbound: {
    id: "inbound",
    name: "まちの多言語あんしん案内メーカー",
    category: "まちと地球の未来部門",
    tagline: "商店街POPや避難所チラシを撮るだけでやさしい日本語＋英中韓の多言語案内を即生成",
    subtitle:
      "地域のお知らせ・災害避難案内・店舗ルールを撮るだけで、Gemini 3.8 Flash が外国人住民や旅行者にも伝わる多言語案内カードへ変換します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 多文化共生・多言語 AI",
    accentColor: "#0891b2",
    accentSoft: "#ecfeff",
    inputLabel: "多言語化したいチラシ・案内文・店舗ルール（または写真）",
    inputPlaceholder: "例: 避難所開設のお知らせ：台風接近のため市民体育館を17時より開設します...",
    sampleText:
      "【地域防災・避難所案内】\n台風接近に伴い、本日17時より「中央小学校体育館」を自主避難所として開設します。水・食料・常備薬・毛布は各自でご持参ください。ペット同伴の方は校舎1階の専用スペースをご利用ください。発熱がある方は受付でお申し出ください。\n※地域の外国人住民・観光客にもすぐ伝わるよう、やさしい日本語・英語・中国語・韓国語で案内カードを作りたい。",
    submitLabel: "やさしい日本語＋英中韓の多言語案内を生成",
    section1Title: "1. 言語別の要点カード（やさしい日本語 / 英語 / 中国語 / 韓国語）",
    section2Title: "2. 掲示・配布前のユニバーサルデザイン確認リスト",
    section3Title: "3. 印刷・SNS 掲示にそのまま使える多言語お知らせ全文",
    gasPrefix: "[多言語あんしん案内]",
    systemInstruction:
      "あなたは多文化共生と災害時多言語支援の専門家です。入力された日本語の地域案内・チラシ・店舗ルールから、alert_level (high/medium/low)、alert_title（伝達緊急度と対象者サマリー）、alert_message（誤解されやすい日本特有の表現や最重要伝達事項）、items（やさしい日本語・英語・中国語(簡体字)・韓国語の4カード：labelに言語名、badgeに用途、detailに自然な翻訳）、checklist（ふりがな・ピクトグラム・問い合わせ先明記などの掲示チェック）、copyable_draft（掲示板・PDF・SNSにそのまま貼れる4言語まとめテキスト）、suggested_tasks（掲示更新・多言語確認のタスク）を構造化してください。",
  },
  fridge: {
    id: "fridge",
    name: "冷蔵庫スッキリ献立 AI",
    category: "暮らしと家族の部門",
    tagline: "冷蔵庫の残り物写真から買い足しゼロの時短レシピと食材使い切り順を提案",
    subtitle:
      "冷蔵庫の中身や残り物メモから、Gemini 3.8 Flash が傷みやすい食材を優先した救済レシピと最小限の買い足しメモを自動生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 食材救済レシピ",
    accentColor: "#059669",
    accentSoft: "#ecfdf5",
    inputLabel: "冷蔵庫にある残り物・賞味期限が近い食材（または写真）",
    inputPlaceholder: "例: 半端な大根1/3本、使いかけのツナ缶1個、卵2個、賞味期限間近の牛乳300ml",
    sampleText:
      "【冷蔵庫の残り物】\n・しなびかけの大根 1/3本、長ねぎ 1/2本\n・賞味期限が明日の豆腐 1丁、卵 2個\n・使いかけの豚ひき肉 150g、スライスチーズ 2枚\n※買い物に行かずに20分以内で作れる家族向けの夕食レシピを提案してほしい。",
    submitLabel: "今ある食材だけで救済レシピを生成",
    section1Title: "1. 優先消費すべき食材＆時短レシピ提案",
    section2Title: "2. 調理の段取り＆フードロス防止チェック",
    section3Title: "3. 家族へ送れる今日の献立＆買い足しゼロメモ",
    gasPrefix: "[冷蔵庫スッキリ献立]",
    systemInstruction:
      "あなたは家庭の食品ロスをなくす時短料理アドバイザーです。冷蔵庫の残り物から、alert_level (high/medium/low)、alert_title（今すぐ使い切るべき最優先食材）、alert_message（鮮度・保存上の注意点）、items（提案レシピ2〜3品：手順と所要時間）、checklist（下ごしらえや保存のコツ）、copyable_draft（家族に共有できる今日の献立と買い物メモ）、suggested_tasks（冷凍保存・使い切りリマインドタスク）を日本語で構造化してください。",
  },
  nazenaze: {
    id: "nazenaze",
    name: "子どもの「なぜなぜ」図鑑メーカー",
    category: "暮らしと家族の部門",
    tagline: "子どもの素朴な疑問を「やさしい例え・5分実験・親子クイズ」のミニ図鑑に変換",
    subtitle:
      "「なぜ空は青いの？」などの疑問から、Gemini 3.8 Flash が年齢に合わせた例え話と家でできる体験遊びを構造化生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 親子探究図鑑",
    accentColor: "#f59e0b",
    accentSoft: "#fffbeb",
    inputLabel: "子どもの年齢と「なぜ？」「どうして？」の質問",
    inputPlaceholder: "例: 5歳児「なんで海の水はしょっぱいのに、雨はしょっぱくないの？」",
    sampleText:
      "【子ども】小学1年生（7歳）\n【質問】「なんで空は昼間は青いのに、夕方は赤くなるの？夜はどうして暗いの？」\n※専門用語を使わずに、家にある懐中電灯やコップで一緒に試せる実験も教えてほしい。",
    submitLabel: "親子で楽しめるミニ図鑑を生成",
    section1Title: "1. 子ども向けやさしい例え話＆仕組みカード",
    section2Title: "2. おうちでできる 5 分プチ実験チェックリスト",
    section3Title: "3. そのまま読み聞かせできる親子お話し台本",
    gasPrefix: "[なぜなぜ図鑑]",
    systemInstruction:
      "あなたは幼児・小学生の好奇心を伸ばす優しい科学の先生です。子どもの質問から、alert_level (high/medium/low)、alert_title（今日の疑問テーマ）、alert_message（親が答えるときのいちばん大切な視点）、items（年齢に合わせたたとえ話・なぜそうなるか・関連する豆知識）、checklist（家にある身近な道具でできる5分実験の安全手順）、copyable_draft（そのまま読み聞かせできるやさしいお話し台本）、suggested_tasks（図書館で借りる本や週末の観察予定）を日本語で構造化してください。",
  },
  shikaku: {
    id: "shikaku",
    name: "資格・試験「苦手つぶし」問題集メーカー",
    category: "はたらく・まなぶ部門",
    tagline: "間違えた問題やテキストの抜粋から類題・ひっかけ対策・暗記ポイントを自動生成",
    subtitle:
      "資格試験や定期テストの苦手メモから、Gemini 3.8 Flash が失点パターンを分析し、本番で点を落とさない演習セットを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 試験対策コーチ",
    accentColor: "#6366f1",
    accentSoft: "#eef2ff",
    inputLabel: "目指す資格・テスト名と、間違えた問題や苦手な単元",
    inputPlaceholder: "例: 情報セキュリティマネジメント：共通鍵暗号と公開鍵暗号の使い分けがよく混乱する",
    sampleText:
      "【試験】ITパスポート／基本情報技術者\n【苦手な単元】データベースの正規化（第1・第2・第3正規形）とトランザクションのACID特性。\n毎回選択肢のひっかけで間違えてしまうので、見分け方と類題を作って復習したい。",
    submitLabel: "弱点分析と類題演習セットを生成",
    section1Title: "1. 失点パターンの分析＆覚え方カード",
    section2Title: "2. 本番で迷わないための見分けチェックリスト",
    section3Title: "3. そのまま復習ノートに貼れる要点＆類題まとめ",
    gasPrefix: "[苦手つぶし問題集]",
    systemInstruction:
      "あなたは難関資格の合格者を多数育てたプロ講師です。受験生の苦手単元やミス内容から、alert_level (high/medium/low)、alert_title（つまずきの核心原因）、alert_message（試験で狙われやすいひっかけポイント）、items（混同しやすい概念の比較と直感的な覚え方）、checklist（問題文を読むときの確認手順）、copyable_draft（オリジナル類題2問＋解説＋暗記まとめ）、suggested_tasks（3日後・1週間後の復習カレンダー登録タスク）を日本語で構造化してください。",
  },
  softmail: {
    id: "softmail",
    name: "クレーム・お断りメール角なし変換 AI",
    category: "はたらく・まなぶ部門",
    tagline: "感情的になりがちな断り・催促・謝罪の下書きを相手別の丁寧なビジネス文面へ変換",
    subtitle:
      "言いにくいお断りや納期催促のメモから、Gemini 3.8 Flash が関係を壊さないクッション言葉つきの返信案と送信前チェックを生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ビジネスマナー AI",
    accentColor: "#0f172a",
    accentSoft: "#f1f5f9",
    inputLabel: "伝えたい本音・状況（相手との関係性もあれば記入）",
    inputPlaceholder: "例: 取引先に先週頼んだ見積もりがまだ来ない。急いでいるので今日中にほしい。",
    sampleText:
      "【相手】取引先の担当者（今後も付き合いは続けたい）\n【本音】提案された金額が予算オーバーなので今回は見送りたい。ただ、来期の別案件ではまた相談したいので、角を立てずに丁寧にお断りしたい。",
    submitLabel: "角の立たない丁寧なメール文面を生成",
    section1Title: "1. シーン別・相手別の言い換えポイント",
    section2Title: "2. 送信前に確認すべき配慮・誤解防止チェック",
    section3Title: "3. そのままコピーして送れるビジネスメール文面",
    gasPrefix: "[角なしメール変換]",
    systemInstruction:
      "あなたはビジネスコミュニケーションと顧客対応の専門家です。ユーザーの本音・状況から、alert_level (high/medium/low)、alert_title（相手の受け止めリスク診断）、alert_message（関係を損ねないための最重要配慮ポイント）、items（クッション言葉・代替案・感謝の伝え方の3つの工夫）、checklist（送信前の件名・誤解表現・敬称確認チェック）、copyable_draft（件名つきのそのまま送れる丁寧なビジネスメール完成文）、suggested_tasks（返信確認や次回フォローのタスク）を日本語で構造化してください。",
  },
  akiya: {
    id: "akiya",
    name: "空き家・地域資源マッチング診断",
    category: "まちと地球の未来部門",
    tagline: "地域の空き家や遊休施設の写真から防災倉庫・子育て拠点などの再生プランを自動立案",
    subtitle:
      "空き家や空き店舗の写真・条件から、Gemini 3.8 Flash が地域課題に合った活用案・修繕リスク・自治体相談メモを構造化生成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域再生まちづくり",
    accentColor: "#b45309",
    accentSoft: "#fef3c7",
    inputLabel: "空き家・遊休スペースの場所、広さ、状態メモ（または写真）",
    inputPlaceholder: "例: 商店街の元文具店（1階40平米・駅徒歩4分）。シャッターは動くが水回り古め。",
    sampleText:
      "【物件】商店街の空き店舗（1階45平米、駅徒歩5分、築40年木造）\n【周辺環境】近くに小学校と高齢者の多い住宅街がある。平日の日中と放課後に地域の居場所や防災備蓄拠点として使えないか検討中。",
    sampleLocation: "地域の商店街・駅徒歩5分",
    showLocationInput: true,
    submitLabel: "地域活用プランと安全・補助金チェックを生成",
    section1Title: "1. 地域ニーズに合う活用アイデア 3 案",
    section2Title: "2. 利活用前の耐震・法規・地域合意チェックリスト",
    section3Title: "3. 自治体・商工会へ相談するための企画メモ",
    gasPrefix: "[地域資源マッチング]",
    systemInstruction:
      "あなたは空き家再生と地域コミュニティづくりのまちづくりプランナーです。物件条件や写真から、alert_level (high/medium/low)、alert_title（活用ポテンシャルと初期確認リスク）、alert_message（耐震・消防・用途変更などの重要確認事項）、items（地域課題に寄り添う活用案3つと想定利用者）、checklist（現地内覧や自治体補助金窓口で確認すべき項目）、copyable_draft（地域協議会や自治体へそのまま提出できる企画相談メモ）、suggested_tasks（現地調査・商工会相談のカレンダー登録タスク）を日本語で構造化してください。",
  },
  nenmatsu: {
    id: "nenmatsu",
    name: "控除・医療費スッキリナビ",
    category: "はたらく・まなぶ部門",
    tagline: "控除証明書や病院領収書を撮るだけで年末調整・確定申告の入力項目と必要書類を整理",
    subtitle:
      "XやInstagramで毎年嘆かれる「控除書類が意味不明」「医療費領収書の計算が面倒」を解決。Gemini 3.8 Flash が書類別の記入先と提出チェックリストを構造化します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 申告書類ナビ",
    accentColor: "#0f766e",
    accentSoft: "#f0fdfa",
    inputLabel: "手元の控除証明書・医療費領収書メモ・家族状況（または写真）",
    inputPlaceholder: "例: 生命保険料控除証明書2枚、ふるさと納税ワンストップ特例、今年の医療費合計12万円...",
    sampleText:
      "【状況】会社員（年末調整＋医療費控除の確定申告を検討中）\n【手元の書類】\n・一般生命保険料控除証明書（年間払込 85,000円）\n・個人年金保険料控除証明書（年間払込 60,000円）\n・家族3人分の病院・薬局の領収書（合計 約118,000円）\n・ふるさと納税 4自治体分\n※どこに何を書けばいいか、医療費控除の対象になるか整理したい。",
    submitLabel: "控除項目と提出チェックリストを整理",
    section1Title: "1. 書類別の判定（年末調整 / 確定申告の記入先）",
    section2Title: "2. 提出前の漏れ・計算ミス防止チェックリスト",
    section3Title: "3. そのまま申告メモ・家族確認に使えるまとめ",
    gasPrefix: "[控除・医療費ナビ]",
    systemInstruction:
      "あなたは年末調整や確定申告の書類整理に悩む会社員・フリーランスを支援する税務情報整理アシスタントです（個別税務判断の最終確認は税務署・勤務先案内を案内してください）。入力された控除書類・医療費情報から、alert_level (high/medium/low)、alert_title（年末調整と確定申告の要否判定）、alert_message（見落としやすい控除対象・上限や期限の注意点）、items（書類ごとの扱いと記入欄の目安）、checklist（紛失確認・再発行・保管期限チェック）、copyable_draft（自分用の申告整理メモ）、suggested_tasks（提出期限・e-Tax準備のカレンダー登録タスク）を日本語で構造化してください。",
  },
  hikkoshi: {
    id: "hikkoshi",
    name: "引っ越し手続きバトンナビ",
    category: "暮らしと家族の部門",
    tagline: "転居条件を入れるだけで役所・インフラ・銀行のバラバラな手続きを時系列タスク化",
    subtitle:
      "SNSで不満の多い「引っ越し後の住所変更が多すぎて限界」を解消。Gemini 3.8 Flash がいつ・どこに・何を持って行くかを家族分担つきで整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 転居コンシェルジュ",
    accentColor: "#2563eb",
    accentSoft: "#eff6ff",
    inputLabel: "引っ越しの条件（単身/家族、自治体またぎ、車・ペット・子どもの有無）",
    inputPlaceholder: "例: 来月15日に別市へ家族3人で引っ越し。軽自動車あり、保育園転園あり。",
    sampleText:
      "【引っ越し条件】12月10日に東京都から神奈川県へ夫婦＋小学生1人で引っ越し（別自治体）\n【保有・契約】マイナンバーカードあり、普通車1台、ペット（犬）1匹、インターネット回線、生命保険2社\n※転出届から14日以内の手続き、学校・犬の登録変更まで漏れなく順番に並べたい。",
    submitLabel: "時系列の手続きロードマップを生成",
    section1Title: "1. 時期別の必須手続きリスト（転居前 / 当日 / 14日以内）",
    section2Title: "2. 窓口へ行く前の持ち物・オンライン完結チェック",
    section3Title: "3. パートナーと分担できる住所変更メモ（コピー用）",
    gasPrefix: "[引っ越しバトンナビ]",
    systemInstruction:
      "あなたは複雑な引っ越し手続きを漏れなく案内するライフイベントコンシェルジュです。転居条件から、alert_level (high/medium/low)、alert_title（手続きの複雑さと最優先期限）、alert_message（14日以内ルールや平日窓口の注意点）、items（時期別・機関別の手続き一覧とオンライン可否）、checklist（マイナンバーカード・車検証・印鑑など持参物チェック）、copyable_draft（家族で分担できる住所変更リスト）、suggested_tasks（転出届・転入届・ライフライン切替のカレンダー登録タスク）を日本語で構造化してください。",
  },
  kodomokyuu: {
    id: "kodomokyuu",
    name: "こども夜間安心トリアージメモ",
    category: "暮らしと家族の部門",
    tagline: "夜間・休日の急な発熱やケガのメモから受診目安・#8000相談用メモを即整理",
    subtitle:
      "育児SNSで切実な「夜間救急に行くべきか焦って判断できない」を支援。Gemini 3.8 Flash が観察すべき危険サインと電話相談で伝える要点を整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 小児見守りメモ",
    accentColor: "#e11d48",
    accentSoft: "#fff1f2",
    inputLabel: "子どもの年齢・体温・現在の様子（いつから・水分・顔色など）",
    inputPlaceholder: "例: 3歳、夜9時に38.9℃。水分は一口ずつ飲めるがぐったり気味...",
    sampleText:
      "【子ども】3歳2ヶ月（体重14kg）\n【経過】夕方18時から38.7℃の発熱。21時時点で39.1℃。咳が少しあるが、けいれんや発疹はなし。麦茶はスプーンで少しずつ飲めている。おしっこは19時に出た。\n※今すぐ夜間救急に行くべきか、#8000（小児救急電話相談）に電話する前に観察点と伝え方を整理したい。",
    submitLabel: "観察ポイントと #8000 相談メモを整理",
    section1Title: "1. 今すぐ受診すべき危険サイン＆観察ポイント",
    section2Title: "2. 受診・電話相談の前に確認すべきチェックリスト",
    section3Title: "3. #8000・小児科医にそのまま読み上げられる経過メモ",
    gasPrefix: "[こども夜間安心メモ]",
    systemInstruction:
      "あなたは夜間・休日の子どもの急変時に保護者が冷静に情報を整理できるよう支援する小児見守り情報アシスタントです（医療診断は行わず、意識障害・呼吸困難・けいれん等があれば迷わず119番・救急受診するよう必ず明記してください）。入力された経過から、alert_level (high/medium/low)、alert_title（受診判断の緊急度目安と#8000活用案内）、alert_message（すぐ救急受診を検討すべき危険サイン）、items（呼吸・水分・排尿・機嫌の観察ポイント）、checklist（受診時の持ち物・記録項目）、copyable_draft（#8000や医師へそのまま読み上げられる時系列メモ）、suggested_tasks（翌朝のかかりつけ医予約・経過メモタスク）を日本語で構造化してください。",
  },
  moshimo: {
    id: "moshimo",
    name: "もしもの家族手続きコンシェルジュ",
    category: "暮らしと家族の部門",
    tagline: "親の入院・介護・相続など「何から手をつければいいか分からない」手続きを時系列化",
    subtitle:
      "SNSで共感の多い「緊急時に銀行・保険・年金の手順がバラバラで疲弊する」を解消。状況に合わせて必要な連絡先と期限を家族で共有できます。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家族手続き支援",
    accentColor: "#475569",
    accentSoft: "#f8fafc",
    inputLabel: "現在の状況（急な入院・退院調整・名義変更・相続など）と関係機関メモ",
    inputPlaceholder: "例: 離れて暮らす父が急に入院。高額療養費制度や保険請求、仕事との調整が分からない。",
    sampleText:
      "【状況】75歳の父が骨折で2週間入院することになった（後期高齢者医療保険加入、民間の医療保険1社あり）\n【困りごと】高額療養費制度や限度額適用認定証の手続き、病院への書類、離れて暮らす姉との分担を何から手をつければいいか順番に整理したい。",
    submitLabel: "手続きの優先順位と家族分担表を生成",
    section1Title: "1. 優先順位つきの手続きステップ（今すぐ / 退院まで / 退院後）",
    section2Title: "2. 病院・保険会社・役所で揃える書類チェックリスト",
    section3Title: "3. 家族・きょうだいに共有できる役割分担メモ",
    gasPrefix: "[もしもの手続き支援]",
    systemInstruction:
      "あなたは急な入院や介護・相続など家族の緊急時に手続きを整理する優しいコンシェルジュです。入力された状況から、alert_level (high/medium/low)、alert_title（最優先で動くべき制度・手続き）、alert_message（申請期限や事前取得で負担が減る制度のポイント）、items（時期別・機関別の手続き内容）、checklist（マイナンバー・保険証・診断書などの必要書類チェック）、copyable_draft（きょうだいや親族へそのまま共有できる役割分担メモ）、suggested_tasks（窓口申請・退院調整のカレンダー登録タスク）を日本語で構造化してください。",
  },
  kaji: {
    id: "kaji",
    name: "名もなき家事みえる化＆感謝ログ",
    category: "暮らしと家族の部門",
    tagline: "1日の家事メモから「見えない負担」を可視化し、無理のない分担と感謝カードを生成",
    subtitle:
      "XやInstagramで絶えない「家事分担の不公平感」を前向きに解決。Gemini 3.8 Flash が名もなき家事を言語化し、パートナーと笑い合える分担案を作ります。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家事みえる化 AI",
    accentColor: "#db2777",
    accentSoft: "#fdf2f8",
    inputLabel: "今日やった家事・パートナーに伝えたいモヤモヤやお願い",
    inputPlaceholder: "例: ゴミ袋の交換、洗剤の詰め替え、保育園の連絡帳、在庫チェックまで全部自分...",
    sampleText:
      "【今日の自分の家事】朝のゴミ出し前の分別と袋セット、トイレットペーパーや洗剤の補充、保育園の持ち物準備、ネットスーパー注文、子どもの上履き洗い\n【モヤモヤ】パートナーは「料理と皿洗い」だけやって満足そう。細かい名もなき家事の多さを責めずに共有して、週末の分担を見直したい。",
    submitLabel: "名もなき家事を可視化して分担案を作成",
    section1Title: "1. 言語化された「名もなき家事」＆負荷バランス",
    section2Title: "2. 責めずに話し合える週末分担チェックリスト",
    section3Title: "3. パートナーへそのまま送れる感謝＆相談メッセージ",
    gasPrefix: "[名もなき家事みえる化]",
    systemInstruction:
      "あなたは夫婦・パートナー間の家事分担を責め合いではなく協力と感謝に変えるライフコーチです。入力された家事メモとモヤモヤから、alert_level (high/medium/low)、alert_title（隠れた負担の診断結果）、alert_message（パートナーに悪気なく見落とされがちなポイント）、items（抽出された名もなき家事の具体リストと所要負荷）、checklist（仕組み化・家電活用・固定担当化の改善案）、copyable_draft（相手を責めずに感謝と協力依頼を伝えるやさしいLINEメッセージ）、suggested_tasks（週末の担当ルーティン・カレンダー登録タスク）を日本語で構造化してください。",
  },
  subsc: {
    id: "subsc",
    name: "サブスク解約忘れガード",
    category: "暮らしと家族の部門",
    tagline: "明細スクショや契約メモから隠れ固定費と解約期限を抽出しカレンダーへ自動通知",
    subtitle:
      "SNSで共感の多い「無料トライアルの解約忘れ」「使っていない自動課金」を防止。Gemini 3.8 Flash が固定費を見える化し解約手順を整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 固定費見直し AI",
    accentColor: "#0f766e",
    accentSoft: "#f0fdfa",
    inputLabel: "利用中のサブスク一覧・明細メモ・無料トライアル期限（またはスクショ）",
    inputPlaceholder: "例: 動画配信1,490円、音楽980円、先月入ったAIツール無料体験が25日まで...",
    sampleText:
      "【今月の引き落とし・無料トライアルメモ】\n・動画配信A：1,490円/月（最近ほぼ見ていない）\n・クラウドストレージB：400円/月（家族と重複契約かも）\n・英語学習アプリC：7日間無料トライアル中（11月24日 23:59までに解約しないと年額14,800円自動課金）\n・ジムD：7,980円/月（今月1回しか行けていない）",
    submitLabel: "ムダ課金リスクと解約手順を診断",
    section1Title: "1. サブスク別の継続／見直し判定",
    section2Title: "2. 解約・重複整理のアクションチェックリスト",
    section3Title: "3. 年間節約額試算＆解約リマインドメモ",
    gasPrefix: "[サブスク解約ガード]",
    systemInstruction:
      "あなたは家計の固定費削減を支援するサブスク整理アドバイザーです。入力された契約・明細メモから、alert_level (high/medium/low)、alert_title（最優先の自動課金警告と年間節約目安）、alert_message（年額課金への自動移行リスクや重複の指摘）、items（サービスごとの継続/解約/プラン変更提案）、checklist（アプリストア/Web解約手順・ファミリー共有確認チェック）、copyable_draft（家族共有や自分用の固定費見直しサマリー）、suggested_tasks（解約期限3日前リマインドのカレンダー登録タスク）を日本語で構造化してください。",
  },
  kaden: {
    id: "kaden",
    name: "家電・保証書トラブルレスキュー",
    category: "暮らしと家族の部門",
    tagline: "家電の型番シールやエラー表示を撮るだけで保証期限・原因切り分け・修理連絡文を生成",
    subtitle:
      "「壊れたのに説明書も保証書も見つからない」を即解決。Gemini 3.8 Flash が症状別の応急処置とメーカーサポートへの連絡文を作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家電サポート AI",
    accentColor: "#0284c7",
    accentSoft: "#f0f9ff",
    inputLabel: "家電の型番・購入時期・出ているエラー表示や症状（または写真）",
    inputPlaceholder: "例: ドラム式洗濯機 NA-VX〇〇、購入2年半、エラーU11が出て排水できない",
    sampleText:
      "【家電】ドラム式洗濯乾燥機（2024年3月購入・延長保証5年あり、レシートは引き出し）\n【症状】脱水前にエラー「U11」が出て止まった。排水口まわりは少し詰まり気味かも。取扱説明書が見当たらない。\n※自分で直せる範囲の応急処置と、ダメだった場合のメーカー修理依頼メモを作りたい。",
    submitLabel: "原因切り分けと修理依頼メモを生成",
    section1Title: "1. 考えられる原因＆安全確認ポイント",
    section2Title: "2. 修理を呼ぶ前に試せるセルフチェックリスト",
    section3Title: "3. メーカー窓口にそのまま送れる修理相談メモ",
    gasPrefix: "[家電レスキュー]",
    systemInstruction:
      "あなたは家電トラブルの一次切り分けと保証管理を支援する親切なサポート担当です（感電・発煙・水漏れ時は必ずコンセントを抜いて専門窓口へ連絡するよう明記してください）。入力された型番・症状から、alert_level (high/medium/low)、alert_title（症状の緊急度と保証対象の可能性）、alert_message（安全上の注意と自己解決できる可能性）、items（主な原因と確認箇所）、checklist（電源抜き・フィルター清掃・型番確認など安全チェック）、copyable_draft（メーカー修理窓口へそのまま貼れる症状・型番・購入日連絡文）、suggested_tasks（保証期限登録・部品点検のカレンダー登録タスク）を日本語で構造化してください。",
  },
  pta: {
    id: "pta",
    name: "PTA・町内会おしらせ回覧 AI",
    category: "まちと地球の未来部門",
    tagline: "役員の雑多なメモから角の立たない回覧文・出欠催促・個人情報配慮チェックを一括生成",
    subtitle:
      "SNSで負担が語られる「PTAや町内会の連絡文作成」を数十秒に短縮。Gemini 3.8 Flash が柔らかい回覧文とプライバシー確認リストを作ります。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域コミュニティ支援",
    accentColor: "#16a34a",
    accentSoft: "#f0fdf4",
    inputLabel: "伝えたい行事・依頼内容・締切メモ（個人名や住所は伏せて入力）",
    inputPlaceholder: "例: 12/7午前9時から公園清掃。軍手持参、雨天中止。出欠を11/30までに出してほしい。",
    sampleText:
      "【団体】〇〇小学校 PTA・地域防犯パトロール係\n【伝えたいこと】12月6日（土）午前9時〜10時に通学路の落ち葉清掃と危険箇所点検を行います。軍手・飲み物持参、小雨決行・荒天中止（当日朝7時半に連絡網でお知らせ）。まだ半数ほど出欠回答が来ていないので、11月29日までにフォーム回答をお願いしたい。\n※強制感を出さず、参加しやすい柔らかい回覧文を作りたい。",
    submitLabel: "柔らかい回覧文と役員チェックリストを生成",
    section1Title: "1. トーン別の工夫ポイント（参加しやすさ・配慮）",
    section2Title: "2. 配布前の個人情報・日程ミス防止チェックリスト",
    section3Title: "3. そのまま印刷・連絡網に貼れる回覧お知らせ完成文",
    gasPrefix: "[PTA・町内会回覧AI]",
    systemInstruction:
      "あなたはPTAや町内会・地域ボランティアの広報負担を軽くするコミュニティ支援ライターです。入力されたメモから、alert_level (high/medium/low)、alert_title（文面のトーン＆伝達漏れリスク診断）、alert_message（保護者が参加しやすい表現の工夫や個人情報配慮の注意点）、items（件名案・柔らかい催促表現・雨天時連絡の工夫）、checklist（配布前の日時/集合場所/個人情報マスキング確認リスト）、copyable_draft（紙の回覧板やメール連絡網にそのまま使える丁寧で温かいお知らせ文）、suggested_tasks（締切リマインド・当日朝判断のカレンダー登録タスク）を日本語で構造化してください。",
  },
  norikae: {
    id: "norikae",
    name: "遅延・子連れ迂回レスキュー",
    category: "まちと地球の未来部門",
    tagline: "電車遅延や大荷物・ベビーカー移動時の状況からパニックを防ぐ迂回・休憩プランを整理",
    subtitle:
      "移動中の突然の運転見合わせに対応。Gemini 3.8 Flash が条件に合う迂回判断・子連れ／バリアフリー確認・遅刻連絡文を一気に作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 移動トラブル支援",
    accentColor: "#7c3aed",
    accentSoft: "#f5f3ff",
    inputLabel: "現在の駅・目的地・遅延状況・移動条件（ベビーカー・大荷物など）",
    inputPlaceholder: "例: 新宿駅で山手線が運転見合わせ。ベビーカーありで東京駅へ15時までに行きたい。",
    sampleText:
      "【現在地】JR新宿駅 付近\n【目的地】東京駅（15:00の待ち合わせ）\n【状況】中央線・山手線が人身事故で運転見合わせ中。ベビーカー＋大きなスーツケースあり。階段ばかりの乗り換えは避けたい。\n※落ち着いて選べる代替移動手段の考え方と、待ち合わせ相手への丁寧な遅刻連絡文を作りたい。",
    sampleLocation: "東京都新宿区新宿駅",
    showLocationInput: true,
    submitLabel: "迂回プランと遅刻連絡文を即生成",
    section1Title: "1. 条件に合う代替ルートの選び方（エレベーター・振替輸送）",
    section2Title: "2. 駅構内・振替乗車前の確認チェックリスト",
    section3Title: "3. 待ち合わせ先・職場へそのまま送れる遅刻連絡文",
    gasPrefix: "[迂回レスキュー]",
    systemInstruction:
      "あなたは鉄道遅延やベビーカー・車いす移動時のパニックを落ち着かせる移動案内アシスタントです（最新の運行状況と振替輸送実施有無は必ず駅員・公式アプリで確認するよう明記してください）。入力された状況から、alert_level (high/medium/low)、alert_title（移動の緊急度と振替輸送確認ポイント）、alert_message（ベビーカー・大荷物時に避けるべき乗り換えや公式運行確認の注意）、items（代替路線の考え方・タクシー相乗り/休憩判断の3つの選択肢）、checklist（振替乗車票・エレベーター位置・ICカード残高確認）、copyable_draft（待ち合わせ相手や職場へすぐ送れる丁寧な遅延連絡メッセージ）、suggested_tasks（経路再確認・到着予定更新タスク）を日本語で構造化してください。",
  },
  sagi: {
    id: "sagi",
    name: "あやしい SMS・SNS 詐欺チェッカー",
    category: "暮らしと家族の部門",
    tagline: "親に届いた怪しい SMS や SNS 広告のスクショから詐欺手口と安全行動を即診断",
    subtitle:
      "高齢の親が一人で抱え込みがちなフィッシング SMS や偽投資広告。Gemini 3.8 Flash が危険サインをわかりやすく解説し、家族と #9110・188 への相談メモを整えます。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家族防犯ガード",
    accentColor: "#dc2626",
    accentSoft: "#fef2f2",
    inputLabel: "届いた SMS・メール・SNS 広告の文面や状況（またはスクショ）",
    inputPlaceholder: "例: 「国税庁より未納税金のお知らせ。本日中に下記URLから納付してください...」",
    sampleText:
      "【70代の親に届いたSMS】\n「【重要】お客様のお荷物は住所不明のため持ち帰りました。本日中に下記リンクより再配達手続きをお願いします。http://example-delivery-check.xyz」\n※親がURLを押しそうで不安。詐欺の根拠と親に優しく説明する文章、もし入力した後の対処法を整理したい。",
    submitLabel: "詐欺リスクと親への説明メモを診断",
    section1Title: "1. 検出された危険サイン＆詐欺手口の特徴",
    section2Title: "2. 絶対にやってはいけないこと＆安全設定チェック",
    section3Title: "3. 親へ優しく送れる説明メモ（#9110 / 188 案内つき）",
    gasPrefix: "[詐欺チェッカー]",
    systemInstruction:
      "あなたは高齢の親をフィッシング詐欺やSNS偽広告から守る優しい防犯アドバイザーです。入力された文面・スクショから、alert_level (high/medium/low)、alert_title（詐欺リスク判定）、alert_message（URLを踏まない・折り返し電話しない等の緊急注意）、items（不自然なドメインや緊急性を煽る文言など危険サイン3点）、checklist（iPhone/Androidの不明送信者フィルタ設定や被害時の#9110・消費者ホットライン188連絡確認）、copyable_draft（親を責めずに安心感を与えるやさしいLINE説明文）、suggested_tasks（実家のスマホ安全設定・共有タスク）を日本語で構造化してください。",
  },
  invoice: {
    id: "invoice",
    name: "副業インボイス・経費仕分けコーチ",
    category: "はたらく・まなぶ部門",
    tagline: "副業の領収書や案件メモから経費区分・インボイス確認・請求メールを一括作成",
    subtitle:
      "副業・フリーランスが悩む「請求書や領収書の管理が面倒」を解決。Gemini 3.8 Flash が勘定科目の目安・記載漏れチェック・請求送信文を構造化します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 副業事務コーチ",
    accentColor: "#2563eb",
    accentSoft: "#eff6ff",
    inputLabel: "副業の売上・経費メモや請求したい案件内容（または領収書写真）",
    inputPlaceholder: "例: Web記事執筆 30,000円（源泉徴収あり？）、取材カフェ代 1,200円、書籍 2,400円",
    sampleText:
      "【今月の副業メモ】\n・デザイン制作案件 1件：報酬 55,000円（税込）、クライアントは法人、自分はインボイス未登録の個人\n・経費メモ：参考書籍 2,860円、打ち合わせカフェ代 1,100円、作業用USBハブ 3,200円\n※経費の勘定科目目安と、クライアントへ送る丁寧な請求連絡文を作りたい。",
    submitLabel: "経費仕分けと請求連絡メモを生成",
    section1Title: "1. 経費の勘定科目目安＆インボイス確認ポイント",
    section2Title: "2. 請求書発行・確定申告前の確認チェックリスト",
    section3Title: "3. クライアントへそのまま送れる請求書送付メール",
    gasPrefix: "[副業インボイスコーチ]",
    systemInstruction:
      "あなたは副業・フリーランス初心者を支援する事務・経理ガイドです（最終的な税務・会計処理は税理士・会計ソフト・税務署の案内に従うよう明記してください）。入力された取引・経費メモから、alert_level (high/medium/low)、alert_title（インボイス・源泉徴収の確認重要度）、alert_message（未登録時の消費税扱いや証憑保管の注意点）、items（各支出の勘定科目目安と家事按分の考え方）、checklist（請求書記載事項・振込期日・領収書保存チェック）、copyable_draft（件名つきの丁寧な請求書送付メール文面）、suggested_tasks（入金確認・月次記帳のカレンダー登録タスク）を日本語で構造化してください。",
  },
  dokusho: {
    id: "dokusho",
    name: "読書メモ「行動アクション」変換 AI",
    category: "はたらく・まなぶ部門",
    tagline: "本や記事の読書メモを「今週試す3つの行動」と復習クイズへ変換し知識を定着",
    subtitle:
      "「本を読んでもすぐ忘れてしまう」を解消。Gemini 3.8 Flash が読書メモを自分の仕事・生活に活かすアクションプランへ落とし込み、カレンダーに登録します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 読書定着コーチ",
    accentColor: "#7c3aed",
    accentSoft: "#f5f3ff",
    inputLabel: "読んだ本のタイトル・気になったフレーズ・活かしたい場面",
    inputPlaceholder: "例: 『エッセンシャル思考』より「90点ルール」…仕事で全部引き受けてしまうのを直したい",
    sampleText:
      "【本・記事のメモ】ビジネス書の「重要でない9割を捨て、本当に大事な1割に集中する」「断る勇気を持つには、自分の優先順位を3つ以内に絞っておくことが重要」という箇所が刺さった。\n【活かしたい場面】毎日の残業を減らし、副業と家族の時間を確保したい。",
    submitLabel: "今週の行動アクションと定着メモを生成",
    section1Title: "1. 自分の生活に引き寄せた 3 つの実践アクション",
    section2Title: "2. 知識を忘れず定着させる振り返りチェック",
    section3Title: "3. SNS・読書ノートにそのまま貼れる 3 行アウトプット",
    gasPrefix: "[読書アクションAI]",
    systemInstruction:
      "あなたは読書を「読んで終わり」にせず行動変容につなげる学習コーチです。読書メモと活かしたい場面から、alert_level (high/medium/low)、alert_title（この学びが効く最大のボトルネック）、alert_message（知識を行動に変えるときの落とし穴）、items（今日から1週間で試せる具体的な行動プラン3つ）、checklist（週末に振り返るセルフチェック項目）、copyable_draft（SNSや社内共有・読書ノートに貼れる簡潔な学びアウトプット）、suggested_tasks（実践リマインド・1週間後振り返りのカレンダー登録タスク）を日本語で構造化してください。",
  },
  gokinjo: {
    id: "gokinjo",
    name: "ご近所・マンション相談クッション AI",
    category: "まちと地球の未来部門",
    tagline: "騒音・ごみ出し・駐輪などの近隣モヤモヤを角の立たない管理会社・自治会相談文に変換",
    subtitle:
      "直接言いにくい近隣トラブルを冷静に整理。Gemini 3.8 Flash が感情を抑えた客観的な相談メモと管理規約チェックリストを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域調和サポート",
    accentColor: "#0d9488",
    accentSoft: "#f0fdfa",
    inputLabel: "困っている状況・日時・頻度（個人を特定する情報は伏せて入力）",
    inputPlaceholder: "例: 深夜1時頃の足音とドアの開閉音が週3回ほど続いて眠れない...",
    sampleText:
      "【状況】マンションのゴミ集積場に、指定曜日以外の燃えないごみや段ボールが毎週放置されており、カラスや悪臭で困っている。\n【希望】誰かを名指しして責めたり直接揉めたりせず、管理会社や自治会から建物全体へ柔らかい注意喚起チラシを出してもらえるよう相談したい。",
    sampleLocation: "居住マンション・管理組合窓口",
    showLocationInput: true,
    submitLabel: "客観的な相談メモと解決ステップを生成",
    section1Title: "1. トラブルを悪化させない解決ステップ",
    section2Title: "2. 相談前に揃えておくとスムーズな記録チェック",
    section3Title: "3. 管理会社・自治会へそのまま送れる丁寧な相談文",
    gasPrefix: "[ご近所相談AI]",
    systemInstruction:
      "あなたは近隣トラブルやマンション管理の悩みを冷静かつ円満に解決へ導くコミュニティ調停アドバイザーです（危険・違法行為がある場合は警察#9110や自治体窓口へ相談するよう案内してください）。入力された状況から、alert_level (high/medium/low)、alert_title（トラブルの性質と適切な相談窓口）、alert_message（直接対立を避け第三者経由で進める重要性）、items（記録の取り方・管理会社/自治会への伝え方・段階的対応3点）、checklist（日時メモ・写真・管理規約確認チェック）、copyable_draft（感情を抑え事実ベースで依頼できる管理会社/自治会向け相談メール文）、suggested_tasks（経過記録・再確認のカレンダー登録タスク）を日本語で構造化してください。",
  },
  codemistake: {
    id: "codemistake",
    name: "パーソナル・コードミス＆作業落とし穴チェッカー AI",
    category: "シゴト・学び部門",
    tagline: "自分のやりがちミス履歴と「今からやる作業」から、バグ予防チェックリストと修正テンプレを自動生成",
    subtitle:
      "コードと過去のミスパターン・作業内容を入力するだけ。Gemini 3.8 Flash があなた専用の危険箇所を検出し、作業別のよくある間違いテンプレートを出力します。",
    badgeText: "✦ Google Gemini 3.8 Flash + パーソナライズド品質ガード",
    accentColor: "#6366f1",
    accentSoft: "#eef2ff",
    inputLabel: "チェックしたいコード・今からやる作業・あなたの過去のやりがちミス",
    inputPlaceholder: "例: 【作業】外部API連携の非同期処理 【自分のクセ】await忘れ、nullチェック漏れ...",
    sampleText:
      "【今からやる作業】Next.js のフォーム送信と外部 API 連携の実装\n【自分の過去のやりがちミス】fetch の await 忘れ、response.ok を見ずに json() してクラッシュ、Windows パス区切りと環境変数未設定\n【書いたコード断片】\nconst res = fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });\nconst json = res.json();",
    sampleLocation: "VS Code / GitHub PR セルフレビュー前",
    showLocationInput: true,
    submitLabel: "パーソナルミス検出＆落とし穴テンプレを生成",
    section1Title: "1. あなたのクセを踏まえた危険箇所＆修正ポイント",
    section2Title: "2. 作業別「よくある間違い」事前防止テンプレート",
    section3Title: "3. そのまま使える PR セルフレビュー／修正済みコード雛形",
    gasPrefix: "[コードミスAI]",
    systemInstruction:
      "あなたは開発者の過去のミスパターンに寄り添うパーソナライズド・コードレビュアーです。入力されたコード断片・作業内容・過去のやりがちミスから、alert_level (high/medium/low)、alert_title（最優先で防ぐべきミス）、alert_message（この作業＋この人のクセで起きやすい事故の解説）、items（コード内の具体的な危険箇所と直し方3点）、checklist（この作業の前に必ず確認する「よくある間違いテンプレート」チェック項目）、copyable_draft（修正済みコード雛形またはPRセルフレビュー用チェックリスト）、suggested_tasks（テスト実行・PR前確認タスク）を日本語で構造化してください。",
  },
  tsundoku: {
    id: "tsundoku",
    name: "積読・プロンプト資産化ダイジェスト AI",
    category: "シゴト・学び部門",
    tagline: "溜まった記事メモや毎回打ち直すAI指示文を「3行要約＋再利用テンプレート」に一発変換",
    subtitle:
      "読めていない記事のメモや何度も書いているプロンプトを貼るだけ。Gemini 3.8 Flash が要点抽出と使い回し用テンプレートを整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ナレッジ資産化",
    accentColor: "#8b5cf6",
    accentSoft: "#f5f3ff",
    inputLabel: "積読メモ・記事の抜き書き・よく使うAI指示文",
    inputPlaceholder: "例: 毎回メールの丁寧な断り文や要約プロンプトをゼロから打ち直している...",
    sampleText:
      "【溜まっているメモ】\n・Firebase AI Logic のハイブリッド推論記事（オンデバイス Gemini Nano とクラウドフォールバックの使い分け）\n・毎回「これを中学生にも分かるように3行で要約して、アクションも出して」とAIに打ち直していて地味に面倒。",
    sampleLocation: "朝の10分インプット整理タイム",
    showLocationInput: true,
    submitLabel: "3行要約＆再利用プロンプト資産を作成",
    section1Title: "1. 積読メモのコア要点＆今日活かすポイント",
    section2Title: "2. 溜め込まないための 10 分消化チェック",
    section3Title: "3. 辞書登録・メモ帳に貼って使い回せるテンプレート",
    gasPrefix: "[積読資産AI]",
    systemInstruction:
      "あなたは情報過多と毎回同じ指示文を書く手間を解消するナレッジ整理アシスタントです。入力された積読メモやAI指示文の悩みから、alert_level (high/medium/low)、alert_title（情報消化・再利用のボトルネック）、alert_message（溜め込みや手打ちを減らすコツ）、items（要点と実務への活かし方3点）、checklist（週1回の積読整理＆テンプレ更新チェック）、copyable_draft（ユーザ辞書やスニペットにそのまま登録できる万能プロンプトテンプレート）、suggested_tasks（10分ダイジェスト消化のカレンダー登録タスク）を日本語で構造化してください。",
  },
  zuborali: {
    id: "zuborali",
    name: "ずぼらメモ・1行投げ込み自動仕分け AI",
    category: "暮らし・家族部門",
    tagline: "日記・タスク・買い物・予定が混ざった雑多なメモを、分類不要でカレンダー＆チェックリストに自動仕分け",
    subtitle:
      "分類やタグ付けが面倒で続かない人向け。思いついたまま1行で投げ込むだけで、Gemini 3.8 Flash が予定・買い物・やることに綺麗に整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ずぼらライフログ",
    accentColor: "#ec4899",
    accentSoft: "#fdf2f8",
    inputLabel: "思いついたメモをそのまま投げ込み（分類・整形不要）",
    inputPlaceholder: "例: 牛乳切れた、金曜15時歯医者、来週までに電気代確認、今日ランチ美味しかった...",
    sampleText:
      "洗濯洗剤あと少し、木曜19時オンライン面談のURL確認しなきゃ、土曜午前中に市役所でマイナンバー更新、昨日夜更かしして眠い、冷蔵庫の卵明日まで",
    sampleLocation: "帰宅後の1分メモ整理",
    showLocationInput: true,
    submitLabel: "分類ゼロで予定・買い物・日記に自動仕分け",
    section1Title: "1. 期限・優先度つきに整理されたアクション",
    section2Title: "2. うっかり忘れを防ぐ買い物・確認チェック",
    section3Title: "3. そのまま保存できる整った今日の1行ログ",
    gasPrefix: "[ずぼら仕分けAI]",
    systemInstruction:
      "あなたは分類やタグ付けが面倒でメモが続かない人を助ける、超やさしいずぼら専用ライフログ整理アシスタントです。雑多なメモから、alert_level (high/medium/low)、alert_title（今日・今週いちばん忘れると困る期限）、alert_message（無理なく続けるためのひと言サポート）、items（期限順のやるべきこと3点）、checklist（買い物・持ち物・確認事項チェック）、copyable_draft（そのまま日記やメモアプリに貼れる綺麗に整った振り返りログ）、suggested_tasks（期限つきの具体的なカレンダー登録タスク）を日本語で構造化してください。",
  },
  shinsei: {
    id: "shinsei",
    name: "補助金・公的手続き期限ナビ AI",
    category: "まちと地球の未来部門",
    tagline: "窓口ごとにバラバラな公的手続き・補助金申請の「期限・必要書類・提出先」を一発整理",
    subtitle:
      "「どこに何をいつまでに出すのか分からない」行政手続きのストレスを解消。Gemini 3.8 Flash が申請スケジュールと不足書類チェックリストを作ります。",
    badgeText: "✦ Google Gemini 3.8 Flash + 行政手続きナビ",
    accentColor: "#0284c7",
    accentSoft: "#f0f9ff",
    inputLabel: "やりたい手続き・補助金・届出の内容と現在の状況",
    inputPlaceholder: "例: 自治体の省エネ家電買い替え補助金を申請したいが、レシートや領収書の条件が分かりにくい...",
    sampleText:
      "自治体の省エネ家電買い替え補助金を申請したい。古い冷蔵庫を今週買い替える予定だが、領収書の宛名条件やリサイクル券の控え、マイナンバーカードの写しが必要か、いつまでにどこへ出せばよいか整理したい。",
    sampleLocation: "居住自治体の補助金・環境窓口",
    showLocationInput: true,
    submitLabel: "申請期限・必要書類・提出手順を整理",
    section1Title: "1. 期限に間に合わせる申請ステップ",
    section2Title: "2. 窓口・オンライン申請前の必要書類チェック",
    section3Title: "3. 自治体窓口への確認電話・問い合わせメモ",
    gasPrefix: "[公的手続きAI]",
    systemInstruction:
      "あなたは自治体手続きや補助金申請の複雑さをわかりやすく解きほぐす行政手続きナビゲーターです（最終要件は必ず公式窓口ページで確認するよう案内してください）。入力された状況から、alert_level (high/medium/low)、alert_title（最も見落としやすい期限・不備リスク）、alert_message（差し戻しを防ぐ事前確認ポイント）、items（購入前・申請時・提出後の3ステップ）、checklist（領収書・証明書・本人確認書類チェック）、copyable_draft（自治体窓口へ確認する際の簡潔な質問メモ）、suggested_tasks（申請期限・書類準備のカレンダー登録タスク）を日本語で構造化してください。",
  },
  taishoku: {
    id: "taishoku",
    name: "退職・転職・育休手続きロードマップ AI",
    category: "暮らし・家族部門",
    tagline: "健康保険・年金・雇用保険・住民税の複雑な切替手順を、日付順のやることリストに整理",
    subtitle:
      "ライフイベントのたびに調べ直す社会保険と税金の届出。Gemini 3.8 Flash が抜け漏れゼロの時系列ロードマップを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ライフイベント支援",
    accentColor: "#7c3aed",
    accentSoft: "#f5f3ff",
    inputLabel: "予定しているライフイベント（退職・転職・育休など）と時期",
    inputPlaceholder: "例: 来月末で退職し、2週間あけて次の会社へ転職予定。健康保険や年金の切り替えが不安...",
    sampleText:
      "来月末で現在の会社を退職し、1か月ほど休養してから転職先に入社予定。任意継続と国民健康保険のどちらが良いか、国民年金の切替期限、離職票の受け取りタイミングを整理したい。",
    sampleLocation: "市区町村役場・ハローワーク・年金事務所",
    showLocationInput: true,
    submitLabel: "時系列手続きロードマップを生成",
    section1Title: "1. 退職前〜入社後までの重要手続きステップ",
    section2Title: "2. 会社・役所へ提出・受取する書類チェック",
    section3Title: "3. 人事・総務へそのまま送れる離職票等確認メール",
    gasPrefix: "[ライフ手続きAI]",
    systemInstruction:
      "あなたは退職・転職・産休育休に伴う社会保険・税金手続きをミスなく案内するライフイベントアドバイザーです。入力内容から、alert_level (high/medium/low)、alert_title（14日以内など最も厳しい法定・切替期限）、alert_message（空白期間や未納を防ぐ重要ポイント）、items（退職前・退職直後・次の勤務先/復帰時の3段階ガイド）、checklist（離職票・資格喪失証明書・年金手帳等の受取確認リスト）、copyable_draft（退職元または転職先の人事総務へ送れる丁寧な書類確認メール）、suggested_tasks（14日以内切替等のカレンダー登録タスク）を日本語で構造化してください。",
  },
  tenpu: {
    id: "tenpu",
    name: "添付ファイル＆メール送付前ミス防止 AI",
    category: "シゴト・学び部門",
    tagline: "メール本文と添付ファイル名のズレ・添付忘れ・宛先誤認を送信前にチェック＆命名統一",
    subtitle:
      "「どのファイルがどの書類か相手が迷う」「添付忘れが怖い」を解消。Gemini 3.8 Flash が分かりやすいファイル名案と送付前確認リストを提案します。",
    badgeText: "✦ Google Gemini 3.8 Flash + ビジネス送付ガード",
    accentColor: "#ea580c",
    accentSoft: "#fff7ed",
    inputLabel: "送りたいメール本文・添付予定のファイル名一覧",
    inputPlaceholder: "例: 本文では請求書と見積書と言っているが、添付ファイル名が document1.pdf のまま...",
    sampleText:
      "【メール案】〇〇株式会社 佐藤様\nお世話になっております。先日の打ち合わせでお話しした11月分の御請求書と、修正版のご提案資料をお送りします。\n【添付予定ファイル名】\n・scan_20261120.pdf\n・資料最終fix2.pptx",
    sampleLocation: "メール送信直前の最終チェック",
    showLocationInput: true,
    submitLabel: "添付ズレ検出＆綺麗なファイル名・本文を生成",
    section1Title: "1. 相手が迷わないファイル名リネーム案＆注意点",
    section2Title: "2. 送信ボタン押下前の最終確認チェックリスト",
    section3Title: "3. ファイル名を明記した丁寧な送付メール改訂案",
    gasPrefix: "[メール送付AI]",
    systemInstruction:
      "あなたはビジネスメールの添付漏れ・ファイル名不整合・誤送信を防ぐコミュニケーション品質アシスタントです。入力されたメール本文と添付予定ファイル名から、alert_level (high/medium/low)、alert_title（最も危険な送信前リスク）、alert_message（受け手の混乱や誤送信を防ぐポイント）、items（日付＋書類名＋社名を含む推奨ファイル名案と本文との整合性3点）、checklist（宛先CC/BCC・添付ファイル一致・パスワード/別送不要確認チェック）、copyable_draft（添付ファイル名を本文中に明記した分かりやすい改訂メール文）、suggested_tasks（先方確認・入金/返信リマインドタスク）を日本語で構造化してください。",
  },
  packing: {
    id: "packing",
    name: "旅行パッキング・直前忘れ物ゼロ AI",
    category: "暮らし・家族部門",
    tagline: "行き先・日数・移動手段から「今詰める物」と「出発朝に詰める直前リスト」を分離生成",
    subtitle:
      "毎回ゼロから考えて重くなりがちな荷造りを効率化。Gemini 3.8 Flash が機内持ち込み制限や当日朝の充電器・薬の入れ忘れまで防ぎます。",
    badgeText: "✦ Google Gemini 3.8 Flash + スマート荷造り",
    accentColor: "#0ea5e9",
    accentSoft: "#f0f9ff",
    inputLabel: "行き先・泊数・季節・同行者・気になる持ち物",
    inputPlaceholder: "例: 11月末に2泊3日で福岡へ飛行機移動。コンタクト、モバイルバッテリー、仕事用PCあり...",
    sampleText:
      "来週2泊3日で札幌へ飛行機で出張兼観光。雪の予報あり。普段使っているコンタクト保存液、処方薬、モバイルバッテリー、ノートPC一式を持っていきたいが、機内持ち込み制限と当日の入れ忘れが心配。",
    sampleLocation: "出発前夜〜当日朝の玄関",
    showLocationInput: true,
    submitLabel: "前日準備＆当日朝専用パッキングリストを生成",
    section1Title: "1. 移動手段・天候に合わせたパッキング戦略",
    section2Title: "2. 出発当日の朝に入れる直前チェックリスト",
    section3Title: "3. そのまま保存・共有できる持ち物一覧メモ",
    gasPrefix: "[荷造りAI]",
    systemInstruction:
      "あなたは忘れ物ゼロと荷物の軽量化を両立させるトラベルパッキングコーチです。行き先・日数・移動手段・持ち物から、alert_level (high/medium/low)、alert_title（航空制限や防寒など最大の注意点）、alert_message（前夜と当日朝を分けるコツ）、items（衣類・ガジェット・衛生品の最適化アドバイス3点）、checklist（当日朝に入れる充電器・常備薬・身分証チェック）、copyable_draft（メモアプリや同行者LINEに貼れる整理済みパッキングリスト）、suggested_tasks（前日準備・当日朝確認のカレンダー登録タスク）を日本語で構造化してください。",
  },
  byoinmemo: {
    id: "byoinmemo",
    name: "診察室・症状メモ＆質問整理 AI",
    category: "暮らし・家族部門",
    tagline: "診察室で緊張して伝え忘れる「いつから・どこが・どう痛いか」を30秒で医師向けメモに整理",
    subtitle:
      "「いつから痛いですか？」に詰まって帰り道に後悔しないために。Gemini 3.8 Flash が時系列の症状サマリーと聞くべき質問リストを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 受診サポート",
    accentColor: "#10b981",
    accentSoft: "#ecfdf5",
    inputLabel: "今の症状・始まった時期・飲んでいる薬・医師に聞きたいこと",
    inputPlaceholder: "例: 3日前から右肩が上がらず夜中に疼く。市販の湿布は効かない。検査が必要か聞きたい...",
    sampleText:
      "5日ほど前から夕方になると微熱（37.4℃前後）と乾いた咳が続く。朝は比較的楽だが会議中に咳き込む。市販の総合感冒薬を2日飲んだが変化なし。処方薬との飲み合わせと、仕事にいつ戻れるか確認したい。",
    sampleLocation: "かかりつけ内科・診察待ち時間",
    showLocationInput: true,
    submitLabel: "医師に見せる症状サマリー＆質問リストを作成",
    section1Title: "1. 時系列の症状整理＆診察時の伝達ポイント",
    section2Title: "2. 受診前に用意しておくと正確な持ち物チェック",
    section3Title: "3. そのまま見せる・問診票に貼れる症状メモ",
    gasPrefix: "[受診メモAI]",
    systemInstruction:
      "あなたは患者が医師へ正確かつ短時間で症状を伝えられるよう支援する受診準備アシスタントです（診断や治療判断は行わず必ず医師の診察を受けるよう明記してください）。入力された症状メモから、alert_level (high/medium/low)、alert_title（受診を急ぐべきサインや確認優先事項）、alert_message（短い診察時間でも伝え漏れを防ぐコツ）、items（発症時期・経過・服薬歴の整理ポイント3点）、checklist（お薬手帳・保険証・マイナ保険証・熱型メモチェック）、copyable_draft（スマホ画面を見せてそのまま読める問診用3行サマリー＆質問リスト）、suggested_tasks（再受診・経過記録のカレンダー登録タスク）を日本語で構造化してください。",
  },
  hoshosho: {
    id: "hoshosho",
    name: "保証書・家電修理サポート一発整理 AI",
    category: "暮らし・家族部門",
    tagline: "家電の不調時に「型番・保証期間・窓口・説明文」を整理し、修理問い合わせを最短化",
    subtitle:
      "「保証書どこ？型番どこ？」の重労働を軽減。Gemini 3.8 Flash が型番確認場所・保証対象の見極め・サポート窓口への説明文をまとめます。",
    badgeText: "✦ Google Gemini 3.8 Flash + 家電サポート整理",
    accentColor: "#f59e0b",
    accentSoft: "#fffbeb",
    inputLabel: "不調の家電名・症状・購入時期や保証書の有無",
    inputPlaceholder: "例: 2年前に買ったドラム式洗濯機が脱水でエラーU12が出る。延長保証に入っていたはず...",
    sampleText:
      "2024年10月に家電量販店で買ったコードレス掃除機が、満充電しても30秒で止まるようになった。メーカー1年保証は切れているが、量販店の5年延長保証のレシートがあるかもしれない。修理か買い替えか含め確認したい。",
    sampleLocation: "量販店延長保証・メーカー修理窓口",
    showLocationInput: true,
    submitLabel: "確認手順・必要情報・修理依頼文を一括作成",
    section1Title: "1. 保証判定＆無駄足を防ぐ確認ステップ",
    section2Title: "2. 電話・WEBフォーム入力前の準備チェック",
    section3Title: "3. 修理フォーム・チャットにそのまま貼れる症状説明文",
    gasPrefix: "[保証修理AI]",
    systemInstruction:
      "あなたは家電故障時の保証書探しや修理窓口への問い合わせ負担を減らすサポート整理アシスタントです（分解や危険な自己修理はせず公式サポートを利用するよう案内してください）。入力内容から、alert_level (high/medium/low)、alert_title（メーカー保証と量販店延長保証の切り分けポイント）、alert_message（無償修理や交換の可能性を逃さないコツ）、items（型番・シリアル確認場所、延長保証確認、見積り確認の3点）、checklist（購入日レシート・型番写真・エラーコード動画チェック）、copyable_draft（修理受付フォームやサポートチャットにそのまま貼れる症状説明テンプレート）、suggested_tasks（保証書写真保存・サポート連絡のカレンダー登録タスク）を日本語で構造化してください。",
  },
  kafun: {
    id: "kafun",
    name: "花粉・気象病コンディション予報コーチ AI",
    category: "暮らし・家族部門",
    tagline: "低気圧頭痛や花粉・寒暖差による不調メモから、今日の過ごし方と持ち物対策を即提案",
    subtitle:
      "「天気が崩れる前に頭が重い」「花粉で集中できない」を先回りケア。Gemini 3.8 Flash が体調ログに合わせた1日の負担軽減プランを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 気象コンディション支援",
    accentColor: "#14b8a6",
    accentSoft: "#f0fdfa",
    inputLabel: "今日の天気・体調の違和感・予定している外出や仕事",
    inputPlaceholder: "例: 午後から雨予報でこめかみが重い。夕方に大事な打ち合わせがある...",
    sampleText:
      "明日から急に気温が8℃下がり雨予報。低気圧が来ると決まって午後に偏頭痛とだるさが出る。明日は出社して15時からプレゼンがあるので、朝から悪化を防ぐ過ごし方と持ち物対策を整理したい。",
    sampleLocation: "出社日・会議前のセルフケア",
    showLocationInput: true,
    submitLabel: "気象不調の先回りケアプランを生成",
    section1Title: "1. 悪化を防ぐ時間帯別セルフケア3ステップ",
    section2Title: "2. 朝のバッグに入れるお守り持ち物チェック",
    section3Title: "3. 周囲へ無理なく共有できる体調配慮メモ",
    gasPrefix: "[気象ケアAI]",
    systemInstruction:
      "あなたは低気圧・寒暖差・花粉による体調ゆらぎに寄り添うセルフケアコーチです（強い症状や持病がある場合は医療機関へ相談するよう案内してください）。入力内容から、alert_level (high/medium/low)、alert_title（不調が出やすい時間帯と注意点）、alert_message（無理をせず乗り切るためのひと言）、items（朝・昼・夕方の負担軽減アクション3点）、checklist（水分・防寒・常備品チェック）、copyable_draft（必要時にチームへ丁寧に共有できる在宅・休憩相談メッセージ案）、suggested_tasks（前夜就寝・休憩リマインドタスク）を日本語で構造化してください。",
  },
  denki: {
    id: "denki",
    name: "電気代・光熱費ムダ発見＆プラン見直し AI",
    category: "まちと地球の未来部門",
    tagline: "毎月の電気・ガス明細メモから「急増の原因」と家族で無理なくできる節電アクションを特定",
    subtitle:
      "「先月より急に電気代が高い！」をスッキリ解明。Gemini 3.8 Flash が家電の使い方見直しと電力プラン確認チェックリストを自動作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 省エネ家計ナビ",
    accentColor: "#16a34a",
    accentSoft: "#f0fdf4",
    inputLabel: "電気・ガス料金の推移、世帯人数、よく使う家電",
    inputPlaceholder: "例: 2人暮らしで電気代が先月1.2万円から今月1.8万円に急増。エアコンと浴室乾燥機を毎日使用...",
    sampleText:
      "3人家族・2LDKマンション。今月の電気代が19,800円で先月より5,500円アップ。在宅ワークで日中エアコンをつけっぱなし、夜間に食洗機と洗濯乾燥機を回している。契約アンペアは40A。",
    sampleLocation: "自宅マンション・電力プラン見直し",
    showLocationInput: true,
    submitLabel: "電気代急増の原因分析＆節電プランを作成",
    section1Title: "1. 効果が大きい順に並んだ省エネアクション3選",
    section2Title: "2. 電力プラン・契約アンペア見直しチェック",
    section3Title: "3. 家族LINEに貼って協力しやすい節電ルールメモ",
    gasPrefix: "[省エネAI]",
    systemInstruction:
      "あなたは我慢やストレスを強いることなく光熱費とCO2を削減する省エネアドバイザーです。入力された光熱費・家電利用状況から、alert_level (high/medium/low)、alert_title（最も電気代を押し上げている要因）、alert_message（無理なく続けられる削減見込みのポイント）、items（空調・乾燥機・待機電力など効果の高い改善策3点）、checklist（契約アンペア・時間帯別プラン・フィルター掃除チェック）、copyable_draft（家族で気持ちよく共有できるやさしい省エネ協力メモ）、suggested_tasks（来月検針日比較・フィルター掃除タスク）を日本語で構造化してください。",
  },
  gift: {
    id: "gift",
    name: "手土産・お祝いギフト失敗ゼロ相談 AI",
    category: "暮らし・家族部門",
    tagline: "相手の年代・家族構成・アレルギー・予算から「外さないギフト案＋のし・メッセージ文」を提案",
    subtitle:
      "「毎回何を持っていけばいいか迷う」「のしの表書きが分からない」を解決。Gemini 3.8 Flash がマナー込みで最短選定します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 贈りものコンシェルジュ",
    accentColor: "#db2777",
    accentSoft: "#fdf2f8",
    inputLabel: "渡す相手・シーン・予算・避けたいもの（甘い物苦手など）",
    inputPlaceholder: "例: 取引先への挨拶、予算3,000円、日持ちして個包装のものがいい...",
    sampleText:
      "義実家への年末挨拶の手土産。60代の両親で甘いものは少し控えめ、お茶や和食が好き。予算は4,000円前後で、駅ナカやデパ地下で買えて常温で持ち運べるものを探している。",
    sampleLocation: "駅デパ地下・手土産購入前",
    showLocationInput: true,
    submitLabel: "外さないギフト3案＆のし・挨拶文を作成",
    section1Title: "1. 相手に喜ばれる厳選ギフトジャンル3案",
    section2Title: "2. 購入時ののし・紙袋・賞味期限チェック",
    section3Title: "3. 渡すとき・メッセージカードに使える一言案",
    gasPrefix: "[ギフトAI]",
    systemInstruction:
      "あなたは冠婚葬祭からビジネス手土産まで精通するギフトコンシェルジュです。相手属性・シーン・予算・NG条件から、alert_level (high/medium/low)、alert_title（マナー・持ち運び・日持ちの注意点）、alert_message（相手に気を遣わせない選び方のコツ）、items（具体的なギフト候補ジャンルと選定理由3点）、checklist（のし表書き・紙袋・常温/冷蔵・賞味期限チェック）、copyable_draft（添えるメッセージカードや渡す際のスマートな挨拶フレーズ）、suggested_tasks（購入予約・持参リマインドタスク）を日本語で構造化してください。",
  },
  shaken: {
    id: "shaken",
    name: "車検・自動車メンテ見積りチェック AI",
    category: "暮らし・家族部門",
    tagline: "車検見積りの専門用語を噛み砕き「必須整備」と「今回見送れる推奨整備」をわかりやすく仕分け",
    subtitle:
      "「言われるがまま高額になった」を防ぐカーメンテ相談役。Gemini 3.8 Flash が見積り項目の優先度とお店への確認質問を整理します。",
    badgeText: "✦ Google Gemini 3.8 Flash + カーライフ家計ガード",
    accentColor: "#2563eb",
    accentSoft: "#eff6ff",
    inputLabel: "車検見積りの内容・車種年式・走行距離・気になっている項目",
    inputPlaceholder: "例: 5年目のコンパクトカー、走行3.5万km。見積りが14万円でエアコン洗浄や添加剤が入っている...",
    sampleText:
      "初度登録から5年目のハイブリッド車、走行距離38,000km。ディーラー車検見積りが総額15.2万円。法定費用以外に「下回り防錆塗装 18,000円」「燃料添加剤 4,500円」「バッテリー交換 32,000円」「エアコンフィルター 6,000円」が入っている。",
    sampleLocation: "車検見積り比較・整備工場相談前",
    showLocationInput: true,
    submitLabel: "必須 vs 任意項目を仕分け＆確認質問を作成",
    section1Title: "1. 必須整備と今回相談できる項目の整理",
    section2Title: "2. 相見積り・入庫前の確認チェックリスト",
    section3Title: "3. 整備担当者へ角を立てず相談できる質問メモ",
    gasPrefix: "[車検AI]",
    systemInstruction:
      "あなたは専門用語の多い車検見積りを一般ドライバーにわかりやすく解説するカーメンテアドバイザーです（保安基準や安全に関わる整備は必ず整備士の判断を尊重するよう案内してください）。見積り内容から、alert_level (high/medium/low)、alert_title（費用が大きく動く注目項目）、alert_message（安全を保ちつつ納得して選ぶためのポイント）、items（法定必須・安全優先・今回見送り検討の3区分整理）、checklist（交換履歴・バッテリー電圧測定値・代車/割引条件チェック）、copyable_draft（整備担当者へ丁寧に優先度や必要性を確認できる質問トークメモ）、suggested_tasks（車検満了日・相見積り予約タスク）を日本語で構造化してください。",
  },
  kakeibo: {
    id: "kakeibo",
    name: "固定費・カード明細スッキリ見直し AI",
    category: "暮らし・家族部門",
    tagline: "クレジットカード明細の気になる引き落としを棚卸しし、月5,000円〜の固定費削減プランを作成",
    subtitle:
      "家計簿が続かない人でも「明細のコピペだけ」で見直し完了。Gemini 3.8 Flash が通信費・保険・サブスクの優先見直し順を提案します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 固定費スリム化",
    accentColor: "#059669",
    accentSoft: "#ecfdf5",
    inputLabel: "毎月の固定費・カード明細の気になる項目（カード番号等は伏せて入力）",
    inputPlaceholder: "例: スマホ代8,500円、動画サブスク3つで3,800円、使ってないジム月8,000円...",
    sampleText:
      "毎月の引き落とし：大手キャリアスマホ 9,200円、光回線 5,800円、動画・音楽サブスク合計 4,200円、月1回しか行けていないジム 7,800円、よく分からないクラウド容量課金 400円。無理なく月1万円ほど浮かせたい。",
    sampleLocation: "月末の固定費棚卸し",
    showLocationInput: true,
    submitLabel: "固定費の優先見直し順＆削減額試算を生成",
    section1Title: "1. 満足度を落とさず効く固定費見直し3ステップ",
    section2Title: "2. 解約・プラン変更前の違約金＆引き継ぎチェック",
    section3Title: "3. 1か月で実行する家計スリム化宣言メモ",
    gasPrefix: "[固定費AI]",
    systemInstruction:
      "あなたは日々の節約疲れを防ぎ、インパクトの大きい固定費からスマートに見直す家計アドバイザーです。入力された固定費メモから、alert_level (high/medium/low)、alert_title（今すぐ見直すと最も効果が大きい固定費）、alert_message（生活満足度を下げずに年間数万円浮かすコツ）、items（通信費・ジム/サブスク・プラン見直しの優先順位3点）、checklist（解約締日・MNP/メールアドレス引き継ぎ・データ移行チェック）、copyable_draft（今月中にやる固定費見直しアクション宣言メモ）、suggested_tasks（更新日前の解約・プラン変更カレンダー登録タスク）を日本語で構造化してください。",
  },
  sleep: {
    id: "sleep",
    name: "睡眠リズム・寝不足リカバリーコーチ AI",
    category: "暮らし・家族部門",
    tagline: "スマホ見すぎや夜更かしで崩れた睡眠リズムを、翌日の予定に合わせて3日で無理なく立て直す",
    subtitle:
      "「また寝不足で日中ボーッとする…」を解消。Gemini 3.8 Flash が仮眠タイミング・カフェイン制限・今夜の就寝ルーティンを設計します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 睡眠リカバリー",
    accentColor: "#4f46e5",
    accentSoft: "#eef2ff",
    inputLabel: "昨夜の睡眠時間・起床時刻・今日の予定・眠気の悩み",
    inputPlaceholder: "例: 深夜2時半までスマホを見てしまい睡眠4時間。14時から大事な会議がある...",
    sampleText:
      "昨夜は深夜2時まで動画を見てしまい4時間半しか寝られなかった。今朝は7時起床で、13時半から2時間のオンライン研修がある。今日を乗り切るコツと、今夜23時半までに自然に眠るための段取りを知りたい。",
    sampleLocation: "朝の支度〜今夜の就寝前",
    showLocationInput: true,
    submitLabel: "今日を乗り切る＆今夜整える睡眠プランを生成",
    section1Title: "1. 今日の眠気対策＆今夜の入眠3ステップ",
    section2Title: "2. 夕方〜就寝前のスマホ・光・カフェインチェック",
    section3Title: "3. 枕元に貼れる今夜のナイトルーティンメモ",
    gasPrefix: "[睡眠AI]",
    systemInstruction:
      "あなたは無理な根性論を避け、生体リズムに沿って睡眠不足を立て直す睡眠リカバリーコーチです（慢性的な不眠や強い日中の眠気がある場合は医療機関へ相談するよう案内してください）。入力内容から、alert_level (high/medium/low)、alert_title（今日の眠気ピークと要注意時間帯）、alert_message（今夜の深睡眠を取り戻すコツ）、items（朝の光・15分パワーナップ・夜のスマホ断ち3点）、checklist（カフェイン終了時刻・入浴タイミング・アラーム設定チェック）、copyable_draft（今夜そのまま実行できる3行ナイトルーティンメモ）、suggested_tasks（昼休み仮眠・就寝1時間前アラームタスク）を日本語で構造化してください。",
  },
  bento: {
    id: "bento",
    name: "15分時短お弁当＆作り置き段取り AI",
    category: "暮らし・家族部門",
    tagline: "冷蔵庫の残り物と朝の持ち時間から「同時進行15分タイムライン」でお弁当3品を完成",
    subtitle:
      "「朝のお弁当作りが毎日戦争…」を解決。Gemini 3.8 Flash がフライパン1つ＋レンジ併用の最短段取りと傷み防止チェックを作成します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 朝15分キッチン段取り",
    accentColor: "#f97316",
    accentSoft: "#fff7ed",
    inputLabel: "使える食材・冷凍食品・朝の調理時間・食べる人の好み",
    inputPlaceholder: "例: 鶏むね肉、卵2個、ブロッコリー、ミニトマト。朝15分以内で2人分作りたい...",
    sampleText:
      "冷蔵庫にある物：豚こま肉、卵3個、冷凍ブロッコリー、ちくわ、ミニトマト。朝15分以内で高校生1人分のお弁当を彩りよく作りたい。洗い物は最小限にしたい。",
    sampleLocation: "平日朝6:30のキッチン",
    showLocationInput: true,
    submitLabel: "同時進行15分お弁当レシピ＆段取りを生成",
    section1Title: "1. 0分〜15分の同時進行タイムライン3品",
    section2Title: "2. 食中毒・汁漏れ防止＆冷まし方チェック",
    section3Title: "3. 冷蔵庫に貼れる今日のメニュー＆買い足しメモ",
    gasPrefix: "[お弁当AI]",
    systemInstruction:
      "あなたは忙しい朝に15分以内でお弁当を仕上げる時短料理段取りコーチです。食材と制限時間から、alert_level (high/medium/low)、alert_title（食中毒防止・冷まし時間の注意点）、alert_message（洗い物を増やさず彩りを上げるコツ）、items（主菜・副菜・すき間おかずの同時進行手順3点）、checklist（中心加熱・汁気切り・保冷剤チェック）、copyable_draft（買い物リスト兼お弁当献立メモ）、suggested_tasks（前夜解凍・保冷剤冷凍リマインドタスク）を日本語で構造化してください。",
  },
  studyplan: {
    id: "studyplan",
    name: "テスト・資格逆算スキマ学習ナビ AI",
    category: "シゴト・学び部門",
    tagline: "試験日と残り範囲・1日のスキマ時間から「今日解くページ数」まで落とし込む逆算学習プラン",
    subtitle:
      "「計画倒れで直前に焦る」を防ぐ学習伴走コーチ。Gemini 3.8 Flash が通勤・通学15分単位で回る現実的なスケジュールを作ります。",
    badgeText: "✦ Google Gemini 3.8 Flash + 逆算スキマ学習",
    accentColor: "#0284c7",
    accentSoft: "#f0f9ff",
    inputLabel: "目指す試験・試験日・残り教材量・1日に取れるスキマ時間",
    inputPlaceholder: "例: 3週間後にTOEIC。公式問題集がまだ半分残っている。平日は通勤往復40分のみ...",
    sampleText:
      "あと21日で基本情報技術者試験。過去問道場とテキストがまだ4割残っている。平日は通勤の片道20分×2と夜30分、土日は各3時間勉強できる。計画倒れしない配分を作ってほしい。",
    sampleLocation: "通勤電車＆自宅デスク",
    showLocationInput: true,
    submitLabel: "現実的な逆算学習ロードマップを生成",
    section1Title: "1. 残り日数から逆算した週間マイルストーン3段階",
    section2Title: "2. 毎日15分スキマ時間で回すルーティンチェック",
    section3Title: "3. 学習ログ・SNS宣言に貼れる今週の目標メモ",
    gasPrefix: "[学習計画AI]",
    systemInstruction:
      "あなたは挫折しやすい資格・試験勉強を現実的なスキマ時間単位へ分解する学習プランナーです。試験日・残り教材・確保時間から、alert_level (high/medium/low)、alert_title（現在の残り時間に対する切迫度と最優先分野）、alert_message（計画倒れを防ぐバッファ設計のコツ）、items（第1週〜直前期の3段階配分）、checklist（毎日通勤・就寝前の15分定着チェック）、copyable_draft（そのままノートやSNSに貼れる今週のコミット宣言）、suggested_tasks（週次模試・弱点復習のカレンダー登録タスク）を日本語で構造化してください。",
  },
  renrakucho: {
    id: "renrakucho",
    name: "園・学校連絡帳＆欠席連絡クッション AI",
    category: "暮らし・家族部門",
    tagline: "忙しい朝に焦って書く保育園・小学校の連絡帳や欠席・早退連絡を、丁寧で伝わりやすい文章へ即変換",
    subtitle:
      "「熱が出た！先生にどう書けばいい？」を10秒で解決。Gemini 3.8 Flash が体調・引き渡し・配慮依頼を過不足なく文章化します。",
    badgeText: "✦ Google Gemini 3.8 Flash + 保護者連絡サポート",
    accentColor: "#ec4899",
    accentSoft: "#fdf2f8",
    inputLabel: "子どもの状況（発熱・ケガ・早退・アレルギー配慮など）と伝えたい要件",
    inputPlaceholder: "例: 昨夜38度出たが今朝は36.8度。念のためお休みして小児科へ行く...",
    sampleText:
      "年中の子どもが昨夜から鼻水と咳があり、今朝は37.6℃の微熱。本日は大事をとってお休みし、午前中に小児科を受診予定。明日の登園可否は受診後にアプリで改めて連絡する旨を丁寧に伝えたい。",
    sampleLocation: "朝の保育園・小学校連絡アプリ",
    showLocationInput: true,
    submitLabel: "丁寧で抜け漏れのない連絡文＆確認リストを作成",
    section1Title: "1. 先生へ確実に伝えるべき重要情報3点",
    section2Title: "2. 連絡送信前・受診前の確認チェックリスト",
    section3Title: "3. 連絡アプリ・連絡帳にそのまま貼れる完成文",
    gasPrefix: "[連絡帳AI]",
    systemInstruction:
      "あなたは多忙な保護者に代わり、保育園・幼稚園・小学校の先生へ正確かつ温かみのある連絡文を作成するコミュニケーションアシスタントです。入力内容から、alert_level (high/medium/low)、alert_title（感染症・登園基準など確認すべきポイント）、alert_message（先生が助かる伝達事項のコツ）、items（症状経過・受診予定・次回連絡の整理3点）、checklist（登園許可証要否・給食キャンセル・お迎え変更チェック）、copyable_draft（連絡アプリや連絡帳にそのままコピペできる丁寧な連絡文）、suggested_tasks（受診後フォロー連絡・登園準備タスク）を日本語で構造化してください。",
  },
  water: {
    id: "water",
    name: "断水・停電・水害ローカル備蓄チェッカー AI",
    category: "まちと地球の未来部門",
    tagline: "世帯人数・階数・ペット有無から「本当に必要な水・簡易トイレ・電源」の過不足を即診断",
    subtitle:
      "「防災グッズ何を買えばいいか分からない」を解消。Gemini 3.8 Flash がマンション高層階や乳幼児に合わせた実践的備蓄計画を作ります。",
    badgeText: "✦ Google Gemini 3.8 Flash + 地域防災レジリエンス",
    accentColor: "#0d9488",
    accentSoft: "#f0fdfa",
    inputLabel: "世帯構成・住居タイプ（マンション階数など）・現在の備蓄状況",
    inputPlaceholder: "例: マンション8階、夫婦＋幼児1人、水2Lが6本しかない。オール電化で停電が心配...",
    sampleText:
      "マンション9階在住、大人2人＋小学生1人＋小型犬1匹。現在の備蓄は2Lペットボトル6本とモバイルバッテリー1個のみ。断水時のトイレ対策と停電時の食事・暑さ寒さ対策を優先度順に知りたい。",
    sampleLocation: "自宅マンションの防災備蓄棚",
    showLocationInput: true,
    submitLabel: "世帯別・不足備蓄診断＆買い足しリストを生成",
    section1Title: "1. 今すぐ優先して補うべき防災備蓄トップ3",
    section2Title: "2. 断水・停電発生直後の初動チェックリスト",
    section3Title: "3. 家族で共有できる買い物メモ＆避難確認ルール",
    gasPrefix: "[備蓄AI]",
    systemInstruction:
      "あなたはマンション高層階や子ども・ペット連れ家庭の実情に寄り添う地域防災アドバイザーです。世帯構成と現在の備蓄から、alert_level (high/medium/low)、alert_title（最も致命的な備蓄不足項目）、alert_message（ローリングストックで無理なく備えるコツ）、items（水・簡易トイレ・電源/食料の具体的な必要量と不足分3点）、checklist（ハザードマップ・家具固定・連絡手段・ペット避難品チェック）、copyable_draft（今週末の買い物にそのまま使える防災買い足しメモ）、suggested_tasks（半年ごとの賞味期限ローリング点検タスク）を日本語で構造化してください。",
  },
};
