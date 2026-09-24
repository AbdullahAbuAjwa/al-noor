export type DemoQuestion = {
  text: string;
  options: readonly [string, string, string, string];
  correctPosition: 1 | 2 | 3 | 4;
};

export type DemoQuiz = {
  code: string;
  title: string;
  teacherUsername: string;
  className: string;
  penaltyBps: number;
  published: boolean;
  questions: readonly DemoQuestion[];
};

export const demoQuizzes: readonly DemoQuiz[] = [
  {
    code: "math-10a-demo",
    title: "رياضيات الصف العاشر: حساب وجبر",
    teacherUsername: "teacher.math",
    className: "10A",
    penaltyBps: 2500,
    published: true,
    questions: [
      {
        text: "ما ناتج 7 + 5؟",
        options: ["10", "12", "13", "15"],
        correctPosition: 2,
      },
      {
        text: "ما ناتج 18 − 9؟",
        options: ["9", "8", "11", "7"],
        correctPosition: 1,
      },
      {
        text: "ما ناتج 6 × 4؟",
        options: ["20", "22", "26", "24"],
        correctPosition: 4,
      },
      {
        text: "ما ناتج 32 ÷ 8؟",
        options: ["2", "3", "4", "5"],
        correctPosition: 3,
      },
      {
        text: "إذا كان س + 3 = 11، فما قيمة س؟",
        options: ["7", "8", "9", "14"],
        correctPosition: 2,
      },
      {
        text: "ما مربع العدد 5؟",
        options: ["25", "10", "15", "20"],
        correctPosition: 1,
      },
      {
        text: "ما نصف العدد 42؟",
        options: ["20", "22", "24", "21"],
        correctPosition: 4,
      },
      {
        text: "ما ناتج 3² + 1؟",
        options: ["9", "10", "7", "12"],
        correctPosition: 2,
      },
      {
        text: "ما محيط مربع طول ضلعه 4؟",
        options: ["8", "12", "16", "20"],
        correctPosition: 3,
      },
      {
        text: "ما ناتج 20% من 50؟",
        options: ["10", "5", "15", "20"],
        correctPosition: 1,
      },
      {
        text: "إذا كان 2س = 14، فما قيمة س؟",
        options: ["6", "8", "12", "7"],
        correctPosition: 4,
      },
      {
        text: "ما ناتج 9 × 3؟",
        options: ["18", "27", "24", "30"],
        correctPosition: 2,
      },
      {
        text: "ما المتوسط الحسابي للعددين 6 و 10؟",
        options: ["7", "9", "8", "16"],
        correctPosition: 3,
      },
      {
        text: "ما ناتج 100 − 35؟",
        options: ["65", "55", "75", "85"],
        correctPosition: 1,
      },
      {
        text: "ما ناتج 2 × (3 + 4)؟",
        options: ["9", "10", "12", "14"],
        correctPosition: 4,
      },
    ],
  },
  {
    code: "science-10b-demo",
    title: "علوم الصف العاشر: مفاهيم أساسية",
    teacherUsername: "teacher.science",
    className: "10B",
    penaltyBps: 0,
    published: true,
    questions: [
      {
        text: "ما الكوكب الأقرب إلى الشمس؟",
        options: ["الزهرة", "المريخ", "عطارد", "الأرض"],
        correctPosition: 3,
      },
      {
        text: "ما الغاز الأكثر وجودًا في الغلاف الجوي؟",
        options: ["النيتروجين", "الأكسجين", "الهيدروجين", "ثاني أكسيد الكربون"],
        correctPosition: 1,
      },
      {
        text: "ما الوحدة الأساسية لقياس القوة؟",
        options: ["الجول", "الواط", "المتر", "النيوتن"],
        correctPosition: 4,
      },
      {
        text: "ما العضو الذي يضخ الدم في الجسم؟",
        options: ["الكبد", "القلب", "الرئة", "الكلى"],
        correctPosition: 2,
      },
      {
        text: "ما الحالة التي يتحول فيها الماء إلى بخار؟",
        options: ["التجمد", "التكاثف", "التبخر", "الانصهار"],
        correctPosition: 3,
      },
      {
        text: "ما مصدر الطاقة الرئيسي للأرض؟",
        options: ["الشمس", "القمر", "الرياح", "البراكين"],
        correctPosition: 1,
      },
      {
        text: "ما الجسيم ذو الشحنة السالبة في الذرة؟",
        options: ["البروتون", "النيوترون", "النواة", "الإلكترون"],
        correctPosition: 4,
      },
      {
        text: "ما العملية التي تصنع بها النباتات غذاءها؟",
        options: ["التنفس", "البناء الضوئي", "التبخر", "الهضم"],
        correctPosition: 2,
      },
      {
        text: "ما الوحدة الأساسية لقياس شدة التيار الكهربائي؟",
        options: ["الفولت", "الأوم", "الأمبير", "الواط"],
        correctPosition: 3,
      },
      {
        text: "ما الصيغة الكيميائية للماء؟",
        options: ["H₂O", "CO₂", "O₂", "NaCl"],
        correctPosition: 1,
      },
      {
        text: "أي جزء من النبات يمتص الماء غالبًا؟",
        options: ["الأوراق", "الأزهار", "الساق", "الجذور"],
        correctPosition: 4,
      },
      {
        text: "ما القوة التي تجذب الأجسام نحو الأرض؟",
        options: ["الاحتكاك", "الجاذبية", "المغناطيسية", "الطفو"],
        correctPosition: 2,
      },
      {
        text: "ما الجهاز المسؤول عن تبادل الأكسجين وثاني أكسيد الكربون؟",
        options: ["الهضمي", "العصبي", "التنفسي", "الدوري"],
        correctPosition: 3,
      },
      {
        text: "ما ناتج انقسام الخلية الذي ينشئ خليتين متماثلتين؟",
        options: ["الانقسام المتساوي", "الإخصاب", "التلقيح", "التبخر"],
        correctPosition: 1,
      },
      {
        text: "ما الخاصية التي تقاوم بها المادة تغير حالتها الحركية؟",
        options: ["الكثافة", "المرونة", "الشفافية", "القصور الذاتي"],
        correctPosition: 4,
      },
    ],
  },
  {
    code: "english-11a-demo",
    title: "English 11A: Grammar and Vocabulary",
    teacherUsername: "teacher.english",
    className: "11A",
    penaltyBps: 0,
    published: true,
    questions: [
      {
        text: "Choose the past tense of 'go'.",
        options: ["goed", "went", "gone", "going"],
        correctPosition: 2,
      },
      {
        text: "Choose the plural of 'child'.",
        options: ["childs", "childes", "childrens", "children"],
        correctPosition: 4,
      },
      {
        text: "Complete: She ___ to school every day.",
        options: ["goes", "go", "going", "gone"],
        correctPosition: 1,
      },
      {
        text: "Choose the opposite of 'early'.",
        options: ["soon", "fast", "late", "first"],
        correctPosition: 3,
      },
      {
        text: "Complete: They ___ playing now.",
        options: ["is", "are", "am", "be"],
        correctPosition: 2,
      },
      {
        text: "Choose the synonym of 'happy'.",
        options: ["glad", "sad", "angry", "tired"],
        correctPosition: 1,
      },
      {
        text: "Complete: I have ___ apple.",
        options: ["a", "the", "some", "an"],
        correctPosition: 4,
      },
      {
        text: "Choose the comparative form of 'good'.",
        options: ["gooder", "best", "better", "more good"],
        correctPosition: 3,
      },
      {
        text: "Complete: We ___ our homework yesterday.",
        options: ["do", "did", "does", "doing"],
        correctPosition: 2,
      },
      {
        text: "Which word is a noun?",
        options: ["teacher", "quickly", "beautiful", "run"],
        correctPosition: 1,
      },
      {
        text: "Complete: If it rains, we ___ stay inside.",
        options: ["has", "was", "were", "will"],
        correctPosition: 4,
      },
      {
        text: "Choose the opposite of 'difficult'.",
        options: ["hard", "heavy", "easy", "complex"],
        correctPosition: 3,
      },
      {
        text: "Complete: The book is ___ the table.",
        options: ["on", "at", "with", "from"],
        correctPosition: 1,
      },
      {
        text: "Choose the past tense of 'write'.",
        options: ["writed", "wrote", "written", "writing"],
        correctPosition: 2,
      },
      {
        text: "Complete: There ___ two pencils in my bag.",
        options: ["is", "am", "be", "are"],
        correctPosition: 4,
      },
    ],
  },
  {
    code: "history-10a-draft",
    title: "مسودة: مراجعة تاريخية قصيرة",
    teacherUsername: "teacher.history",
    className: "10A",
    penaltyBps: 0,
    published: false,
    questions: [
      {
        text: "كم قرنًا في الألفية الواحدة؟",
        options: ["5", "10", "20", "100"],
        correctPosition: 2,
      },
      {
        text: "ما اسم دراسة أحداث الماضي؟",
        options: ["الجغرافيا", "الكيمياء", "التاريخ", "الفيزياء"],
        correctPosition: 3,
      },
    ],
  },
];
