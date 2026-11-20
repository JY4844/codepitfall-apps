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
  | "norikae";

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
};
