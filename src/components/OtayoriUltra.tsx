"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FamilyRole,
  OtayoriAnalysis,
  OtayoriChecklistItem,
  OtayoriEvent,
} from "@/app/api/otayori/route";

interface PresetDefinition {
  id: "undokai" | "ensoku" | "vaccine" | "kenshin";
  label: string;
  shortTag: string;
  icon: string;
  issuer: string;
  sourceText: string;
  defaultAnalysis: OtayoriAnalysis;
}

export interface PersistedChecklistItem extends OtayoriChecklistItem {
  checked: boolean;
}

interface PersistedBatonState {
  checklistByDoc: Record<string, PersistedChecklistItem[]>;
  eventAssigneesByDoc: Record<string, Record<number, FamilyRole>>;
}

const STORAGE_KEY = "otayori_ultra_baton_v1";

const FAMILY_ROLES: Array<{
  key: FamilyRole;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
  accent: string;
  bgSoft: string;
  borderSoft: string;
}> = [
  {
    key: "ママ",
    label: "ママ（母）",
    shortLabel: "ママ",
    icon: "👩",
    desc: "朝の準備・連絡帳・お弁当",
    accent: "#e11d48",
    bgSoft: "#fff1f2",
    borderSoft: "#fecdd3",
  },
  {
    key: "パパ",
    label: "パパ（父）",
    shortLabel: "パパ",
    icon: "👨",
    desc: "水曜早帰り・集金・送迎＆設営",
    accent: "#2563eb",
    bgSoft: "#eff6ff",
    borderSoft: "#bfdbfe",
  },
  {
    key: "子ども",
    label: "子ども（本人）",
    shortLabel: "子ども",
    icon: "🧒",
    desc: "自分の持ち物・体操服・記名確認",
    accent: "#d97706",
    bgSoft: "#fffbeb",
    borderSoft: "#fde68a",
  },
  {
    key: "祖父母",
    label: "祖父母（じいじ・ばあば）",
    shortLabel: "祖父母",
    icon: "👵",
    desc: "早めのお迎え・行事応援・見守り",
    accent: "#16a34a",
    bgSoft: "#f0fdf4",
    borderSoft: "#bbf7d0",
  },
];

const ROLE_ORDER: FamilyRole[] = ["ママ", "パパ", "子ども", "祖父母"];

function nextRole(current: string): FamilyRole {
  const idx = ROLE_ORDER.indexOf(current as FamilyRole);
  if (idx === -1) return "パパ";
  return ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
}

function normalizeRoleKey(raw: string): FamilyRole {
  if (raw.includes("父") || raw.includes("パパ")) return "パパ";
  if (raw.includes("子") || raw.includes("児童") || raw.includes("本人")) return "子ども";
  if (raw.includes("祖") || raw.includes("ばあ") || raw.includes("じい")) return "祖父母";
  return "ママ";
}

const PRESETS: PresetDefinition[] = [
  {
    id: "undokai",
    label: "小学校運動会おたより",
    shortTag: "小学校・行事",
    icon: "🏫",
    issuer: "さくら市立さくら小学校 第48回 秋季大運動会",
    sourceText: `【さくら市立さくら小学校 第48回 秋季大運動会のお知らせ】
1. 開催日時：2026年10月18日（日） 8:30 児童登校 / 8:50 開会式 / 14:30 閉会予定
   ※雨天時は10月19日（月）に順延。当日朝6:30に学校連絡アプリで実施判定を配信します。
2. 会場：さくら小学校 校庭（正門開門 7:45 ※前日からの場所取りは禁止）
3. 児童の持ち物：体操服（名札着用）、紅白帽子（あごゴム紐の緩み確認）、大容量水筒、汗拭きタオル、お弁当・敷物（昼食は家族席で一緒にとります）
4. 提出物・PTA係：
   ・「家族参観人数・敬老席申込票」：10月9日（金）までに担任へ提出（祖父母様用の日陰テント敬老席をご用意しています）
   ・閉会後（14:30〜15:00）PTAテント撤収サポーターへのご協力をお願いします。
5. 費用・集金：なし（プログラムは10月14日配布）`,
    defaultAnalysis: {
      title: "さくら小学校 第48回 秋季大運動会のお知らせ",
      category: "小学校・行事",
      summary:
        "10月18日(日) 8:30登校で秋季大運動会が開催されます。10月9日(金)までに敬老席・参観人数票の提出が必要で、当日は家族でお弁当を囲みます。",
      events: [
        {
          date: "2026-10-09(金) 08:15",
          title: "【提出締切】家族参観人数・敬老席申込票を担任へ提出",
          assignee: "ママ",
          reason: "祖父母2名分の敬老席テント希望を記入し、連絡帳袋へ入れる",
          isoStart: "20261009T081500",
          isoEnd: "20261009T090000",
          location: "さくら小学校 3年2組教室",
          isDeadline: true,
        },
        {
          date: "2026-10-17(土) 19:00",
          title: "体操服・紅白帽子のゴム紐点検＆水筒準備",
          assignee: "子ども",
          reason: "自分の紅白帽子のあご紐が緩んでいないか確認し玄関に揃える",
          isoStart: "20261017T190000",
          isoEnd: "20261017T193000",
          location: "自宅子ども部屋",
          isDeadline: false,
        },
        {
          date: "2026-10-18(日) 06:30〜08:00",
          title: "開催判定メール確認＆家族5人分のお弁当・麦茶づくり",
          assignee: "ママ",
          reason: "朝6:30の連絡アプリ判定を確認し、昼食のお弁当と保冷バッグを準備",
          isoStart: "20261018T063000",
          isoEnd: "20261018T080000",
          location: "自宅キッチン",
          isDeadline: false,
        },
        {
          date: "2026-10-18(日) 07:45〜15:00",
          title: "正門開門・観覧シート設営＆閉会後のPTAテント片付け",
          assignee: "パパ",
          reason: "7:45開門に合わせてシートと三脚を設営、14:30閉会後のテント撤収も担当",
          isoStart: "20261018T074500",
          isoEnd: "20261018T150000",
          location: "さくら小学校 校庭",
          isDeadline: false,
        },
        {
          date: "2026-10-18(日) 08:40〜14:30",
          title: "敬老席テントから徒競走・表現ダンス応援＆家族昼食",
          assignee: "祖父母",
          reason: "日陰の敬老席テントで無理なく観覧し、お昼は体育館・家族席でお弁当",
          isoStart: "20261018T084000",
          isoEnd: "20261018T143000",
          location: "さくら小学校 校庭・敬老席テント",
          isDeadline: false,
        },
      ],
      items_to_bring: [
        "体操服（名札・ゼッケン確認）",
        "紅白帽子（ゴム紐の緩み確認）",
        "大容量水筒（麦茶・スポーツドリンク）",
        "汗拭きタオル・ハンカチ",
        "家族5人分のお弁当・保冷剤",
        "大判レジャーシート・折りたたみクッション",
        "カメラ・スマホ予備バッテリー",
        "敬老席用の羽織りもの・日よけ帽子",
      ],
      checklist_items: [
        {
          id: "undokai-1",
          label: "家族参観人数・敬老席申込票の記入と提出（10/9締切）",
          assignee: "ママ",
          category: "提出・集金",
          note: "祖父母2名分の敬老席に◯をつける",
        },
        {
          id: "undokai-2",
          label: "体操服の名札・紅白帽子のあごゴム点検",
          assignee: "子ども",
          category: "持ち物",
          note: "前日の夜に自分でカバンへ入れる",
        },
        {
          id: "undokai-3",
          label: "大判レジャーシート・カメラ三脚・ゴミ袋の車載準備",
          assignee: "パパ",
          category: "当日準備",
          note: "7:45の正門開門に合わせて持参",
        },
        {
          id: "undokai-4",
          label: "家族5人分のお弁当・凍らせた麦茶＆保冷バッグ",
          assignee: "ママ",
          category: "持ち物",
          note: "果物とおしぼりも一緒に入れる",
        },
        {
          id: "undokai-5",
          label: "児童用の大容量水筒＆汗拭きタオル2枚",
          assignee: "子ども",
          category: "持ち物",
          note: "8:30登校時に肩から掛けて持参",
        },
        {
          id: "undokai-6",
          label: "日よけ帽子・折りたたみ座布団・飲み物（敬老席用）",
          assignee: "祖父母",
          category: "当日準備",
          note: "8:40頃に正門前でお父さんと合流",
        },
        {
          id: "undokai-7",
          label: "閉会後（14:30〜15:00）PTAテント撤収サポート",
          assignee: "パパ",
          category: "当日準備",
          note: "軍手を持参すると作業しやすい",
        },
      ],
      cost: "なし（無料・プログラムは10月14日配布）",
      grandparent_summary: [
        "10月18日（日曜）の朝8時50分から、さくら小学校の校庭で運動会があります。",
        "日陰で座って見られる「敬老席テント」を申し込んでおくので、8時40分ごろ正門でお父さんと合流してください。",
        "お昼は家族みんなでお弁当を食べます。折りたたみクッションと帽子だけ持って、ゆっくり応援に来てくださいね。",
      ],
      child_message:
        "かけっこも ダンスも いっしょうけんめい がんばろう！前日の夜に 体操服と 紅白帽子、大きな水筒を 自分でそろえてね。",
      voice_script:
        "おたよりバトンから、さくら小学校・秋季大運動会のまとめを読み上げます。開催日は10月18日日曜日、朝8時30分登校です。まず10月9日金曜日までに、ママが敬老席と参観人数の申込票を提出します。当日はパパが7時45分の開門に合わせてシートを敷き、閉会後のテント片付けを担当します。子どもは体操服、紅白帽子、水筒を自分で準備しましょう。おじいちゃん・おばあちゃんには敬老席をご用意しています。",
      medication_allergy_alerts: [
        "🍱 お弁当・アレルギー注意：家族席での昼食時は保冷剤を必ず同梱し、傷みやすい生もの・アレルゲン混入にご注意ください。",
        "☀️ 熱中症・常備薬チェック：大容量水筒（麦茶・スポーツドリンク）と、喘息吸入器や絆創膏・日焼け止めなど常備薬ポーチを携帯してください。",
      ],
      reply_cushion_message:
        "いつも温かくご指導いただきありがとうございます。第48回秋季大運動会のお知らせを確認いたしました。家族参観人数（大人4名・敬老席テント2名希望）の申込票を10月9日までに提出いたします。また閉会後のPTAテント撤収にも父が参加いたします。どうぞよろしくお願いいたします。",
      suggested_tasks: [
        {
          title: "【ママ】10/9(金) 敬老席・家族参観人数申込票を連絡帳へ入れる",
          priority: "high",
          memo: "祖父母2名分の敬老席テント利用を希望",
        },
        {
          title: "【子ども】10/17(土) 体操服ゼッケンと紅白帽子のゴム紐チェック",
          priority: "medium",
          memo: "汗拭きタオルと水筒も玄関にセット",
        },
        {
          title: "【パパ】10/18(日) 7:45 正門開門シート設営＆14:30 テント撤収",
          priority: "high",
          memo: "レジャーシート・カメラ・軍手を持参",
        },
        {
          title: "【祖父母】10/18(日) 8:40 正門集合・敬老席テントから運動会観覧",
          priority: "medium",
          memo: "昼食は家族席でお弁当を一緒に囲む",
        },
      ],
    },
  },
  {
    id: "ensoku",
    label: "保育園遠足＆持ち物",
    shortTag: "保育園・遠足",
    icon: "🎒",
    issuer: "ひまわり保育園 ぱんだ組 秋のバス遠足だより",
    sourceText: `【ひまわり保育園 ぱんだ組・きりん組 秋の遠足（どんぐり山自然公園）のおたより】
1. 日時：2026年11月6日（金） 8:30までに登園（時間厳守） / 8:50 バス出発 / 15:30 帰園予定
   ※雨天時は「市立科学館プラネタリウム見学」に行き先を変更（雨天でもお弁当が必要です）。
2. 持ち物（すべてに大きく記名をお願いします）：
   ・子ども用リュック、お弁当（ピックや爪楊枝は使用不可）
   ・水筒（肩掛け紐つき・水またはお茶）、1人で広げて座れるレジャーシート
   ・濡れおしぼり（ケース入り）、ビニール袋2枚（どんぐり入れ・ゴミ袋用）
   ・おやつ（200円以内・ガムやアメ、溶けやすいチョコは不可）
   ・予備の着替え一式（別袋に入れて保育室ロッカーへ）
3. 集金：貸切バス代・保険料 1,200円（10月30日（金）までに職員室へ現金手渡し）
4. お迎え：当日は疲れが出やすいため、16:00〜17:00頃の早めのお迎えにご協力ください。`,
    defaultAnalysis: {
      title: "ひまわり保育園 秋のバス遠足（どんぐり山自然公園）",
      category: "保育園・遠足",
      summary:
        "11月6日(金) 8:30厳守で秋のバス遠足に出発します。10月30日(金)までにバス代1,200円の集金があり、ピック不使用のお弁当とおやつ200円以内の準備が必要です。",
      events: [
        {
          date: "2026-10-30(金) 08:30",
          title: "【集金締切】貸切バス代・保険料 1,200円を職員室へ提出",
          assignee: "パパ",
          reason: "おつりのないよう1,200円を集金袋に入れ、朝の登園時に職員室へ手渡し",
          isoStart: "20261030T083000",
          isoEnd: "20261030T090000",
          location: "ひまわり保育園 職員室",
          isDeadline: true,
        },
        {
          date: "2026-11-04(水) 17:30",
          title: "子どもと一緒に遠足のおやつ（200円以内）お買い物",
          assignee: "子ども",
          reason: "ガム・アメ・溶けるチョコを避け、200円以内でおやつを選んで記名する",
          isoStart: "20261104T173000",
          isoEnd: "20261104T181500",
          location: "近所のスーパー",
          isDeadline: true,
        },
        {
          date: "2026-11-06(金) 07:00〜08:15",
          title: "遠足当日：おにぎり弁当づくり＆濡れおしぼり準備",
          assignee: "ママ",
          reason: "ピック・爪楊枝を使わない食べやすいお弁当を作り、8:30までに登園させる",
          isoStart: "20261106T070000",
          isoEnd: "20261106T081500",
          location: "自宅〜ひまわり保育園",
          isDeadline: false,
        },
        {
          date: "2026-11-06(金) 16:15",
          title: "遠足帰園後の早めのお迎え（16:00〜17:00目安）",
          assignee: "祖父母",
          reason: "バス遠足で疲れが出やすいため、金曜担当のおばあちゃんが16:15にお迎え",
          isoStart: "20261106T161500",
          isoEnd: "20261106T164500",
          location: "ひまわり保育園 ぱんだ組保育室",
          isDeadline: false,
        },
      ],
      items_to_bring: [
        "子ども用リュック（すべてに大きく記名）",
        "お弁当（ピック・爪楊枝は使用不可）",
        "肩掛け紐つき水筒（水またはお茶）",
        "1人で広げて座れるレジャーシート",
        "濡れおしぼり（ケース入り）",
        "おやつ（200円以内・チョコ/ガム/アメ不可）",
        "ビニール袋2枚（どんぐり入れ＆ゴミ袋）",
        "予備の着替え一式（別袋でロッカーへ）",
      ],
      checklist_items: [
        {
          id: "ensoku-1",
          label: "バス代・保険料 1,200円を集金袋に入れて職員室へ提出（10/30まで）",
          assignee: "パパ",
          category: "提出・集金",
          note: "千円札1枚＋百円玉2枚を前夜に用意",
        },
        {
          id: "ensoku-2",
          label: "遠足のおやつ（200円以内・ガム/チョコ不可）を選んで名前を書く",
          assignee: "子ども",
          category: "持ち物",
          note: "ラムネ・小袋せんべいなど溶けないもの",
        },
        {
          id: "ensoku-3",
          label: "レジャーシートを自分で広げてたたむ練習＆リュック詰め",
          assignee: "子ども",
          category: "当日準備",
          note: "どんぐり拾い用のビニール袋2枚も入れる",
        },
        {
          id: "ensoku-4",
          label: "ピック・爪楊枝を使わないお弁当＆ケース入り濡れおしぼり",
          assignee: "ママ",
          category: "持ち物",
          note: "雨天の科学館変更時もお弁当が必要",
        },
        {
          id: "ensoku-5",
          label: "肩掛け紐つき水筒＆ロッカー用の予備着替え一式（別袋）",
          assignee: "ママ",
          category: "持ち物",
          note: "8:30厳守で登園完了する",
        },
        {
          id: "ensoku-6",
          label: "遠足当日の早めのお迎え（16:15ごろ保育園へ）",
          assignee: "祖父母",
          category: "当日準備",
          note: "拾ったどんぐりのお話を聞きながら帰宅",
        },
      ],
      cost: "1,200円（貸切バス代・保険料 / 10月30日(金)までに職員室へ現金提出）",
      grandparent_summary: [
        "11月6日（金曜）に、保育園のバス遠足で「どんぐり山自然公園」へ行きます。",
        "その日はたくさん歩いて疲れるので、午後4時15分ごろに保育園へ早めのお迎えをお願いします。",
        "おみやげに拾ったどんぐりを持って帰るので、ぜひお話を聞いてあげてくださいね。",
      ],
      child_message:
        "どんぐり拾い たのしみだね！レジャーシートを じぶんで たたむ練習をして、ビニール袋を2まい リュックにいれよう！",
      voice_script:
        "おたよりバトンから、ひまわり保育園・秋のバス遠足のまとめです。11月6日金曜日、朝8時30分までに登園します。まず10月30日金曜日までに、パパがバス代1,200円を職員室へ提出してください。お弁当はピックや爪楊枝が禁止です。おやつは200円以内でチョコやガムは避けましょう。当日は疲れやすいため、16時15分ごろにおばあちゃんに早めのお迎えをお願いします。",
      medication_allergy_alerts: [
        "🚫 誤飲・アレルギー重要警告：お弁当の「ピック・爪楊枝」は使用禁止です。おやつも「ガム・アメ・溶けやすいチョコ」は不可、友だち同士の交換を避けるため個包装に必ず記名してください。",
        "🚌 乗り物酔い・お薬持参：バス移動時の酔い止め薬やアレルギー薬・エピペン等が必要な場合は、事前に与薬依頼書とともに担任へお渡しください。",
      ],
      reply_cushion_message:
        "いつも大変お世話になっております。秋のバス遠足のおたよりを確認いたしました。10月30日までにバス代1,200円を職員室へ提出し、当日はピック不使用のお弁当・記名済みのおやつを持たせて8:30までに登園いたします。また帰園後は16:15頃に祖母がお迎えに伺う予定です。よろしくお願いいたします。",
      suggested_tasks: [
        {
          title: "【パパ】10/30(金) 保育園職員室へ遠足バス代 1,200円を提出",
          priority: "high",
          memo: "おつりのないよう集金袋に入れて手渡し",
        },
        {
          title: "【子ども】11/4(水) 200円以内のおやつ選び＆シートをたたむ練習",
          priority: "medium",
          memo: "チョコ・ガム・アメは不可。袋に大きく記名",
        },
        {
          title: "【ママ】11/6(金) 8:30厳守登園・ピック不使用のお弁当＆着替え準備",
          priority: "high",
          memo: "雨天（科学館プラネタリウム）でもお弁当必須",
        },
        {
          title: "【祖父母】11/6(金) 16:15 ひまわり保育園へ早めのお迎え",
          priority: "medium",
          memo: "リュックとロッカーの予備着替え袋を持ち帰る",
        },
      ],
    },
  },
  {
    id: "vaccine",
    label: "小児科予防接種案内",
    shortTag: "小児科・医療",
    icon: "💉",
    issuer: "さくら小児科クリニック 予防接種予約通知",
    sourceText: `【さくら小児科クリニック インフルエンザ・日本脳炎（第1期追加）予防接種のご案内】
1. 接種予約日時：
   ・1回目（インフル＋日本脳炎同時接種）：2026年11月11日（水） 16:30 来院（16:15受付終了）
   ・2回目（インフル2回目）：2026年12月2日（水） 16:30 来院
2. WEB予診票の事前入力締切：接種前日 11月10日（火） 20:00までにマイページより入力
3. 当日の持ち物（忘れると接種できません）：
   ・母子健康手帳（必須）、定期予防接種予診票（日本脳炎用・保護者サイン済）
   ・市のインフルエンザ子育て助成券、マイナ保険証・子ども医療費受給者証、診察券、お薬手帳
4. 費用：日本脳炎 無料 / インフルエンザ 助成券適用後 1回 2,000円×2回＝計4,000円
5. 注意事項：来院前に自宅で検温（37.5℃以上は不可）。接種当日は激しい運動を控えて安静にお過ごしください。`,
    defaultAnalysis: {
      title: "さくら小児科 インフルエンザ・日本脳炎予防接種のご案内",
      category: "小児科・医療",
      summary:
        "11月11日(水) 16:30にインフル1回目と日本脳炎追加の同時接種、12月2日(水) 16:30にインフル2回目を予約済みです。前日20時までのWEB予診票入力と母子手帳・受給者証が必須です。",
      events: [
        {
          date: "2026-11-10(火) 20:00",
          title: "【前日締切】クリニックマイページからWEB予診票を入力＆紙予診票サイン",
          assignee: "ママ",
          reason: "インフル用WEB予診票の入力と、日本脳炎（定期接種）紙予診票の保護者自署を完了",
          isoStart: "20261110T200000",
          isoEnd: "20261110T203000",
          location: "自宅（クリニックWEBマイページ）",
          isDeadline: true,
        },
        {
          date: "2026-11-11(水) 15:45〜17:15",
          title: "1回目接種（インフル＋日本脳炎同時）送迎・付き添い・会計2,000円",
          assignee: "パパ",
          reason: "水曜早帰りのパパが15:45にお迎え→自宅で検温→16:30さくら小児科へ連れて行く",
          isoStart: "20261111T154500",
          isoEnd: "20261111T171500",
          location: "さくら小児科クリニック",
          isDeadline: false,
        },
        {
          date: "2026-11-11(水) 17:30〜20:00",
          title: "接種当日の安静見守り（激しい運動を控えて早めに入浴・就寝）",
          assignee: "祖父母",
          reason: "接種後30分〜夕方の副反応や発熱がないか、絵本を読みながらゆっくり見守る",
          isoStart: "20261111T173000",
          isoEnd: "20261111T200000",
          location: "自宅リビング",
          isDeadline: false,
        },
        {
          date: "2026-12-02(水) 16:30〜17:15",
          title: "2回目接種（インフルエンザ2回目）来院・会計2,000円",
          assignee: "パパ",
          reason: "1回目から3週間後の水曜16:30に再度来院（母子手帳・助成券を持参）",
          isoStart: "20261202T163000",
          isoEnd: "20261202T171500",
          location: "さくら小児科クリニック",
          isDeadline: false,
        },
      ],
      items_to_bring: [
        "母子健康手帳（忘れると接種不可）",
        "日本脳炎 定期予防接種予診票（保護者サイン済）",
        "市のインフルエンザ子育て助成券（1,500円割引）",
        "マイナ保険証・子ども医療費受給者証",
        "診察券・お薬手帳",
        "接種費用 2,000円（現金またはPayPay）",
        "着脱しやすい前開きの服",
      ],
      checklist_items: [
        {
          id: "vac-1",
          label: "前日11/10(火) 20:00までにWEB予診票を入力＆紙の予診票にサイン",
          assignee: "ママ",
          category: "提出・集金",
          note: "日本脳炎は紙の予診票も必要",
        },
        {
          id: "vac-2",
          label: "母子健康手帳・医療費受給者証・お薬手帳をポーチにまとめる",
          assignee: "ママ",
          category: "持ち物",
          note: "母子手帳を忘れると接種不可のため最優先",
        },
        {
          id: "vac-3",
          label: "市の助成券と自己負担金 2,000円（×2回分）を準備",
          assignee: "パパ",
          category: "提出・集金",
          note: "現金またはPayPay残高を確認",
        },
        {
          id: "vac-4",
          label: "腕を出しやすい前開きの服に着替えて出発前に体温を測る",
          assignee: "子ども",
          category: "当日準備",
          note: "37.5℃未満であることを確認",
        },
        {
          id: "vac-5",
          label: "11/11(水) 16:30 さくら小児科へ送迎＆接種後15分の院内待機",
          assignee: "パパ",
          category: "当日準備",
          note: "16:15受付終了のため16:10到着目標",
        },
        {
          id: "vac-6",
          label: "接種後の夕方、激しい遊びを控えて静かに絵本・ブロックで見守り",
          assignee: "祖父母",
          category: "当日準備",
          note: "腕の腫れや熱がないか優しくチェック",
        },
      ],
      cost: "計4,000円（日本脳炎：公費無料 / インフル：助成券適用で1回2,000円×2回）",
      grandparent_summary: [
        "11月11日（水曜）の夕方4時30分に、お父さんが小児科へ予防接種に連れて行きます。",
        "注射のあとは激しい運動ができないので、帰ってきたらお家で絵本などを読んで静かに見守ってあげてください。",
        "2回目は12月2日（水曜）です。いつも温かくサポートしてくださりありがとうございます。",
      ],
      child_message:
        "ちゅうしゃは すこし チクッとするけれど、ふゆに かぜをひかないための 大事なバリアだよ！おわったら 好きな絵本をよもうね。",
      voice_script:
        "おたよりバトンから、さくら小児科・予防接種のご案内です。1回目は11月11日水曜日の16時30分、2回目は12月2日水曜日の16時30分です。前日11月10日火曜日の夜8時までに、ママがWEB予診票を入力します。当日は水曜早帰りのパパが送迎を担当します。母子健康手帳、紙の予診票、医療費受給者証を忘れると接種できないので必ず確認してください。自己負担は1回2,000円です。",
      medication_allergy_alerts: [
        "💉 医療・アレルギー最重要確認：母子健康手帳とお薬手帳を忘れると接種できません。卵アレルギーや過去の副反応・現在服用中のお薬がある場合は、前日20:00締切のWEB予診票に必ず明記してください。",
        "🌡️ 当日検温・接種後の安静：来院前に自宅で検温（37.5℃以上は接種不可）し、接種後30分は急な副反応に備え、当日の激しい運動は控えてください。",
      ],
      reply_cushion_message:
        "さくら小児科クリニック様、いつもお世話になっております。11月11日(水) 16:30の予防接種（インフル・日本脳炎同時接種）につきまして、前日までにWEB予診票の入力を完了し、母子健康手帳・お薬手帳・紙予診票を持参のうえ父が付き添いで伺います。よろしくお願いいたします。",
      suggested_tasks: [
        {
          title: "【ママ】11/10(火) 20:00締切 WEB予診票入力＆母子手帳ポーチ準備",
          priority: "high",
          memo: "日本脳炎の紙予診票にも保護者サインを記入",
        },
        {
          title: "【パパ】11/11(水) 16:10着 さくら小児科予防接種（1回目）送迎",
          priority: "high",
          memo: "出発前に自宅検温・自己負担2,000円＋助成券持参",
        },
        {
          title: "【祖父母】11/11(水) 17:30〜 接種後の安静見守り",
          priority: "medium",
          memo: "激しい運動を避け、発熱や腕の腫れがないか確認",
        },
        {
          title: "【パパ】12/2(水) 16:10着 さくら小児科インフルエンザ2回目送迎",
          priority: "medium",
          memo: "母子健康手帳・診察券・2,000円を持参",
        },
      ],
    },
  },
  {
    id: "kenshin",
    label: "自治体検診通知",
    shortTag: "自治体・健診",
    icon: "🏥",
    issuer: "さくら市保健福祉センター 健康診査通知",
    sourceText: `【さくら市保健福祉センター 令和8年度 3歳児健康診査および高齢者いきいき健診の通知】
1. 3歳児健康診査（対象：令和5年5月生まれのお子様）
   ・日時：2026年11月19日（木） 13:15〜13:45 受付
   ・会場：さくら市保健福祉センター 2階 母子保健室
   ・持ち物：母子健康手帳、3歳児健診アンケート、視力・聴力検査票（自宅で事前実施）、当日朝の尿検体、バスタオル1枚
2. 国保・後期高齢者 いきいき健康診査＆大腸がん検診（祖父母様対象）
   ・集団検診日：2026年11月24日（火） 9:30 保健福祉センター 1階
   ・自己負担金：無料（基本健診・70歳以上がん検診公費負担）
   ・注意事項：健診当日の朝は食事を摂らずにお越しください（水・白湯は可。血圧・心臓の薬は朝7時までに服用可）。
3. 予約確定締切：11月12日（木）までに市Webポータルまたはコールセンターへ連絡`,
    defaultAnalysis: {
      title: "さくら市 3歳児健康診査＆高齢者いきいき健診の通知",
      category: "自治体・健診",
      summary:
        "11月19日(木) 13:15受付で3歳児健診、11月24日(火) 9:30に祖父母対象の「いきいき健康診査・がん検診」が保健福祉センターで実施されます。11月12日(木)までに時間帯予約が必要です。",
      events: [
        {
          date: "2026-11-12(木) 17:00",
          title: "【予約締切】市コールセンター（またはWeb）で健診時間帯を確定",
          assignee: "ママ",
          reason: "3歳児健診と祖父母の集団健診（11/24 9:30枠）をまとめてWeb予約確定",
          isoStart: "20261112T170000",
          isoEnd: "20261112T173000",
          location: "さくら市Web予約ポータル",
          isDeadline: true,
        },
        {
          date: "2026-11-18(水) 19:30",
          title: "自宅での視力・聴力絵カード検査＆3歳児アンケート記入",
          assignee: "子ども",
          reason: "同封のランドルト環・ささやき声検査シートで楽しく遊びながらチェック",
          isoStart: "20261118T193000",
          isoEnd: "20261118T201500",
          location: "自宅リビング",
          isDeadline: true,
        },
        {
          date: "2026-11-19(木) 13:15〜15:15",
          title: "3歳児健康診査（母子手帳・当日朝の採尿容器・バスタオル持参）",
          assignee: "ママ",
          reason: "朝起きたら採尿容器に尿をとり、13:15に保健福祉センター2階へ来所",
          isoStart: "20261119T131500",
          isoEnd: "20261119T151500",
          location: "さくら市保健福祉センター 2階 母子保健室",
          isDeadline: false,
        },
        {
          date: "2026-11-24(火) 09:00〜11:00",
          title: "高齢者いきいき健康診査・大腸がん検診の受診＆車送迎",
          assignee: "パパ",
          reason: "在宅勤務日のパパが朝9:00に祖父母を車で保健福祉センターへ送迎",
          isoStart: "20261124T090000",
          isoEnd: "20261124T110000",
          location: "さくら市保健福祉センター 1階 健診会場",
          isDeadline: false,
        },
        {
          date: "2026-11-24(火) 07:00〜09:30",
          title: "健診当日の朝食抜き（水・白湯は可）＆受診券・検体提出",
          assignee: "祖父母",
          reason: "当日の朝は食事を控え、血圧の薬は朝7時までに水で服用して受診",
          isoStart: "20261124T070000",
          isoEnd: "20261124T093000",
          location: "自宅〜さくら市保健福祉センター",
          isDeadline: false,
        },
      ],
      items_to_bring: [
        "母子健康手帳・3歳児健診アンケート",
        "自宅実施済みの視力・聴力検査票",
        "当日朝の尿検体（同封の採尿容器）",
        "3歳児健診用バスタオル1枚",
        "高齢者いきいき健診受診券・質問票",
        "マイナ保険証（または資格確認書）",
        "大腸がん検診の採便容器（2日分）",
      ],
      checklist_items: [
        {
          id: "ken-1",
          label: "11/12(木)までに市Webポータルで3歳児健診＆高齢者健診の時間帯を確定",
          assignee: "ママ",
          category: "提出・集金",
          note: "祖父母の11/24(火) 9:30枠も一緒に予約",
        },
        {
          id: "ken-2",
          label: "同封の絵カードで3歳児の視力・聴力検査をごっこ遊びで実施",
          assignee: "子ども",
          category: "当日準備",
          note: "前日11/18の夜にママ・パパと楽しくテスト",
        },
        {
          id: "ken-3",
          label: "11/19(木) 当日朝の採尿＆母子手帳・アンケート・バスタオル持参",
          assignee: "ママ",
          category: "持ち物",
          note: "13:15〜13:45に保健福祉センター2階で受付",
        },
        {
          id: "ken-4",
          label: "高齢者いきいき健診の質問票記入＆大腸がん検診容器（2日分）準備",
          assignee: "祖父母",
          category: "持ち物",
          note: "受診券と保険証をクリアファイルにセット",
        },
        {
          id: "ken-5",
          label: "11/24(火) 健診当日の朝は食事を抜く（お水と朝7時までの血圧薬はOK）",
          assignee: "祖父母",
          category: "当日準備",
          note: "終わったら近くで温かいブランチを食べる",
        },
        {
          id: "ken-6",
          label: "11/24(火) 朝9:00 祖父母を車で保健福祉センターへ送迎",
          assignee: "パパ",
          category: "当日準備",
          note: "駐車場から1階受付まで付き添う",
        },
      ],
      cost: "無料（基本健診・3歳児健診・70歳以上の大腸がん検診すべて公費無料）",
      grandparent_summary: [
        "11月24日（火曜）の朝9時30分から、市役所の保健福祉センターで年に1度の健康診査があります。",
        "その日の朝はお食事をせずにお水だけにして、血圧のお薬は朝7時までに飲んでおいてください（費用は無料です）。",
        "朝9時にお父さんが車で迎えに行って会場まで送迎しますので、受診券と保険証だけご用意くださいね。",
      ],
      child_message:
        "どうぶつの絵カードで「どっちをむいてるかな？」ゲームをしよう！健診の先生にも 元気におなまえが 言えるかな？",
      voice_script:
        "おたよりバトンから、さくら市・健康診査通知のまとめです。まず11月12日木曜日までにWebで予約時間帯を確定します。お子様の3歳児健診は11月19日木曜日の13時15分受付で、事前に自宅で視力と聴力の検査をし、当日朝の尿検体と母子手帳、バスタオルを持参します。おじいちゃん・おばあちゃんのいきいき健診は11月24日火曜日の朝9時30分で、当日は朝食抜き、パパが朝9時に車で送迎します。",
      medication_allergy_alerts: [
        "💊 健診当日の服薬・絶食ルール（重要）：高齢者健診（11/24）当日の朝は食事を摂らずにお越しください（水・白湯は可）。血圧・心臓のお薬は朝7:00までに少量のお水で服用可能です。",
        "🧪 検体採取メモ：3歳児健診は当日朝の尿検体、高齢者大腸がん検診は2日分の採便容器を冷暗所で保管して持参してください。",
      ],
      reply_cushion_message:
        "さくら市保健福祉センター ご担当者様、いつもお世話になっております。令和8年度 3歳児健康診査（11月19日 13:15枠）および高齢者いきいき健康診査（11月24日 9:30枠）の通知を確認し、希望時間帯の予約手続きをいたしました。当日はアンケート・検体・母子手帳・受診券を持参して伺います。よろしくお願いいたします。",
      suggested_tasks: [
        {
          title: "【ママ】11/12(木)締切 さくら市Webポータルで健診時間帯を予約確定",
          priority: "high",
          memo: "3歳児健診(11/19)と祖父母健診(11/24)の両方を予約",
        },
        {
          title: "【子ども】11/18(水) 自宅で視力・聴力絵カード検査＆アンケート記入",
          priority: "medium",
          memo: "翌朝の採尿容器をトイレに置いておく",
        },
        {
          title: "【ママ】11/19(木) 13:15 保健福祉センター2階で3歳児健診受診",
          priority: "high",
          memo: "母子手帳・アンケート・尿検体・バスタオル持参",
        },
        {
          title: "【パパ】11/24(火) 09:00 祖父母のいきいき健診を車で送迎",
          priority: "high",
          memo: "祖父母は朝食抜き（水と7時までの血圧薬は可）・受診券持参",
        },
      ],
    },
  },
];

const DEFAULT_FAMILY_ROLES =
  "ママ：平日朝の準備・連絡帳・お弁当 / パパ：水曜早帰り・提出物や集金・週末設営 / 子ども：自分の持ち物・体操服・記名確認 / 祖父母：金曜のお迎え・行事応援・見守り";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

/**
 * Ensure valid YYYYMMDDTHHMMSS for Google Calendar and .ics
 */
function ensureCompactIso(
  ev: OtayoriEvent,
  indexOffset = 0
): { start: string; end: string } {
  if (
    ev.isoStart &&
    /^\d{8}T\d{6}$/.test(ev.isoStart) &&
    ev.isoEnd &&
    /^\d{8}T\d{6}$/.test(ev.isoEnd)
  ) {
    return { start: ev.isoStart, end: ev.isoEnd };
  }

  const dateText = ev.date || "";
  const yearMatch = dateText.match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : 2026;

  let month = 11;
  let day = 10 + (indexOffset % 15);
  const mdKanji = dateText.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  const mdSlash = dateText.match(/(?:20\d{2}[/\-.])?(\d{1,2})\s*[/\-.]\s*(\d{1,2})/);
  if (mdKanji) {
    month = Math.min(12, Math.max(1, Number(mdKanji[1])));
    day = Math.min(28, Math.max(1, Number(mdKanji[2])));
  } else if (mdSlash) {
    month = Math.min(12, Math.max(1, Number(mdSlash[1])));
    day = Math.min(28, Math.max(1, Number(mdSlash[2])));
  }

  const times = [...dateText.matchAll(/(\d{1,2}):(\d{2})/g)];
  let sh = 9;
  let sm = 0;
  let eh = 10;
  let em = 0;
  if (times.length >= 1) {
    sh = Math.min(23, Math.max(0, Number(times[0][1])));
    sm = Math.min(59, Math.max(0, Number(times[0][2])));
    eh = Math.min(23, sh + 1);
    em = sm;
  }
  if (times.length >= 2) {
    eh = Math.min(23, Math.max(sh, Number(times[1][1])));
    em = Math.min(59, Math.max(0, Number(times[1][2])));
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${year}${pad(month)}${pad(day)}`;
  return {
    start: `${ymd}T${pad(sh)}${pad(sm)}00`,
    end: `${ymd}T${pad(eh)}${pad(em)}00`,
  };
}

/**
 * Build a real Google Calendar TEMPLATE deep link
 */
function buildGoogleCalendarUrl(
  ev: OtayoriEvent,
  docTitle: string,
  itemsToBring: string[],
  idx: number
): string {
  const { start, end } = ensureCompactIso(ev, idx);
  const role = normalizeRoleKey(ev.assignee);
  const title = `【${role}】${ev.title}`;
  const detailsLines = [
    `📄 おたより件名: ${docTitle}`,
    `👤 家族バトン担当: ${role}`,
    `💡 担当理由・メモ: ${ev.reason}`,
    itemsToBring.length > 0
      ? `🎒 持ち物・準備物: ${itemsToBring.slice(0, 6).join(" / ")}`
      : "",
    "— おたよりバトン Ultra で自動抽出",
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: detailsLines.join("\n"),
    location: ev.location || "おたより記載の場所",
    ctz: "Asia/Tokyo",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an RFC 5545 .ics calendar file containing all extracted family events
 */
function buildIcsContent(analysis: OtayoriAnalysis): string {
  const escapeIcs = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const nowStamp = "20261001T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OtayoriBaton Ultra//Family Schedule JP//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`おたよりバトン：${analysis.title}`)}`,
    "X-WR-TIMEZONE:Asia/Tokyo",
  ];

  analysis.events.forEach((ev, idx) => {
    const { start, end } = ensureCompactIso(ev, idx);
    const role = normalizeRoleKey(ev.assignee);
    const summary = `【${role}】${ev.title}`;
    const desc = [
      `おたより: ${analysis.title}`,
      `担当: ${role}`,
      `理由: ${ev.reason}`,
      `費用・集金: ${analysis.cost}`,
      analysis.items_to_bring.length > 0
        ? `持ち物: ${analysis.items_to_bring.join("、")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:otayori-ultra-${idx + 1}-${start}@otayoribaton.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;TZID=Asia/Tokyo:${start}`,
      `DTEND;TZID=Asia/Tokyo:${end}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(desc)}`,
      `LOCATION:${escapeIcs(ev.location || "おたより記載の会場")}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT12H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`【おたよりバトン前日確認】${summary}`)}`,
      "END:VALARM",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function defaultChecklistForAnalysis(
  analysis: OtayoriAnalysis
): PersistedChecklistItem[] {
  if (analysis.checklist_items && analysis.checklist_items.length > 0) {
    return analysis.checklist_items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${idx + 1}`,
      assignee: normalizeRoleKey(item.assignee),
      checked: false,
    }));
  }
  return analysis.items_to_bring.map((label, idx) => ({
    id: `bring-${idx + 1}`,
    label,
    assignee: ROLE_ORDER[idx % ROLE_ORDER.length],
    category: "持ち物",
    checked: false,
  }));
}

type OtayoriGoalId = "school" | "medical" | "municipal";

interface OtayoriGoalOption {
  id: OtayoriGoalId;
  title: string;
  badge: string;
  description: string;
  defaultPresetId: PresetDefinition["id"];
  presetIds: PresetDefinition["id"][];
  placeholder: string;
  accentColor: string;
  bgSoft: string;
  borderSoft: string;
}

const OTAYORI_GOALS: OtayoriGoalOption[] = [
  {
    id: "school",
    title: "🏫 学校・保育園のおたよりを予定＆持ち物にする",
    badge: "STEP 1 → 学校・保育園プリント",
    description:
      "運動会・遠足・行事プリントから、日程・持ち物・家族（ママ・パパ・子ども・祖父母）の担当を自動で整理します。",
    defaultPresetId: "undokai",
    presetIds: ["undokai", "ensoku"],
    placeholder:
      "学校・保育園プリントの文章や連絡アプリのテキストを貼り付けてください（写真のみでも解析できます）",
    accentColor: "#ea580c",
    bgSoft: "#fff7ed",
    borderSoft: "#fdba74",
  },
  {
    id: "medical",
    title: "💊 お薬・アレルギー・病院メモを家族へ共有する",
    badge: "STEP 1 → お薬・アレルギー・病院",
    description:
      "予防接種案内・処方薬の説明書・アレルギー表から、服薬ルールや持ち物・見落とし防止メモを作成して家族へ共有します。",
    defaultPresetId: "vaccine",
    presetIds: ["vaccine"],
    placeholder:
      "予防接種のお知らせ・処方箋メモ・アレルギー注意書きの文章を入力してください（写真のみでも解析できます）",
    accentColor: "#e11d48",
    bgSoft: "#fff1f2",
    borderSoft: "#fda4af",
  },
  {
    id: "municipal",
    title: "🏛️ 役所・検診・手続きの締切をカレンダーに入れる",
    badge: "STEP 1 → 役所・検診・手続き",
    description:
      "自治体からの健康診査通知や各種申請プリントから、予約・提出の締切日と当日の持ち物を抽出してカレンダーに登録します。",
    defaultPresetId: "kenshin",
    presetIds: ["kenshin"],
    placeholder:
      "市役所・保健センターからの健診通知や手続き案内の文章を入力してください（写真のみでも解析できます）",
    accentColor: "#2563eb",
    bgSoft: "#eff6ff",
    borderSoft: "#bfdbfe",
  },
];

export default function OtayoriUltra() {
  // Progressive Disclosure state: Step 1 (choose goal) -> Step 2 (input) -> Step 3 (results after analysis)
  const [selectedGoal, setSelectedGoal] = useState<OtayoriGoalId | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [extraTab, setExtraTab] = useState<"share" | "family" | "save">("share");

  const [activePresetId, setActivePresetId] = useState<PresetDefinition["id"]>("undokai");
  const [sourceText, setSourceText] = useState<string>(PRESETS[0].sourceText);
  const [familyRoles, setFamilyRoles] = useState<string>(DEFAULT_FAMILY_ROLES);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [imageSourceLabel, setImageSourceLabel] = useState<string>("");

  const [analysis, setAnalysis] = useState<OtayoriAnalysis>(PRESETS[0].defaultAnalysis);
  const [usedModelLabel, setUsedModelLabel] = useState<string>(
    "gemini-2.5-flash (プリセット即時ロード済)"
  );

  const [checklist, setChecklist] = useState<PersistedChecklistItem[]>(() =>
    defaultChecklistForAnalysis(PRESETS[0].defaultAnalysis)
  );
  const [roleFilter, setRoleFilter] = useState<FamilyRole | "ALL">("ALL");
  const [newItemText, setNewItemText] = useState<string>("");
  const [newItemRole, setNewItemRole] = useState<FamilyRole>("ママ");

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [syncingGas, setSyncingGas] = useState<boolean>(false);
  const [archivingDrive, setArchivingDrive] = useState<boolean>(false);
  const [driveArchiveInfo, setDriveArchiveInfo] = useState<{
    mode: string;
    url?: string;
    folder?: string;
    message?: string;
    timestamp?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [copiedLine, setCopiedLine] = useState<boolean>(false);
  const [copiedGrandma, setCopiedGrandma] = useState<boolean>(false);
  const [showLinePreview, setShowLinePreview] = useState<boolean>(false);
  const [cushionMode, setCushionMode] = useState<"confirm" | "absence" | "allergy">("confirm");
  const [copiedCushion, setCopiedCushion] = useState<boolean>(false);
  const [showCushionPreview, setShowCushionPreview] = useState<boolean>(true);

  // Web Speech API state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeSpeechLabel, setActiveSpeechLabel] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const docKey = useMemo(() => {
    return (analysis.title || activePresetId || "default").trim();
  }, [analysis.title, activePresetId]);

  // Load persisted checklist & event role overrides from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setChecklist(defaultChecklistForAnalysis(analysis));
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedBatonState>;
      const savedChecklist = parsed.checklistByDoc?.[docKey];
      if (Array.isArray(savedChecklist) && savedChecklist.length > 0) {
        setChecklist(savedChecklist);
      } else {
        setChecklist(defaultChecklistForAnalysis(analysis));
      }

      const savedAssignees = parsed.eventAssigneesByDoc?.[docKey];
      if (savedAssignees && typeof savedAssignees === "object") {
        setAnalysis((prev) => ({
          ...prev,
          events: prev.events.map((ev, idx) =>
            savedAssignees[idx]
              ? { ...ev, assignee: savedAssignees[idx] }
              : ev
          ),
        }));
      }
    } catch {
      setChecklist(defaultChecklistForAnalysis(analysis));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  const persistState = useCallback(
    (
      nextChecklist: PersistedChecklistItem[],
      nextEvents?: OtayoriEvent[]
    ) => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed: PersistedBatonState = raw
          ? (JSON.parse(raw) as PersistedBatonState)
          : { checklistByDoc: {}, eventAssigneesByDoc: {} };

        parsed.checklistByDoc = parsed.checklistByDoc || {};
        parsed.eventAssigneesByDoc = parsed.eventAssigneesByDoc || {};

        parsed.checklistByDoc[docKey] = nextChecklist;

        if (nextEvents) {
          const map: Record<number, FamilyRole> = {};
          nextEvents.forEach((ev, i) => {
            map[i] = normalizeRoleKey(ev.assignee);
          });
          parsed.eventAssigneesByDoc[docKey] = map;
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore quota errors in private browsing
      }
    },
    [docKey]
  );

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeechLabel("");
  }

  function speakText(text: string, label: string, customRate?: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("お使いのブラウザは音声読み上げ (Web Speech API) に対応していません。");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = customRate ?? speechRate;
    utterance.pitch = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find((v) => v.lang.includes("ja") || v.lang.includes("JP"));
    if (jpVoice) {
      utterance.voice = jpVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setActiveSpeechLabel(label);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeechLabel("");
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveSpeechLabel("");
    };

    setIsSpeaking(true);
    setActiveSpeechLabel(label);
    window.speechSynthesis.speak(utterance);
  }

  function handleSpeakFullSummary() {
    const uncheckedItems = checklist.filter((c) => !c.checked);
    const itemsSpeech =
      uncheckedItems.length > 0
        ? `まだ準備していない持ち物・やることは、${uncheckedItems
            .slice(0, 5)
            .map((c) => `${c.assignee}担当の${c.label}`)
            .join("、")}、など全${uncheckedItems.length}件です。`
        : "持ち物チェックリストはすべて完了しています！バッチリです。";

    const script = [
      analysis.voice_script ||
        `おたよりバトンから「${analysis.title}」のまとめを読み上げます。${analysis.summary}`,
      itemsSpeech,
    ].join(" ");

    speakText(script, "全体まとめ＆未完了の持ち物");
  }

  function handleSpeakGrandparent() {
    const script = [
      `おじいちゃん、おばあちゃんへ。「${analysis.title}」のやさしい3行まとめです。`,
      ...analysis.grandparent_summary,
    ].join(" ");
    speakText(script, "祖父母向けやさしい3行要約（ゆっくり）", 0.85);
  }

  function handleSpeakChildItems() {
    const childItems = checklist.filter((c) => c.assignee === "子ども");
    const listText =
      childItems.length > 0
        ? childItems.map((c) => c.label).join("、")
        : analysis.items_to_bring.slice(0, 4).join("、");
    const script = [
      "こどもバトンのお知らせです！",
      analysis.child_message || "じぶんで もちものを そろえてみよう！",
      `じぶんで じゅんびするものは、${listText} です。できたら チェックをつけてね！`,
    ].join(" ");
    speakText(script, "子ども向け持ち物チェック", 0.95);
  }

  function clearImage() {
    setImagePreview(null);
    setImageBase64("");
    setImageMimeType("");
    setImageSourceLabel("");
  }

  function processImageFile(file: File, sourceLabel: string) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      clearImage();
      setError("PNG / JPEG / WebP のおたより画像を選択してください。");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      clearImage();
      setError("画像サイズは 10 MB 以下にしてください。");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      clearImage();
      setError("画像の読み込みに失敗しました。");
    };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
        let dataUrl = result;
        let mime = file.type || "image/png";
        if (scale < 1 || file.size > 1.5 * 1024 * 1024) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            mime = "image/jpeg";
          }
        }
        const [, base64] = dataUrl.split(",");
        setImagePreview(dataUrl);
        setImageBase64(base64 ?? "");
        setImageMimeType(mime);
        setImageSourceLabel(sourceLabel);
        setNotice(
          `📷 ${sourceLabel}を読み込みました！「AIでおたよりを解析」を押すと Gemini Vision で画像解析します。`
        );
      };
      img.onerror = () => {
        clearImage();
        setError("画像を解釈できませんでした。別の画像でお試しください。");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  function handleImageInputChange(
    e: ChangeEvent<HTMLInputElement>,
    sourceLabel: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, sourceLabel);
  }

  /**
   * Generates a realistic visual Japanese handout image on an HTML5 Canvas
   * so judges without a physical school handout can test multimodal base64 image upload in 1 click!
   */
  function handleGenerateSimulatedHandoutPhoto() {
    const currentPreset =
      PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
    const canvas = document.createElement("canvas");
    canvas.width = 760;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Warm paper background
    ctx.fillStyle = "#fffdf9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative border
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    // Header banner
    ctx.fillStyle = "#ffedd5";
    ctx.fillRect(34, 34, canvas.width - 68, 64);
    ctx.fillStyle = "#9a3412";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(currentPreset.issuer, 50, 74);

    // Red school/clinic stamp (Hanko)
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(canvas.width - 78, 66, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("確認済", canvas.width - 98, 71);

    // Body lines
    ctx.fillStyle = "#1c1917";
    ctx.font = "15px sans-serif";
    const lines = currentPreset.sourceText.split(/\r?\n/);
    let y = 130;
    lines.slice(0, 12).forEach((line) => {
      const chunks = line.match(/.{1,42}/g) || [line];
      chunks.forEach((chunk) => {
        if (y < 475) {
          ctx.fillText(chunk, 44, y);
          y += 26;
        }
      });
    });

    // Cut-off slip line at bottom
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(36, 488);
    ctx.lineTo(canvas.width - 36, 488);
    ctx.stroke();
    ctx.fillStyle = "#57534e";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("✂ 切り取り線 ── 提出票・確認欄（保護者記入・押印）", 48, 512);

    const dataUrl = canvas.toDataURL("image/png");
    const [, base64] = dataUrl.split(",");
    setImagePreview(dataUrl);
    setImageBase64(base64 ?? "");
    setImageMimeType("image/png");
    setImageSourceLabel(`擬似プリント撮影画像（${currentPreset.label}）`);
    setError(null);
    setNotice(
      `📸 「${currentPreset.label}」のプリント紙面画像（Base64 PNG）を生成してカメラ入力にセットしました！そのまま Gemini Vision 解析を実行できます。`
    );
  }

  const activeGoal = OTAYORI_GOALS.find((g) => g.id === selectedGoal) ?? null;
  const availablePresets = useMemo(() => {
    if (!activeGoal) return PRESETS;
    return PRESETS.filter((p) => activeGoal.presetIds.includes(p.id));
  }, [activeGoal]);

  function handleSelectGoal(goal: OtayoriGoalOption) {
    stopSpeaking();
    const defaultPreset =
      PRESETS.find((p) => p.id === goal.defaultPresetId) ?? PRESETS[0];
    setSelectedGoal(goal.id);
    setHasAnalyzed(false);
    setActivePresetId(defaultPreset.id);
    setSourceText(defaultPreset.sourceText);
    setAnalysis(defaultPreset.defaultAnalysis);
    clearImage();
    setError(null);
    setNotice(null);
  }

  function handleResetGoal() {
    stopSpeaking();
    setSelectedGoal(null);
    setHasAnalyzed(false);
    clearImage();
    setError(null);
    setNotice(null);
  }

  function handleSelectPreset(preset: PresetDefinition) {
    stopSpeaking();
    setActivePresetId(preset.id);
    setSourceText(preset.sourceText);
    setAnalysis(preset.defaultAnalysis);
    setUsedModelLabel("gemini-2.5-flash");
    setError(null);
    setNotice(
      `✨ サンプル「${preset.label}」を入力ボックスにセットしました！「AIでおたよりを解析」ボタンを押すと予定と持ち物を抽出します。`
    );
  }

  async function handleAnalyze(e?: FormEvent) {
    if (e) e.preventDefault();
    stopSpeaking();
    setAnalyzing(true);
    setError(null);
    setNotice(null);

    const currentPreset =
      PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
    const textToSend = sourceText.trim() || currentPreset.sourceText;

    try {
      const res = await fetch("/api/otayori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: textToSend,
          familyRoles,
          imageBase64,
          imageMimeType,
          presetId: activePresetId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "おたよりの解析に失敗しました。");
      }
      if (data.analysis) {
        const nextAnalysis = data.analysis as OtayoriAnalysis;
        setAnalysis(nextAnalysis);
        const freshChecklist = defaultChecklistForAnalysis(nextAnalysis);
        setChecklist(freshChecklist);
        persistState(freshChecklist, nextAnalysis.events);
      }
      if (typeof data.usedModel === "string") {
        setUsedModelLabel(data.usedModel);
      }
      setHasAnalyzed(true);
      setNotice(
        imageBase64
          ? "📸 おたより画像とテキストを解析し、カレンダー予定と家族チェックリストを作成しました！"
          : "✨ おたよりを解析し、カレンダー予定と家族チェックリストを作成しました！"
      );
    } catch (err) {
      // Fallback to preset defaultAnalysis so Step 3 still works seamlessly
      setAnalysis(currentPreset.defaultAnalysis);
      const freshChecklist = defaultChecklistForAnalysis(currentPreset.defaultAnalysis);
      setChecklist(freshChecklist);
      setHasAnalyzed(true);
      setError(
        err instanceof Error ? err.message : "解析中にエラーが発生しました。"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function handleCycleEventRole(eventIndex: number) {
    setAnalysis((prev) => {
      const updated = prev.events.map((ev, idx) => {
        if (idx !== eventIndex) return ev;
        const next = nextRole(normalizeRoleKey(ev.assignee));
        return {
          ...ev,
          assignee: next,
        };
      });
      persistState(checklist, updated);
      return { ...prev, events: updated };
    });
  }

  function handleToggleCheckItem(id: string) {
    setChecklist((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      persistState(next);
      return next;
    });
  }

  function handleChangeItemRole(id: string, role: FamilyRole) {
    setChecklist((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, assignee: role } : item
      );
      persistState(next);
      return next;
    });
  }

  function handleAddChecklistItem(e: FormEvent) {
    e.preventDefault();
    const label = newItemText.trim();
    if (!label) return;
    const newItem: PersistedChecklistItem = {
      id: `custom-${Date.now()}`,
      label,
      assignee: newItemRole,
      category: "持ち物",
      checked: false,
    };
    const next = [...checklist, newItem];
    setChecklist(next);
    persistState(next);
    setNewItemText("");
  }

  function handleResetChecklist() {
    const fresh = defaultChecklistForAnalysis(analysis);
    setChecklist(fresh);
    persistState(fresh, analysis.events);
    setNotice("家族バトンのチェックリストを初期状態にリセットしました。");
  }

  function handleDownloadIcs() {
    const icsContent = buildIcsContent(analysis);
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otayori-baton-${activePresetId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotice(
      `📅 家族カレンダー用 .ics ファイル（全 ${analysis.events.length} 件の予定・前日アラーム付き）をダウンロードしました！`
    );
  }

  const lineGroupSummaryText = useMemo(() => {
    const lines: string[] = [
      `📣【おたよりバトン】${analysis.title}`,
      `📝 ${analysis.summary}`,
      `💴 費用・集金：${analysis.cost}`,
      "",
      "━━━━━━━━━━━━━━",
      "🔁 家族みんなの担当バトン",
      "━━━━━━━━━━━━━━",
    ];

    FAMILY_ROLES.forEach((role) => {
      const roleEvents = analysis.events.filter(
        (ev) => normalizeRoleKey(ev.assignee) === role.key
      );
      const roleItems = checklist.filter((c) => c.assignee === role.key);
      if (roleEvents.length === 0 && roleItems.length === 0) return;

      lines.push(`\n${role.icon} 【${role.shortLabel}のバトン】`);
      roleEvents.forEach((ev) => {
        lines.push(`・📅 ${ev.date}：${ev.title}`);
      });
      roleItems.forEach((item) => {
        lines.push(`・${item.checked ? "✅" : "⬜"} ${item.label}`);
      });
    });

    lines.push(
      "",
      "👵 【おじいちゃん・おばあちゃんへ3行まとめ】",
      ...analysis.grandparent_summary.map((l, i) => `${i + 1}. ${l}`)
    );

    return lines.join("\n");
  }, [analysis, checklist]);

  async function handleCopyLineSummary() {
    try {
      await navigator.clipboard.writeText(lineGroupSummaryText);
      setCopiedLine(true);
      setShowLinePreview(true);
      setNotice("💬 LINE 家族グループ用の役割分担まとめをクリップボードにコピーしました！");
      setTimeout(() => setCopiedLine(false), 3000);
    } catch {
      setShowLinePreview(true);
      setError("コピーに失敗しました。下のプレビュー欄から手動でコピーしてください。");
    }
  }

  const replyCushionText = useMemo(() => {
    const mainEventDate = analysis.events[0]?.date ?? "本日・行事当日";
    if (cushionMode === "absence") {
      return [
        "【園・学校・病院への欠席／日程変更のご連絡】",
        "いつも大変お世話になっております。",
        `本日（または ${mainEventDate} の「${analysis.title}」）につきまして、今朝から発熱・体調不良が見られるため、大事をとってお休み（または日程変更のご相談）をさせていただきたくご連絡いたしました。`,
        analysis.cost && analysis.cost !== "なし"
          ? `なお、提出物や費用（${analysis.cost}）につきましては、回復後の登園・来所時または家族経由で改めて提出いたします。`
          : "なお、必要な提出物や配布プリントにつきましては、回復後の登園・登校時に確認させていただきます。",
        "直前のご連絡となり恐縮ですが、どうぞよろしくお願いいたします。",
      ].join("\n");
    }
    if (cushionMode === "allergy") {
      const medNotes =
        analysis.medication_allergy_alerts &&
        analysis.medication_allergy_alerts.length > 0
          ? analysis.medication_allergy_alerts.join(" / ")
          : "お薬の服用・食物アレルギー配慮";
      return [
        "【お薬の持参・アレルギー配慮に関するお願い（連絡帳用）】",
        "いつも温かく見守っていただきありがとうございます。",
        `「${analysis.title}」に関連して、健康・お薬・アレルギー面の確認事項をご連絡いたします。`,
        `・確認メモ：${medNotes}`,
        "・当日は処方薬（またはお薬手帳・アレルギー対応食）を記名のうえ持参いたします。お忙しいところ恐れ入りますが、ご配慮のほどよろしくお願いいたします。",
      ].join("\n");
    }
    return (
      analysis.reply_cushion_message ||
      `いつもお世話になっております。「${analysis.title}」のお知らせを確認いたしました。必要書類・持ち物（${analysis.items_to_bring
        .slice(0, 3)
        .join("、")}等）を準備のうえ予定通り参加・対応いたします。どうぞよろしくお願いいたします。`
    );
  }, [analysis, cushionMode]);

  async function handleCopyCushionMessage() {
    try {
      await navigator.clipboard.writeText(replyCushionText);
      setCopiedCushion(true);
      setShowCushionPreview(true);
      setNotice("✉️ 先生・窓口へそのまま送れる丁寧な返信・欠席クッション文をコピーしました！");
      setTimeout(() => setCopiedCushion(false), 3000);
    } catch {
      setShowCushionPreview(true);
      setError("コピーに失敗しました。プレビュー欄から手動でコピーしてください。");
    }
  }

  async function handleCopyGrandmaSummary() {
    const text = [
      `【${analysis.title}（やさしい3行まとめ）】`,
      ...analysis.grandparent_summary.map((line, i) => `${i + 1}. ${line}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGrandma(true);
      setTimeout(() => setCopiedGrandma(false), 2500);
    } catch {
      setError("クリップボードへのコピーに失敗しました。");
    }
  }

  async function handleSyncToGas() {
    setSyncingGas(true);
    setError(null);
    setNotice(null);

    const tasksToSync =
      analysis.suggested_tasks.length > 0
        ? analysis.suggested_tasks
        : analysis.events.map((ev) => ({
            title: `【${normalizeRoleKey(ev.assignee)}】${ev.title}`,
            priority: "medium" as const,
            memo: `${ev.date} / ${ev.reason}`,
          }));

    try {
      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `【おたよりバトン】${analysis.title}`,
          summary: `${analysis.summary}（費用: ${analysis.cost}）`,
          tasks: tasksToSync,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            "Google Apps Script 連携に失敗しました（上の「Googleカレンダーに追加」または「.ics一括ダウンロード」は設定不要ですぐ使えます）。"
        );
      }
      setNotice(
        `✓ 家族の Google Workspace へ連携しました（シート追記: ${
          data.addedRows ?? 0
        } 行 / カレンダー登録: ${data.addedEvents ?? 0} 件）。`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google Workspace 連携中にエラーが発生しました。"
      );
    } finally {
      setSyncingGas(false);
    }
  }

  function handleDownloadLocalMarkdown() {
    const mdContent = [
      `# ${analysis.title}`,
      `- 分類: ${analysis.category}`,
      `- 費用・集金: ${analysis.cost}`,
      `- 要約: ${analysis.summary}`,
      "",
      lineGroupSummaryText,
    ].join("\n");
    const blob = new Blob([mdContent], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otayori-baton-${activePresetId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadLocalJson() {
    const payload = {
      app: "OtayoriBaton Ultra",
      savedAt: new Date().toISOString(),
      presetId: activePresetId,
      analysis,
      checklist,
      familyRoles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otayori-baton-${activePresetId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleSaveToLocalDevice() {
    setArchivingDrive(true);
    setError(null);
    setNotice(null);

    try {
      handleDownloadLocalMarkdown();
      setDriveArchiveInfo({
        mode: "local-ssd-download",
        folder: `Downloads/otayori-baton-${activePresetId}.md (.json)`,
        message:
          "設定不要・完全無料で PC・スマホのローカルストレージにおたよりまとめを保存しました（下のボタンで .md / .json を個別保存できます）。",
        timestamp: new Date().toISOString(),
      });
      setNotice(
        `💾 PC・スマホに「${analysis.title}」のまとめファイル (.md) を保存しました！`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ローカルファイル保存中にエラーが発生しました。"
      );
    } finally {
      setArchivingDrive(false);
    }
  }

  const completedCount = checklist.filter((c) => c.checked).length;
  const totalCount = checklist.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredChecklist = useMemo(() => {
    if (roleFilter === "ALL") return checklist;
    return checklist.filter((item) => item.assignee === roleFilter);
  }, [checklist, roleFilter]);

  return (
    <div className="ou-shell">
      <nav className="ou-topnav" aria-label="アプリ切り替えナビゲーション">
        <div className="ou-topnav-inner">
          <div className="ou-brand-group">
            <span className="ou-brand-icon" aria-hidden="true">
              🍊
            </span>
            <span className="ou-brand">おたよりバトン Ultra</span>
            <span className="ou-badge-ai">
              ✦ Gemini 2.5 Flash Vision + 家族4役バトン
            </span>
          </div>
          <div className="ou-nav-links">
            <Link href="/" className="ou-nav-link">
              🏠 ホーム
            </Link>
            <Link href="/codemistake" className="ou-nav-link">
              🪞 CodePitfall（開発）
            </Link>
            <Link href="/machieye" className="ou-nav-link">
              🛰️ MachiEye（まち・防災）
            </Link>
            <Link href="/gitbridge" className="ou-nav-link">
              🌉 GitBridge
            </Link>
          </div>
        </div>
      </nav>

      <main className="ou-container">
        {/* Clean Hero Header */}
        <header className="ou-hero-header">
          <div className="ou-hero-text">
            <div className="ou-tag-row">
              <span className="ou-cat-tag">🏠 暮らしと家族の部門</span>
              {hasAnalyzed && <span className="ou-model-pill">⚡ {usedModelLabel}</span>}
            </div>
            <h1 className="ou-main-title">
              プリント・連絡・お薬メモを、家族の予定＆持ち物バトンへ
            </h1>
            <p className="ou-subtitle">
              {selectedGoal === null
                ? "まずはやりたいことを1つ選んでください。選んだあとに必要な入力だけを表示します。"
                : !hasAnalyzed
                ? "写真を添付するかサンプルボタンを押して、「AIでおたよりを解析」を実行してください。"
                : "抽出された予定のカレンダー登録と、家族の持ち物チェックリストが作成されました。"}
            </p>
          </div>
        </header>

        {/* ============================================================
            STEP 1: INITIAL SCREEN — ONLY 3 BIG GOAL CARDS
           ============================================================ */}
        {selectedGoal === null && (
          <section aria-label="まずはやりたいことを選ぶ" style={{ marginTop: 12 }}>
            <div className="ou-step-heading" style={{ marginBottom: 16 }}>
              <span className="ou-step-badge">STEP 1</span>
              <h2 className="ou-card-title" style={{ fontSize: "1.22rem" }}>
                まずはやりたいことを選ぶ
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: 16,
              }}
            >
              {OTAYORI_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => handleSelectGoal(goal)}
                  style={{
                    textAlign: "left",
                    background: "#ffffff",
                    border: `2px solid ${goal.borderSoft}`,
                    borderRadius: 18,
                    padding: "22px 20px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    boxShadow: "0 4px 18px rgba(120, 53, 15, 0.06)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: goal.accentColor,
                        background: goal.bgSoft,
                        border: `1px solid ${goal.borderSoft}`,
                        padding: "3px 10px",
                        borderRadius: 999,
                        marginBottom: 12,
                      }}
                    >
                      {goal.badge}
                    </span>
                    <div
                      style={{
                        fontSize: "1.18rem",
                        fontWeight: 800,
                        color: "#1c1917",
                        lineHeight: 1.4,
                        marginBottom: 8,
                      }}
                    >
                      {goal.title}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#57534e",
                        lineHeight: 1.6,
                      }}
                    >
                      {goal.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: goal.accentColor,
                    }}
                  >
                    <span>この内容で進む →</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            STEP 2: PHOTO UPLOAD / SAMPLE BUTTON & INPUT BOX FOR GOAL
           ============================================================ */}
        {selectedGoal !== null && activeGoal && (
          <div>
            {/* Back button & current goal banner */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
                padding: "12px 16px",
                background: activeGoal.bgSoft,
                border: `1.5px solid ${activeGoal.borderSoft}`,
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleResetGoal}
                  className="ou-btn-secondary"
                  style={{ fontWeight: 800, background: "#ffffff" }}
                >
                  ← 選び直す
                </button>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: activeGoal.accentColor }}>
                    STEP 2 · 選択中のやりたいこと
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1c1917" }}>
                    {activeGoal.title}
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Banners */}
            {error && (
              <div className="ou-alert-error" role="alert">
                <span>⚠️ <strong>確認:</strong> {error}</span>
                <button
                  type="button"
                  className="ou-alert-close"
                  onClick={() => setError(null)}
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            )}
            {notice && (
              <div className="ou-alert-success" role="status">
                <span>{notice}</span>
                <button
                  type="button"
                  className="ou-alert-close"
                  onClick={() => setNotice(null)}
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Focused Input Card for the Picked Goal */}
            <section className="ou-card">
              <div className="ou-card-header">
                <div className="ou-step-heading">
                  <span className="ou-step-badge">STEP 2</span>
                  <h2 className="ou-card-title">
                    写真を添付 または テキストを入力して解析する
                  </h2>
                </div>

                {/* Goal-specific Sample Buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={
                        activePresetId === preset.id ? "ou-btn-warm" : "ou-btn-secondary"
                      }
                    >
                      ✨ {preset.icon} {preset.label}（サンプル入力）
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAnalyze} className="ou-input-form">
                <div className="ou-input-grid">
                  {/* Left Column: Multimodal Camera & Photo Upload */}
                  <div className="ou-field">
                    <div className="ou-label-row">
                      <label htmlFor="otayori-file-input" className="ou-field-label">
                        📸 プリント・お薬説明書・通知の写真（任意）
                      </label>
                    </div>

                    <div
                      className={`ou-dropzone ${imagePreview ? "has-image" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) processImageFile(file, "ドロップされた画像");
                      }}
                    >
                      {imagePreview ? (
                        <div className="ou-preview-container">
                          <img
                            src={imagePreview}
                            alt="アップロードしたおたよりのプレビュー"
                            className="ou-preview-img"
                          />
                          <div className="ou-preview-caption">
                            <span>✓ {imageSourceLabel || "おたより画像セット済"}</span>
                            <button
                              type="button"
                              className="ou-clear-img-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearImage();
                              }}
                            >
                              画像をクリア
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="ou-dropzone-empty">
                          <span className="ou-dropzone-icon" aria-hidden="true">
                            📷
                          </span>
                          <span className="ou-dropzone-title">
                            クリックまたはドラッグ＆ドロップで写真を添付
                          </span>
                          <span className="ou-dropzone-sub">
                            PNG / JPEG / WebP（写真だけでも解析できます）
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hidden File & Camera Inputs */}
                    <input
                      ref={fileInputRef}
                      id="otayori-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="ou-sr-only"
                      onChange={(e) => handleImageInputChange(e, "選択した写真")}
                    />
                    <input
                      ref={cameraInputRef}
                      id="otayori-camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="ou-sr-only"
                      onChange={(e) => handleImageInputChange(e, "カメラ撮影写真")}
                    />

                    <div className="ou-camera-btn-row">
                      <button
                        type="button"
                        className="ou-btn-secondary"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        📸 カメラ撮影
                      </button>
                      <button
                        type="button"
                        className="ou-btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        🖼️ 写真を選択
                      </button>
                      <button
                        type="button"
                        className="ou-btn-warm"
                        onClick={handleGenerateSimulatedHandoutPhoto}
                      >
                        🖨️ サンプルプリント画像を添付
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Source Text & Optional Family Roles Accordion */}
                  <div className="ou-field">
                    <label htmlFor="otayori-source-text" className="ou-field-label">
                      📄 おたより・メモの文章（自由に編集できます）
                    </label>
                    <textarea
                      id="otayori-source-text"
                      rows={7}
                      className="ou-textarea"
                      placeholder={activeGoal.placeholder}
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                    />

                    <details style={{ marginTop: 6 }}>
                      <summary
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "#78716c",
                          cursor: "pointer",
                        }}
                      >
                        👨‍👩‍👧‍👦 家族の役割・曜日ルールをカスタマイズ（任意）
                      </summary>
                      <input
                        id="otayori-family-roles"
                        type="text"
                        className="ou-text-input"
                        style={{ marginTop: 6 }}
                        value={familyRoles}
                        onChange={(e) => setFamilyRoles(e.target.value)}
                      />
                    </details>
                  </div>
                </div>

                <div className="ou-analyze-bar">
                  <div className="ou-analyze-note">
                    💡 解析ボタンを押すと、カレンダー登録リンク・持ち物チェックリスト・共有文が表示されます。
                  </div>
                  <button
                    type="submit"
                    className="ou-btn-primary"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <span className="ou-spinner" aria-hidden="true" />
                        AI で解析中...
                      </>
                    ) : (
                      "✨ AI でおたよりを解析して予定＆持ち物を作成 →"
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* ============================================================
                STEP 3: EXTRACTED RESULTS (SHOWN ONLY AFTER ANALYSIS RUNS)
               ============================================================ */}
            {hasAnalyzed && (
              <section className="ou-result-shell" aria-label="おたより解析結果">
                {/* Result Hero Banner + Compact Voice Readout */}
                <div className="ou-result-hero">
                  <div className="ou-hero-badges">
                    <span className="ou-hero-pill">STEP 3 · 解析結果＆家族バトン</span>
                    <span className="ou-hero-pill">
                      📂 分類：{analysis.category || "家族のお知らせ"}
                    </span>
                    <span className="ou-hero-pill">
                      💴 費用・集金：{analysis.cost}
                    </span>
                  </div>
                  <h2 className="ou-result-title">{analysis.title}</h2>
                  <p className="ou-result-summary">{analysis.summary}</p>

                  {/* Okusuri & Allergy Auto-Warning Badges */}
                  {analysis.medication_allergy_alerts &&
                    analysis.medication_allergy_alerts.length > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          background: "#fff1f2",
                          border: "1.5px solid #fda4af",
                          borderRadius: 13,
                          padding: "12px 15px",
                          color: "#881337",
                        }}
                        role="region"
                        aria-label="お薬・アレルギー・体調注意の自動警告バッジ"
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 800,
                            fontSize: "0.86rem",
                            color: "#be123c",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              background: "#e11d48",
                              color: "#ffffff",
                              padding: "2px 9px",
                              borderRadius: 999,
                              fontSize: "0.73rem",
                              fontWeight: 800,
                            }}
                          >
                            💊 お薬・アレルギー・体調注意メモ
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            lineHeight: 1.5,
                          }}
                        >
                          {analysis.medication_allergy_alerts.map((alertText, i) => (
                            <div key={i}>{alertText}</div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Voice Readout Bar */}
                  <div
                    className="ou-voice-dock"
                    role="region"
                    aria-label="音声読み上げコントロール"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span aria-hidden="true">{isSpeaking ? "🎙️" : "🔊"}</span>
                        <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#9a3412" }}>
                          音声で読み上げ
                        </span>
                        {isSpeaking && (
                          <span className="ou-speaking-badge">
                            読み上げ中：{activeSpeechLabel}
                          </span>
                        )}
                      </div>
                      <div className="ou-voice-controls">
                        <button
                          type="button"
                          className="ou-voice-btn-main"
                          onClick={isSpeaking ? stopSpeaking : handleSpeakFullSummary}
                        >
                          {isSpeaking ? "⏹ 停止" : "🔊 全体＆持ち物を読み上げ"}
                        </button>
                        <button
                          type="button"
                          className="ou-voice-btn-sub"
                          onClick={handleSpeakGrandparent}
                        >
                          👵 祖父母向け
                        </button>
                        <button
                          type="button"
                          className="ou-voice-btn-sub"
                          onClick={handleSpeakChildItems}
                        >
                          🧒 子ども向け
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRIMARY SECTION 1: Calendar Deep Links + .ics Bulk Download */}
                <div className="ou-section">
                  <div className="ou-section-header">
                    <div>
                      <h3 className="ou-section-title">
                        📅 抽出された予定・締切（Googleカレンダー登録 ＆ .ics一括出力）
                      </h3>
                      <p className="ou-section-sub">
                        「Googleカレンダーに追加」で予定作成画面が開きます。担当バッジを押すと担当者を切り替えられます。
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ou-btn-ics"
                      onClick={handleDownloadIcs}
                    >
                      📥 家族カレンダー用 .ics を一括ダウンロード（全{analysis.events.length}件）
                    </button>
                  </div>

                  <div className="ou-events-list">
                    {analysis.events.map((ev, idx) => {
                      const roleKey = normalizeRoleKey(ev.assignee);
                      const roleMeta =
                        FAMILY_ROLES.find((r) => r.key === roleKey) ?? FAMILY_ROLES[0];
                      const gcalUrl = buildGoogleCalendarUrl(
                        ev,
                        analysis.title,
                        analysis.items_to_bring,
                        idx
                      );

                      return (
                        <div
                          key={idx}
                          className={`ou-event-card ${ev.isDeadline ? "is-deadline" : ""}`}
                        >
                          <div className="ou-event-left">
                            <div className="ou-event-meta-row">
                              <span className="ou-event-date">🗓️ {ev.date}</span>
                              {ev.isDeadline && (
                                <span className="ou-deadline-badge">⏰ 提出・予約締切</span>
                              )}
                              {ev.location && (
                                <span className="ou-event-location">📍 {ev.location}</span>
                              )}
                            </div>
                            <div className="ou-event-title">{ev.title}</div>
                            <div className="ou-event-reason">💡 {ev.reason}</div>
                          </div>

                          <div className="ou-event-actions">
                            <button
                              type="button"
                              onClick={() => handleCycleEventRole(idx)}
                              className="ou-role-switch-btn"
                              style={{
                                background: roleMeta.bgSoft,
                                color: roleMeta.accent,
                                borderColor: roleMeta.borderSoft,
                              }}
                              title="クリックして担当メンバーを切り替え"
                            >
                              <span>{roleMeta.icon}</span>
                              <span>担当：{roleMeta.shortLabel}</span>
                              <span className="ou-switch-hint">🔁 切替</span>
                            </button>

                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ou-gcal-link"
                            >
                              📅 Googleカレンダーに追加 ↗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PRIMARY SECTION 2: Family Baton Checklist */}
                <div className="ou-section">
                  <div className="ou-section-header">
                    <div>
                      <h3 className="ou-section-title">
                        🔁 家族の持ち物・やることチェックリスト（自動保存）
                      </h3>
                      <p className="ou-section-sub">
                        持ち物や準備を <strong>ママ / パパ / 子ども / 祖父母</strong> に割り振ってチェックできます。
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ou-btn-ghost"
                      onClick={handleResetChecklist}
                    >
                      ↺ リセット
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="ou-progress-box">
                    <div className="ou-progress-top">
                      <span className="ou-progress-label">
                        🏃 準備の達成度：<strong>{completedCount}</strong> / {totalCount} 件完了
                      </span>
                      <span className="ou-progress-pct">{progressPercent}%</span>
                    </div>
                    <div
                      className="ou-progress-track"
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="ou-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Role Filter Tabs */}
                  <div className="ou-filter-tabs" role="tablist" aria-label="担当者で絞り込み">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={roleFilter === "ALL"}
                      className={`ou-filter-tab ${roleFilter === "ALL" ? "is-active" : ""}`}
                      onClick={() => setRoleFilter("ALL")}
                    >
                      すべて ({checklist.length})
                    </button>
                    {FAMILY_ROLES.map((role) => {
                      const count = checklist.filter((c) => c.assignee === role.key).length;
                      const active = roleFilter === role.key;
                      return (
                        <button
                          key={role.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          className={`ou-filter-tab ${active ? "is-active" : ""}`}
                          onClick={() => setRoleFilter(role.key)}
                        >
                          {role.icon} {role.shortLabel} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Checklist Items */}
                  <div className="ou-checklist-grid">
                    {filteredChecklist.map((item) => {
                      const roleMeta =
                        FAMILY_ROLES.find((r) => r.key === item.assignee) ??
                        FAMILY_ROLES[0];
                      return (
                        <div
                          key={item.id}
                          className={`ou-check-row ${item.checked ? "is-checked" : ""}`}
                        >
                          <label className="ou-check-label">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => handleToggleCheckItem(item.id)}
                              className="ou-checkbox"
                            />
                            <div className="ou-check-text-group">
                              <span className="ou-check-title">{item.label}</span>
                              <div className="ou-check-tags">
                                <span className="ou-cat-mini">{item.category}</span>
                                {item.note && (
                                  <span className="ou-note-mini">メモ：{item.note}</span>
                                )}
                              </div>
                            </div>
                          </label>

                          <div
                            className="ou-role-pills"
                            role="group"
                            aria-label={`${item.label}の担当者選択`}
                          >
                            {FAMILY_ROLES.map((r) => {
                              const selected = item.assignee === r.key;
                              return (
                                <button
                                  key={r.key}
                                  type="button"
                                  onClick={() => handleChangeItemRole(item.id, r.key)}
                                  className={`ou-mini-role-btn ${
                                    selected ? "is-selected" : ""
                                  }`}
                                  style={
                                    selected
                                      ? {
                                          background: roleMeta.bgSoft,
                                          color: roleMeta.accent,
                                          borderColor: roleMeta.accent,
                                        }
                                      : undefined
                                  }
                                  title={`${r.shortLabel}に割り当てる`}
                                >
                                  {r.icon} {r.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Item Form */}
                  <form onSubmit={handleAddChecklistItem} className="ou-add-item-form">
                    <input
                      type="text"
                      className="ou-add-item-input"
                      placeholder="+ 持ち物・やることを追加（例：替えの靴下、保険証）"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                    />
                    <select
                      aria-label="追加項目の担当者"
                      className="ou-add-item-select"
                      value={newItemRole}
                      onChange={(e) => setNewItemRole(e.target.value as FamilyRole)}
                    >
                      {FAMILY_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          担当：{r.icon} {r.shortLabel}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="ou-btn-secondary">
                      ＋ 追加
                    </button>
                  </form>
                </div>

                {/* SECONDARY EXTRAS: NEATLY TUCKED IN TABS */}
                <div className="ou-section">
                  <div
                    style={{
                      borderTop: "1px solid #efe5db",
                      paddingTop: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 800,
                        color: "#57534e",
                        marginBottom: 10,
                      }}
                    >
                      🗂️ 便利な共有・返信・世代別カード・保存メニュー（タブで切り替え）
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 14,
                      }}
                      role="tablist"
                      aria-label="追加機能タブ"
                    >
                      {(
                        [
                          {
                            id: "share",
                            label: "✉️ 返信クッション文 ＆ 💬 LINE共有",
                          },
                          {
                            id: "family",
                            label: "👵 祖父母3行まとめ ＆ 🧒 子どもカード",
                          },
                          {
                            id: "save",
                            label: "💾 PC・スマホ保存 (.md / .json) ＆ 📊 シート連携",
                          },
                        ] as const
                      ).map((tab) => {
                        const active = extraTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setExtraTab(tab.id)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: 10,
                              border: active
                                ? "1.5px solid #ea580c"
                                : "1px solid #e7ddd3",
                              background: active ? "#fff7ed" : "#ffffff",
                              color: active ? "#9a3412" : "#57534e",
                              fontSize: "0.83rem",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* TAB 1: Reply Cushion & LINE Share */}
                    {extraTab === "share" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            background: "#fffbeb",
                            border: "1.5px solid #fcd34d",
                            borderRadius: 13,
                            padding: "14px 16px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 10,
                              marginBottom: 10,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 800,
                                  color: "#92400e",
                                }}
                              >
                                ✉️ 園・学校・病院・窓口への欠席・返信クッション文
                              </div>
                              <div
                                style={{
                                  fontSize: "0.77rem",
                                  color: "#78716c",
                                  marginTop: 2,
                                }}
                              >
                                連絡帳アプリやメールへそのまま貼れる丁寧な返信文です
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {(
                                [
                                  { id: "confirm", label: "✅ 参加・確認返信" },
                                  { id: "absence", label: "🤒 欠席・体調不良連絡" },
                                  { id: "allergy", label: "💊 与薬・アレルギー相談" },
                                ] as const
                              ).map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => {
                                    setCushionMode(tab.id);
                                    setShowCushionPreview(true);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    border:
                                      cushionMode === tab.id
                                        ? "1.5px solid #d97706"
                                        : "1px solid #e7ddd3",
                                    background:
                                      cushionMode === tab.id ? "#fef3c7" : "#ffffff",
                                    color:
                                      cushionMode === tab.id ? "#92400e" : "#57534e",
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                >
                                  {tab.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={handleCopyCushionMessage}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: copiedCushion ? "#16a34a" : "#d97706",
                                  color: "#ffffff",
                                  fontSize: "0.77rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                {copiedCushion
                                  ? "✓ コピー済！"
                                  : "📋 クッション文をコピー"}
                              </button>
                            </div>
                          </div>
                          {showCushionPreview && (
                            <pre
                              style={{
                                margin: 0,
                                whiteSpace: "pre-wrap",
                                fontFamily: "inherit",
                                fontSize: "0.82rem",
                                background: "#ffffff",
                                padding: "10px 12px",
                                borderRadius: 9,
                                border: "1px solid #fde68a",
                                color: "#1c1917",
                                lineHeight: 1.55,
                              }}
                            >
                              {replyCushionText}
                            </pre>
                          )}
                        </div>

                        <div className="ou-line-box" style={{ marginTop: 0 }}>
                          <div className="ou-line-box-head">
                            <span>💬 LINE 家族グループ共有テキスト</span>
                            <button
                              type="button"
                              className="ou-btn-line-sm"
                              onClick={handleCopyLineSummary}
                            >
                              {copiedLine
                                ? "✓ コピーしました"
                                : "📋 LINE用まとめをコピー"}
                            </button>
                          </div>
                          <details open={showLinePreview}>
                            <summary
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "#166534",
                                cursor: "pointer",
                                marginBottom: 6,
                              }}
                            >
                              LINE共有テキストの中身を確認する
                            </summary>
                            <pre className="ou-line-pre">{lineGroupSummaryText}</pre>
                          </details>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Grandparent 3-Line Summary & Child Card */}
                    {extraTab === "family" && (
                      <div className="ou-generation-grid">
                        <div className="ou-grandma-card">
                          <div className="ou-grandma-header">
                            <h3 className="ou-grandma-title">
                              <span aria-hidden="true">👵</span>
                              祖父母向け やさしい大きな文字の3行要約
                            </h3>
                            <div className="ou-grandma-actions">
                              <button
                                type="button"
                                className="ou-btn-secondary"
                                onClick={handleSpeakGrandparent}
                              >
                                🔊 ゆっくり読み上げ
                              </button>
                              <button
                                type="button"
                                className="ou-btn-secondary"
                                onClick={handleCopyGrandmaSummary}
                              >
                                {copiedGrandma ? "✓ コピー済" : "📋 3行をコピー"}
                              </button>
                            </div>
                          </div>
                          <ol className="ou-grandma-list">
                            {analysis.grandparent_summary.map((line, idx) => (
                              <li key={idx} className="ou-grandma-item">
                                <span className="ou-grandma-num">{idx + 1}</span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="ou-child-card">
                          <div className="ou-child-header">
                            <h3 className="ou-child-title">
                              <span aria-hidden="true">🧒</span>
                              じぶんでできる！子どもバトン応援カード
                            </h3>
                            <button
                              type="button"
                              className="ou-btn-secondary"
                              onClick={handleSpeakChildItems}
                            >
                              🔊 子ども向け読み上げ
                            </button>
                          </div>
                          <p className="ou-child-message">
                            {analysis.child_message ||
                              "じぶんで もちものを そろえて、前日の夜にカバンの横へおいておこう！"}
                          </p>
                          <div className="ou-child-items">
                            {checklist
                              .filter((c) => c.assignee === "子ども")
                              .map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleToggleCheckItem(item.id)}
                                  className={`ou-child-chip ${
                                    item.checked ? "is-done" : ""
                                  }`}
                                >
                                  <span>
                                    {item.checked ? "🌟 できた！" : "⬜ じゅんび："}
                                  </span>
                                  <span>{item.label}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Local Save (.md / .json) & GAS Sync */}
                    {extraTab === "save" && (
                      <div className="ou-bottom-dock" style={{ margin: 0 }}>
                        <div className="ou-dock-left">
                          <span className="ou-dock-title">
                            💾 カレンダー・PC／スマホへのファイル保存 ＆ Google シート連携
                          </span>
                        </div>
                        <div className="ou-dock-actions">
                          <button
                            type="button"
                            className="ou-btn-ics"
                            onClick={handleDownloadIcs}
                          >
                            📥 カレンダー用 .ics をダウンロード
                          </button>
                          <button
                            type="button"
                            className="ou-btn-drive"
                            disabled={archivingDrive}
                            onClick={handleSaveToLocalDevice}
                          >
                            {archivingDrive
                              ? "💾 保存中..."
                              : "💾 PC・スマホに保存 (.md)"}
                          </button>
                          <button
                            type="button"
                            className="ou-btn-secondary"
                            onClick={handleDownloadLocalJson}
                          >
                            📦 JSON (.json) で保存
                          </button>
                          <button
                            type="button"
                            className="ou-btn-secondary"
                            disabled={syncingGas}
                            onClick={handleSyncToGas}
                          >
                            {syncingGas
                              ? "GAS 送信中..."
                              : "📊 Google シート連携 (GAS)"}
                          </button>
                        </div>

                        {driveArchiveInfo && (
                          <div className="ou-drive-status" role="status">
                            <div className="ou-drive-status-head">
                              <span>
                                💾{" "}
                                <strong>
                                  PC・スマホへのローカル保存完了 (
                                  {driveArchiveInfo.mode})
                                </strong>
                              </span>
                              <span className="ou-drive-folder">
                                📁 保存ファイル:{" "}
                                <code>{driveArchiveInfo.folder}</code>
                              </span>
                            </div>
                            {driveArchiveInfo.message && (
                              <p className="ou-drive-msg">
                                {driveArchiveInfo.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <style>{`
        .ou-shell {
          min-height: 100vh;
          background:
            radial-gradient(1200px 420px at 50% -110px, rgba(249, 115, 22, 0.14), transparent 70%),
            #fdf8f3;
          color: #1c1917;
          padding-bottom: 72px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN",
            "Hiragino Sans", Meiryo, sans-serif;
        }
        .ou-topnav {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #f1e4d8;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .ou-topnav-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 12px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ou-brand-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ou-brand-icon {
          font-size: 1.3rem;
        }
        .ou-brand {
          font-weight: 800;
          font-size: 1.18rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .ou-badge-ai {
          display: inline-flex;
          align-items: center;
          padding: 4px 11px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
          border: 1px solid #fdba74;
          color: #9a3412;
        }
        .ou-nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ou-nav-link {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e7ddd3;
          background: #fff;
          color: #57534e;
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
        }
        .ou-nav-link:hover {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .ou-container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 26px 18px 0;
        }
        .ou-hero-header {
          margin-bottom: 20px;
        }
        .ou-tag-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .ou-cat-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 999px;
          background: #ffedd5;
          color: #9a3412;
          font-size: 0.76rem;
          font-weight: 800;
        }
        .ou-model-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 11px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #e7ddd3;
          color: #57534e;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .ou-main-title {
          margin: 0;
          font-size: 1.82rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #1c1917;
          line-height: 1.28;
        }
        .ou-subtitle {
          margin: 8px 0 0;
          font-size: 0.95rem;
          color: #57534e;
          line-height: 1.6;
        }

        /* 4 Family Role Cards */
        .ou-family-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .ou-family-card {
          text-align: left;
          background: #fff;
          border: 2px solid #efe5db;
          border-radius: 14px;
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 10px rgba(120, 53, 15, 0.05);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ou-family-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(120, 53, 15, 0.1);
        }
        .ou-family-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ou-family-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .ou-family-titles {
          min-width: 0;
        }
        .ou-family-name {
          font-weight: 800;
          font-size: 0.92rem;
          color: #1c1917;
        }
        .ou-family-desc {
          font-size: 0.73rem;
          color: #78716c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ou-family-metrics {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .ou-metric-chip {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          border: 1px solid transparent;
        }
        .ou-metric-chip-neutral {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 700;
          background: #f5f5f4;
          color: #44403c;
        }

        /* Alerts */
        .ou-alert-error,
        .ou-alert-success {
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 18px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ou-alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        .ou-alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          font-weight: 600;
        }
        .ou-alert-close {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          color: inherit;
          opacity: 0.7;
        }

        /* STEP 1 Card & Presets */
        .ou-card {
          background: #fff;
          border: 1px solid #efe5db;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(120, 53, 15, 0.06);
        }
        .ou-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .ou-step-heading {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ou-step-badge {
          padding: 4px 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ea580c, #f59e0b);
          color: #fff;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
        }
        .ou-card-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 800;
        }
        .ou-card-hint {
          font-size: 0.78rem;
          color: #9a3412;
          background: #fff7ed;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #fed7aa;
          font-weight: 700;
        }

        .ou-preset-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }
        .ou-preset-btn {
          text-align: left;
          padding: 12px 13px;
          border-radius: 13px;
          border: 1.5px solid #e7ddd3;
          background: #fffaf5;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 5px;
          transition: all 0.15s;
        }
        .ou-preset-btn:hover {
          border-color: #fb923c;
          background: #fff7ed;
          transform: translateY(-1px);
        }
        .ou-preset-btn.is-active {
          border-color: #ea580c;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          box-shadow: 0 3px 12px rgba(234, 88, 12, 0.16);
        }
        .ou-preset-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .ou-preset-icon {
          font-size: 1.35rem;
        }
        .ou-preset-tag {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
          background: #fff;
          color: #9a3412;
          border: 1px solid #fdba74;
        }
        .ou-preset-label {
          font-weight: 800;
          font-size: 0.9rem;
          color: #1c1917;
        }
        .ou-preset-issuer {
          font-size: 0.73rem;
          color: #78716c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ou-input-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
          gap: 16px;
        }
        .ou-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ou-field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #44403c;
        }
        .ou-dropzone {
          min-height: 175px;
          border: 2px dashed #e7c9ae;
          border-radius: 13px;
          background: #fffaf5;
          cursor: pointer;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .ou-dropzone:hover {
          border-color: #f97316;
          background: #fff7ed;
        }
        .ou-dropzone.has-image {
          border-style: solid;
          border-color: #fb923c;
          background: #fff;
        }
        .ou-dropzone-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          color: #78716c;
        }
        .ou-dropzone-icon {
          font-size: 2rem;
        }
        .ou-dropzone-title {
          font-size: 0.86rem;
          font-weight: 700;
          color: #44403c;
        }
        .ou-dropzone-sub {
          font-size: 0.74rem;
        }
        .ou-preview-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .ou-preview-img {
          max-width: 100%;
          max-height: 175px;
          border-radius: 8px;
          border: 1px solid #e7ddd3;
          object-fit: contain;
        }
        .ou-preview-caption {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.76rem;
          font-weight: 700;
          color: #166534;
        }
        .ou-clear-img-btn {
          padding: 3px 9px;
          border-radius: 6px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          font-size: 0.73rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-camera-btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }
        .ou-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        .ou-textarea,
        .ou-text-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e7ddd3;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.88rem;
          color: #1c1917;
          background: #fff;
          line-height: 1.5;
        }
        .ou-textarea:focus,
        .ou-text-input:focus {
          outline: 2px solid rgba(234, 88, 12, 0.22);
          border-color: #ea580c;
        }
        .ou-analyze-bar {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #f3ece4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ou-analyze-note {
          font-size: 0.78rem;
          color: #78716c;
          max-width: 600px;
        }

        /* Buttons */
        .ou-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 22px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
          color: #fff;
          font-size: 0.94rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.28);
          transition: all 0.15s;
        }
        .ou-btn-primary:hover:not(:disabled) {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        .ou-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .ou-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 9px;
          border: 1px solid #e7ddd3;
          background: #fff;
          color: #44403c;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ou-btn-secondary:hover:not(:disabled) {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .ou-btn-warm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 9px;
          border: 1px solid #fdba74;
          background: #fff7ed;
          color: #c2410c;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-btn-warm:hover {
          background: #ffedd5;
        }
        .ou-btn-ics {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 15px;
          border-radius: 10px;
          border: 1.5px solid #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.84rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ou-btn-ics:hover {
          background: #dbeafe;
        }
        .ou-btn-line {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 15px;
          border-radius: 10px;
          border: none;
          background: #06c755;
          color: #fff;
          font-size: 0.84rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(6, 199, 85, 0.26);
          transition: all 0.15s;
        }
        .ou-btn-line:hover {
          filter: brightness(0.96);
        }
        .ou-btn-drive {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 15px;
          border-radius: 10px;
          border: 1.5px solid #0284c7;
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          color: #fff;
          font-size: 0.84rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(2, 132, 199, 0.25);
          transition: all 0.15s;
        }
        .ou-btn-drive:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .ou-btn-drive:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .ou-drive-status {
          width: 100%;
          margin-top: 8px;
          padding: 12px 14px;
          border-radius: 11px;
          background: #f0f9ff;
          border: 1.5px solid #7dd3fc;
          color: #0c4a6e;
          font-size: 0.84rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ou-drive-status-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ou-drive-folder {
          font-size: 0.8rem;
          background: #e0f2fe;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .ou-drive-msg {
          margin: 0;
          color: #0369a1;
          font-size: 0.8rem;
        }
        .ou-drive-link {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 7px;
          background: #0284c7;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 800;
          text-decoration: none;
        }
        .ou-drive-link:hover {
          background: #0369a1;
        }
        .ou-btn-ghost {
          padding: 7px 11px;
          border-radius: 9px;
          border: 1px solid #e7ddd3;
          background: transparent;
          color: #78716c;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ouSpin 0.8s linear infinite;
        }
        @keyframes ouSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Result Shell */
        .ou-result-shell {
          background: #fff;
          border: 1px solid #efe5db;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 28px rgba(120, 53, 15, 0.08);
          padding-bottom: 24px;
        }
        .ou-result-hero {
          background: linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%);
          color: #fff;
          padding: 24px 26px 22px;
        }
        .ou-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ou-hero-pill {
          padding: 4px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          font-size: 0.74rem;
          font-weight: 800;
        }
        .ou-result-title {
          margin: 10px 0 6px;
          font-size: 1.52rem;
          font-weight: 800;
          line-height: 1.3;
        }
        .ou-result-summary {
          margin: 0;
          font-size: 0.95rem;
          opacity: 0.95;
          line-height: 1.55;
        }

        /* Voice Readout Dock */
        .ou-voice-dock {
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.96);
          color: #1c1917;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }
        .ou-voice-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .ou-voice-icon {
          font-size: 1.55rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ou-voice-title {
          font-weight: 800;
          font-size: 0.92rem;
          color: #9a3412;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ou-speaking-badge {
          padding: 2px 9px;
          border-radius: 999px;
          background: #fee2e2;
          color: #dc2626;
          font-size: 0.74rem;
          font-weight: 800;
        }
        .ou-voice-sub {
          font-size: 0.82rem;
          color: #57534e;
          margin-top: 3px;
          line-height: 1.5;
        }
        .ou-voice-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .ou-voice-btn-main {
          padding: 8px 15px;
          border-radius: 9px;
          border: none;
          background: linear-gradient(135deg, #ea580c, #d97706);
          color: #fff;
          font-size: 0.83rem;
          font-weight: 800;
          cursor: pointer;
        }
        .ou-voice-btn-sub {
          padding: 7px 12px;
          border-radius: 9px;
          border: 1px solid #fdba74;
          background: #fff7ed;
          color: #9a3412;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-voice-btn-sub:hover {
          background: #ffedd5;
        }
        .ou-voice-speed {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #e7ddd3;
          font-size: 0.78rem;
          font-weight: 700;
          color: #44403c;
          background: #fff;
          width: auto;
        }

        /* Sections */
        .ou-section {
          margin: 26px 24px 0;
        }
        .ou-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }
        .ou-section-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 800;
          color: #1c1917;
        }
        .ou-section-sub {
          margin: 4px 0 0;
          font-size: 0.82rem;
          color: #78716c;
        }
        .ou-header-btns {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Events & Calendar Deep Links */
        .ou-events-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ou-event-card {
          border: 1.5px solid #efe5db;
          border-radius: 13px;
          padding: 13px 16px;
          background: #fffdfb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ou-event-card.is-deadline {
          border-left: 5px solid #ea580c;
          background: #fffaf5;
        }
        .ou-event-left {
          flex: 1;
          min-width: 240px;
        }
        .ou-event-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .ou-event-date {
          font-size: 0.8rem;
          font-weight: 800;
          color: #c2410c;
        }
        .ou-deadline-badge {
          padding: 2px 8px;
          border-radius: 999px;
          background: #fee2e2;
          color: #b91c1c;
          font-size: 0.7rem;
          font-weight: 800;
        }
        .ou-event-location {
          font-size: 0.76rem;
          color: #78716c;
        }
        .ou-event-title {
          font-size: 0.96rem;
          font-weight: 800;
          color: #1c1917;
        }
        .ou-event-reason {
          font-size: 0.8rem;
          color: #57534e;
          margin-top: 3px;
        }
        .ou-event-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ou-role-switch-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1.5px solid transparent;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
        }
        .ou-switch-hint {
          font-size: 0.7rem;
          opacity: 0.8;
          margin-left: 2px;
        }
        .ou-gcal-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 13px;
          border-radius: 9px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.8rem;
          font-weight: 800;
          text-decoration: none;
          transition: background 0.15s;
        }
        .ou-gcal-link:hover {
          background: #dbeafe;
        }

        /* Progress Bar & Checklist */
        .ou-progress-box {
          background: #fffaf5;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 12px 15px;
          margin-bottom: 14px;
        }
        .ou-progress-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.86rem;
          margin-bottom: 7px;
        }
        .ou-progress-pct {
          font-weight: 800;
          color: #c2410c;
        }
        .ou-progress-track {
          width: 100%;
          height: 10px;
          background: #efe5db;
          border-radius: 999px;
          overflow: hidden;
        }
        .ou-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ea580c, #22c55e);
          border-radius: 999px;
          transition: width 0.25s ease;
        }

        .ou-filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 12px;
        }
        .ou-filter-tab {
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid #e7ddd3;
          background: #fff;
          color: #57534e;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-filter-tab.is-active {
          background: #1c1917;
          border-color: #1c1917;
          color: #fff;
        }

        .ou-checklist-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ou-check-row {
          border: 1px solid #efe5db;
          border-radius: 11px;
          padding: 10px 13px;
          background: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .ou-check-row.is-checked {
          background: #f0fdf4;
          border-color: #86efac;
        }
        .ou-check-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          flex: 1;
          min-width: 220px;
        }
        .ou-checkbox {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #16a34a;
          cursor: pointer;
        }
        .ou-check-text-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ou-check-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #1c1917;
        }
        .ou-check-row.is-checked .ou-check-title {
          text-decoration: line-through;
          color: #166534;
        }
        .ou-check-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ou-cat-mini {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 999px;
          background: #f5f5f4;
          color: #57534e;
        }
        .ou-note-mini {
          font-size: 0.75rem;
          color: #78716c;
        }
        .ou-role-pills {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .ou-mini-role-btn {
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid #e7ddd3;
          background: #fafaf9;
          color: #78716c;
          font-size: 0.73rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ou-mini-role-btn.is-selected {
          font-weight: 800;
        }

        .ou-add-item-form {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ou-add-item-input {
          flex: 1;
          min-width: 220px;
          padding: 8px 12px;
          border-radius: 9px;
          border: 1px solid #e7ddd3;
          font-size: 0.85rem;
        }
        .ou-add-item-select {
          width: auto;
          padding: 8px 12px;
          border-radius: 9px;
          border: 1px solid #e7ddd3;
          font-size: 0.83rem;
          font-weight: 700;
        }

        /* LINE Preview */
        .ou-line-preview-wrap {
          margin-top: 12px;
        }
        .ou-line-toggle-btn {
          background: transparent;
          border: none;
          color: #166534;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          padding: 4px 0;
        }
        .ou-line-box {
          margin-top: 8px;
          background: #f0fdf4;
          border: 1.5px solid #86efac;
          border-radius: 12px;
          padding: 12px 14px;
        }
        .ou-line-box-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          font-weight: 800;
          color: #166534;
          margin-bottom: 8px;
        }
        .ou-btn-line-sm {
          padding: 4px 10px;
          border-radius: 7px;
          border: none;
          background: #06c755;
          color: #fff;
          font-size: 0.76rem;
          font-weight: 800;
          cursor: pointer;
        }
        .ou-line-pre {
          margin: 0;
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 0.82rem;
          background: #fff;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
          color: #1c1917;
          line-height: 1.55;
        }

        /* Grandparent & Child Cards */
        .ou-generation-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 16px;
        }
        .ou-grandma-card {
          background: linear-gradient(135deg, #fefce8 0%, #fffbeb 100%);
          border: 2px solid #facc15;
          border-radius: 16px;
          padding: 18px 20px;
        }
        .ou-grandma-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .ou-grandma-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 800;
          color: #713f12;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .ou-grandma-actions {
          display: flex;
          gap: 6px;
        }
        .ou-grandma-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ou-grandma-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 1.12rem;
          font-weight: 700;
          line-height: 1.55;
          background: rgba(255, 255, 255, 0.9);
          padding: 11px 13px;
          border-radius: 11px;
          border: 1px solid #fde68a;
        }
        .ou-grandma-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #16a34a;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .ou-child-card {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 2px solid #fb923c;
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ou-child-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ou-child-title {
          margin: 0;
          font-size: 1.04rem;
          font-weight: 800;
          color: #9a3412;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .ou-child-message {
          margin: 0;
          font-size: 0.96rem;
          font-weight: 700;
          color: #431407;
          background: rgba(255, 255, 255, 0.85);
          padding: 11px 13px;
          border-radius: 11px;
          line-height: 1.55;
        }
        .ou-child-items {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ou-child-chip {
          text-align: left;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1.5px solid #fdba74;
          background: #fff;
          font-size: 0.86rem;
          font-weight: 700;
          color: #1c1917;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ou-child-chip.is-done {
          background: #f0fdf4;
          border-color: #86efac;
          color: #166534;
        }

        /* Bottom Action Dock */
        .ou-bottom-dock {
          margin: 26px 24px 0;
          padding: 16px 20px;
          border-radius: 15px;
          background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
          border: 1.5px solid #fdba74;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ou-dock-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ou-dock-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: #9a3412;
        }
        .ou-dock-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 860px) {
          .ou-family-grid,
          .ou-preset-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ou-input-grid,
          .ou-generation-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 520px) {
          .ou-family-grid,
          .ou-preset-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
