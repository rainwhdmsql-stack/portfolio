// ============================================================
// CURIO Portfolio Final Script
// 구현 내용:
// 1. 사이트 최초 진입 시 CURIO 부팅 화면과 진입 확인 오버레이 제어
// 2. 진입 오버레이 배경에 Shape Wave 캔버스 모션 적용
// 3. [Enter Portfolio] 클릭 시 Wave 확산 후 Hero 진입
// 4. Hero 타이핑 애니메이션 구현
// 5. 섹션 진입 및 사용자 행동에 반응하는 CURIO 자막 출력
// 6. Project Archive 필터 기능(All / Design / Coding / Team Project)
// 7. 필터 선택 시 CURIO가 현재 프로젝트 유형을 요약해서 안내
// 8. 프로젝트 카드 렌더링 및 호버 목업 확대 효과는 CSS로 처리
// 9. 프로젝트 카드 클릭 시 브라우저 창 형태의 80~90% 모달 오픈
// 10. 모달 우측 CURIO ANALYSIS 카드 내용 자체를 실시간 요약 브리핑처럼 타이핑
// 11. 하단 CURIO Quick Guide: 질문형 선택지로 섹션 이동 지원
// 12. 네비게이션 active 상태 및 reveal 애니메이션 처리
// ============================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const boot = $('#boot');
const entry = $('#entry');
const enterBtn = $('#enterBtn');
const caption = $('#caption');
const captionText = $('#captionText');
const floatingCurio = $('#floatingCurio');
const curioQuickGuide = $('#curioQuickGuide');
const quickGuideClose = $('#quickGuideClose');
const typeText = $('#typeText');
const projectGrid = $('#projectGrid');
const projectCount = $('#projectCount');
const projectPagination = $('#projectPagination');
const prevProjectPage = $('#prevProjectPage');
const nextProjectPage = $('#nextProjectPage');
const projectPageStatus = $('#projectPageStatus');
const projectModal = $('#projectModal');
const activityList = $('#activityList'); // 이전 Activity Log 호환용: 현재 UI는 CURIO GUIDE 정적 안내 패널 사용
const curioSummary = $('.curio-summary');
const modalCaption = $('#modalCaption');
const modalCaptionText = $('#modalCaptionText');
const modalSummaryText = $('#modalSummary');
const projectWindowDock = $('#projectWindowDock');
const dockProjectTitle = $('#dockProjectTitle');
const modalWindow = $('.browser-window');
const reportProgress = $('#reportProgress');
const reportProgressMode = $('#reportProgressMode');
const reportProgressStatus = $('#reportProgressStatus');
const reportCompleteBadge = $('#reportCompleteBadge');
const reportProgressItems = $$('.report-progress-list li');

const initialMessage = '조현정 디자이너의 포트폴리오 자료를 살펴봤습니다.\nCURIO가 읽기 좋은 기록으로 정리합니다.';

let captionTimer;
let captionTyping;
let modalCaptionTimer;
let modalCaptionTyping;
let modalSummaryTyping;
let sequenceTimer;
let typeTimer;
let lastSection = '';
let lastBriefingAt = 0;
let hasEntered = false;
let currentFilter = 'all';
let currentProjectPage = 1;
const PROJECTS_PER_PAGE = 6;
const SECTION_ORDER = ['hero', 'about', 'projects', 'contact'];
const REPORT_STEPS = ['profile', 'experience', 'archive', 'summary'];
const SECTION_STEPS = {
  about: ['profile', 'experience'],
  projects: ['archive'],
  contact: ['summary'],
};
const STEP_STATUS = {
  profile: '디자이너 기록 정리가 끝났습니다.',
  experience: '경험 해석이 끝났습니다.',
  archive: '프로젝트 보관함 정리가 끝났습니다.',
  summary: '마무리 정리가 끝났습니다.',
};
let visitedSections = new Set();
let reportStepState = REPORT_STEPS.reduce((state, step) => ({ ...state, [step]: 'pending' }), {});
let reportStepTimers = [];
let activeProjectId = null;
let isDraggingWindow = false;
let dragOffset = { x: 0, y: 0 };


// ------------------------------------------------------------
// CURIO Quick Guide 열기/닫기
// - 실제 API 챗봇 대신, 포트폴리오 탐색에 필요한 질문형 선택지를 제공
// - 상단 메뉴명과 중복되지 않도록 사용자의 궁금증 문장으로 구성
// ------------------------------------------------------------
function openQuickGuide() {
  if (!curioQuickGuide) return;
  curioQuickGuide.classList.add('open');
  curioQuickGuide.setAttribute('aria-hidden', 'false');
  floatingCurio.setAttribute('aria-expanded', 'true');
}

function closeQuickGuide() {
  if (!curioQuickGuide) return;
  curioQuickGuide.classList.remove('open');
  curioQuickGuide.setAttribute('aria-hidden', 'true');
  floatingCurio.setAttribute('aria-expanded', 'false');
}

function toggleQuickGuide() {
  if (!curioQuickGuide) return;
  curioQuickGuide.classList.contains('open') ? closeQuickGuide() : openQuickGuide();
}

function moveToSectionById(sectionId, message) {
  const target = $(`#${sectionId}`);
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  navLinks.forEach((nav) => {
    nav.classList.toggle('active', nav.getAttribute('href') === `#${sectionId}`);
  });

  closeQuickGuide();
  if (hasEntered) {
    lastSection = sectionId;
    window.setTimeout(() => runSectionBriefing(sectionId, message || target.dataset.ai || ''), 320);
  }
}

// ------------------------------------------------------------
// CURIO Guide 보조 함수
// - 이전 Activity Log 버전과의 호환을 위해 남겨둠
// - 현재 최종 UI에서는 우측 패널을 정적 CURIO GUIDE로 사용
// ------------------------------------------------------------
function updateActivityLog(items = []) {
  if (!activityList || !items.length) return;

  activityList.innerHTML = items.map((item, index) => {
    const state = item.state || (index === items.length - 1 ? 'active' : 'done');
    return `<li class="${state}"><i></i><span>${item.text}</span></li>`;
  }).join('');
}

function sectionActivity(sectionId) {
  const logs = {
    hero: [
      { text: 'Designer Profile Loaded', state: 'done' },
      { text: 'Project Archive Synced', state: 'done' },
      { text: 'Generating Briefing...', state: 'active' },
      { text: 'Waiting For User Input', state: '' },
    ],
    about: [
      { text: 'Profile Analysis Started', state: 'done' },
      { text: 'Primary Traits Identified', state: 'done' },
      { text: 'Tools Data Attached', state: 'done' },
      { text: 'About Briefing Ready', state: 'active' },
    ],
    projects: [
      { text: 'Archive Access Granted', state: 'done' },
      { text: 'Project Records Found', state: 'done' },
      { text: 'Filter System Online', state: 'done' },
      { text: 'Waiting For Archive Input', state: 'active' },
    ],
    contact: [
      { text: 'Contact Channel Found', state: 'done' },
      { text: 'Collaboration Access Ready', state: 'done' },
      { text: 'Waiting For User Request', state: 'active' },
      { text: 'CURIO Standby', state: '' },
    ],
  };
  updateActivityLog(logs[sectionId] || logs.hero);
}

// ------------------------------------------------------------
// CURIO Report Status
// - 스크롤 퍼센트가 아니라 CURIO가 한 번 완료한 분석 상태를 유지하는 Queue UI
// - 사용자가 이전 섹션으로 돌아가도 complete 상태는 되돌리지 않음
// ------------------------------------------------------------
function clearReportStepTimers() {
  reportStepTimers.forEach((timer) => clearTimeout(timer));
  reportStepTimers = [];
}

function renderReportStatus(activeStep = null) {
  let completedCount = 0;

  reportProgressItems.forEach((item) => {
    const step = item.dataset.progressStep;
    const state = reportStepState[step] || 'pending';
    item.dataset.state = state;
    item.classList.toggle('active', step === activeStep);
    if (state === 'complete') completedCount += 1;
  });

  const isComplete = completedCount === REPORT_STEPS.length;
  if (reportProgress) reportProgress.classList.toggle('is-complete', isComplete);
  if (reportProgressMode) reportProgressMode.textContent = isComplete ? '정리 완료' : '진행 상태';
  if (reportCompleteBadge) reportCompleteBadge.setAttribute('aria-hidden', isComplete ? 'false' : 'true');
}

function setReportStepState(step, state) {
  if (!REPORT_STEPS.includes(step)) return;

  const prevState = reportStepState[step];
  if (prevState === 'complete' && state !== 'complete') return;

  reportStepState[step] = state;
  renderReportStatus(state === 'analyzing' ? step : null);

  if (reportProgressStatus) {
    if (state === 'analyzing') reportProgressStatus.textContent = `${getStepLabel(step)}을 살펴보고 있습니다.`;
    if (state === 'complete') reportProgressStatus.textContent = STEP_STATUS[step] || '정리가 끝났습니다.';
  }

  if (state === 'analyzing') {
    floatingCurio?.classList.add('is-analyzing');
    floatingCurio?.classList.remove('is-complete');
  }

  if (state === 'complete') {
    const item = Array.from(reportProgressItems).find((node) => node.dataset.progressStep === step);
    item?.classList.add('just-completed');
    window.setTimeout(() => item?.classList.remove('just-completed'), 420);

    floatingCurio?.classList.remove('is-analyzing');
    floatingCurio?.classList.add('is-complete');
    window.setTimeout(() => floatingCurio?.classList.remove('is-complete'), 520);
  }
}

function getStepLabel(step) {
  const labels = {
    profile: '디자이너 기록',
    experience: '경험 해석',
    archive: '프로젝트 보관함',
    summary: '마무리 정리',
  };
  return labels[step] || 'Report';
}

function updateReportProgress(sectionId) {
  if (!SECTION_ORDER.includes(sectionId)) return;

  document.body.classList.toggle('show-report-status', sectionId !== 'hero');

  visitedSections.add(sectionId);

  sections.forEach((section) => {
    section.classList.toggle('section-active', section.id === sectionId);
    if (visitedSections.has(section.id)) section.classList.add('report-complete');
  });

  const steps = SECTION_STEPS[sectionId] || [];
  if (!steps.length) {
    renderReportStatus();
    if (reportProgressStatus && sectionId === 'hero') reportProgressStatus.textContent = 'CURIO가 자료를 확인하고 있습니다.';
    return;
  }

  const pendingSteps = steps.filter((step) => reportStepState[step] !== 'complete');
  if (!pendingSteps.length) {
    renderReportStatus();
    if (reportProgressStatus) reportProgressStatus.textContent = `${getStepLabel(steps[steps.length - 1])}은 이미 정리되었습니다.`;
    return;
  }

  clearReportStepTimers();
  pendingSteps.forEach((step, index) => {
    const startDelay = index * 1850;
    const completeDelay = startDelay + 1280;

    reportStepTimers.push(window.setTimeout(() => {
      setReportStepState(step, 'analyzing');
    }, startDelay));

    reportStepTimers.push(window.setTimeout(() => {
      setReportStepState(step, 'complete');
      
    }, completeDelay));
  });
}

function getSectionBriefing(sectionId, fallback = '') {
  const briefings = {
    hero: ['포트폴리오 자료를 펼쳤습니다.', '조현정 디자이너의 경험과 작업을 CURIO의 기록 방식으로 살펴봅니다.'],
    about: ['디자이너 기록을 펼쳤습니다.', '마케팅 경험이 UX 관점으로 이어진 흐름을 중심으로 살펴보세요.'],
    projects: ['프로젝트 보관함을 열었습니다.', '결과물보다 문제를 발견하고 해결한 과정을 먼저 확인해 보세요.'],
    contact: ['마무리 기록을 펼쳤습니다.', '자료 정리가 끝났습니다. 함께할 수 있는 연결 지점을 확인해 주세요.'],
  };
  return briefings[sectionId] || [fallback || '자료를 정리했습니다.'];
}

function runSectionBriefing(sectionId, message) {
  if (!hasEntered) return;

  updateReportProgress(sectionId);
  sectionActivity(sectionId);

  const now = Date.now();
  const messages = getSectionBriefing(sectionId, message);
  const briefingText = messages.filter(Boolean).join('\n');

  // 섹션을 빠르게 오갈 때 메모 박스가 다다닥 뜨지 않도록 최소 간격을 둔다.
  if (now - lastBriefingAt < 3800 && sectionId !== 'hero') return;

  lastBriefingAt = now;
  hideCaption();
  speak(briefingText, { hold: 4200 });
}

// ------------------------------------------------------------
// CURIO 실시간 브리핑 자막 시퀀스
// - 프로젝트 상세 모달처럼 여러 문장을 순서대로 읽어주는 상황에 사용
// ------------------------------------------------------------
function speakSequence(messages = [], options = {}) {
  if (!hasEntered || !messages.length) return;

  clearTimeout(sequenceTimer);
  let index = 0;
  const gap = options.gap ?? 900;
  const hold = options.hold ?? 2400;
  const target = options.target || 'global';

  if (target === 'modal') hideCaption();

  const play = () => {
    speak(messages[index], { hold, target });
    const duration = messages[index].length * 24 + hold + gap + 180;
    index += 1;
    if (index < messages.length) {
      sequenceTimer = setTimeout(play, duration);
    }
  };

  play();
}

// ------------------------------------------------------------
// 프로젝트 데이터
// - 실제 포트폴리오 내용으로 교체하기 쉬운 구조
// - categories에 design/coding/team을 복수로 넣으면 여러 필터에 노출됨
// ------------------------------------------------------------
const projects = [
  {
    id: 'adobe',
    title: 'Adobe Website Redesign',
    type: 'Web Redesign',
    categories: ['design', 'team'],
    year: '2025',
    status: 'Completed',
    roleType: 'UX/UI Design · Team',
    short: '제품 중심 구조를 목적 중심 탐색 구조로 재설계했습니다.',
    issue: '처음 방문한 사용자가 어떤 툴을 선택해야 하는지 판단하기 어려웠습니다.',
    solution: '제품 중심 구조를 목적 중심 탐색 구조로 재설계했습니다.',
    role: '팀 프로젝트에서 서브페이지 와이어프레임과 UI 디자인을 담당했습니다.',
    summary: '핵심 문제는 사용자가 목적보다 제품명을 먼저 이해해야 했다는 점입니다.\nCURIO는 이 프로젝트를 목적 중심 탐색 구조로 전환한 리디자인 사례로 분류합니다.\n역할은 서브페이지의 와이어프레임과 UI 설계에 집중되어 있습니다.',
  },
  {
    id: 'pickmeal',
    title: 'Pick Meal App',
    type: 'App UX/UI',
    categories: ['design'],
    year: '2025',
    status: 'Concept',
    roleType: 'UX/UI Design',
    short: '상황 기반 추천과 지도 중심 탐색 경험을 설계했습니다.',
    issue: '사용자는 상황에 맞는 식당을 빠르게 고르기 어렵습니다.',
    solution: '상황 기반 추천과 지도 중심 탐색 경험을 설계했습니다.',
    role: 'IA, 주요 화면 흐름, 추천 구조를 기획했습니다.',
    summary: '이 프로젝트는 음식 선택 과정의 피로도를 줄이는 데 초점이 있습니다.\n상황 카테고리와 지도 탐색을 연결해 사용자가 빠르게 선택하도록 설계했습니다.\nCURIO는 탐색 흐름과 추천 구조 설계가 핵심이라고 판단합니다.',
  },
  {
    id: 'portfolio',
    title: 'AI Portfolio Website',
    type: 'Portfolio',
    categories: ['design', 'coding'],
    year: '2026',
    status: 'In Progress',
    roleType: 'Design · Front-end',
    short: 'AI Curator가 섹션별 핵심을 짧게 안내하는 포트폴리오입니다.',
    issue: '일반 포트폴리오는 사용자가 직접 정보를 찾아야 합니다.',
    solution: 'AI Curator가 섹션별 핵심을 짧게 안내하는 구조를 설계했습니다.',
    role: '컨셉, 인터랙션, UI 시스템과 프론트엔드 구조를 구성했습니다.',
    summary: '이 포트폴리오는 단순한 결과물 나열보다 탐색 경험 자체를 설계한 사례입니다.\nCURIO가 사용자의 행동에 반응해 섹션과 프로젝트를 큐레이션합니다.\n디자인과 구현이 함께 반영된 인터랙티브 프로젝트입니다.',
  },
  {
    id: 'chimac',
    title: 'Daegu Chimac Festival',
    type: 'Landing Page',
    categories: ['design'],
    year: '2026',
    status: 'Concept',
    roleType: 'Visual UI',
    short: '행사 정보와 이벤트를 카드형 섹션으로 정리했습니다.',
    issue: '행사 정보와 이벤트를 한눈에 인지하기 어렵습니다.',
    solution: '주요 콘텐츠와 이벤트를 카드형 섹션으로 정리했습니다.',
    role: '랜딩페이지 섹션 구성과 비주얼 방향을 제안했습니다.',
    summary: '행사 랜딩페이지에서 중요한 것은 빠른 정보 인지입니다.\n이 프로젝트는 이벤트, 지도, 주요 콘텐츠를 명확한 섹션 단위로 정리합니다.\nCURIO는 정보 구조와 비주얼 집중도가 핵심이라고 요약합니다.',
  },
  {
    id: 'weather',
    title: 'Weather API Dashboard',
    type: 'JavaScript API',
    categories: ['coding'],
    year: '2025',
    status: 'Practice',
    roleType: 'Front-end',
    short: '날씨 API 데이터를 받아 화면에 출력하는 인터랙션을 구현했습니다.',
    issue: '외부 API 데이터를 가져와 사용자가 이해할 수 있는 UI로 보여줘야 했습니다.',
    solution: '도시, 온도, 날씨 아이콘 데이터를 받아 카드 형태로 출력했습니다.',
    role: 'JavaScript fetch, DOM 출력, 에러 처리를 실습했습니다.',
    summary: '이 프로젝트는 디자인보다 데이터 연결과 화면 출력 흐름을 확인하는 코딩 실습입니다.\nCURIO는 API 호출, DOM 조작, 예외 처리 경험을 확인했습니다.\n프론트엔드 구현 이해도를 보여주는 기록입니다.',
  },
  {
    id: 'detail',
    title: 'Detail Page Parameter',
    type: 'JavaScript Detail Page',
    categories: ['coding'],
    year: '2025',
    status: 'Practice',
    roleType: 'Front-end',
    short: 'URL 파라미터를 활용해 상세 페이지 데이터를 출력했습니다.',
    issue: '리스트에서 선택한 항목을 상세 페이지에서 정확히 불러와야 했습니다.',
    solution: 'URLSearchParams와 find 메서드로 해당 데이터를 매칭했습니다.',
    role: '데이터 탐색, 조건 처리, 상세 UI 출력을 구현했습니다.',
    summary: '이 기록은 페이지 간 데이터 연결 방식을 이해하기 위한 구현 사례입니다.\nURL 파라미터와 데이터 매칭을 통해 상세 페이지 흐름을 완성했습니다.\nCURIO는 기초 프론트엔드 로직 학습 프로젝트로 분류합니다.',
  },
  {
    id: 'korean',
    title: 'Education Card Design',
    type: 'Content Design',
    categories: ['design'],
    year: '2025',
    status: 'Live Content',
    roleType: 'Graphic · Content UI',
    short: '교육 내용을 카드형 시각 자료로 정리했습니다.',
    issue: '복잡한 국어 개념을 학생이 쉽게 이해할 수 있게 정리해야 했습니다.',
    solution: '개념을 분류하고 카드형 레이아웃과 아이콘으로 시각화했습니다.',
    role: '카드 구성, 문구 정리, 시각 요소 방향을 설계했습니다.',
    summary: '이 프로젝트는 UX/UI와 그래픽 콘텐츠 사이의 정보 정리 능력을 보여줍니다.\n복잡한 학습 내용을 작은 카드 단위로 나누고 시각적으로 이해하기 쉽게 구성했습니다.\nCURIO는 정보 구조화 역량이 드러나는 디자인 기록으로 요약합니다.',
  },
  {
    id: 'team',
    title: 'Team Project Management',
    type: 'Team Workflow',
    categories: ['team'],
    year: '2025',
    status: 'Completed',
    roleType: 'Team Lead',
    short: '팀 프로젝트에서 역할 분배와 회의 흐름을 정리했습니다.',
    issue: '팀원별 작업 범위와 일정, 디자인 방향을 조율해야 했습니다.',
    solution: '회의록, 역할 분배, 와이어프레임 총괄로 프로젝트 흐름을 정리했습니다.',
    role: '팀 리드로서 의견 조율과 작업 방향 정리를 맡았습니다.',
    summary: '이 기록은 화면 디자인 외에도 협업 과정에서의 구조화 능력을 보여줍니다.\n팀원 역할을 나누고 회의 내용을 정리하며 프로젝트 흐름을 안정화했습니다.\nCURIO는 협업과 조율 역량을 확인할 수 있는 기록으로 분류합니다.',
  },  {
    id: 'arbor',
    title: 'ARBOR Interior Event',
    type: 'Event Banner',
    categories: ['design'],
    year: '2026',
    status: 'Concept',
    roleType: 'Visual UI · Event Design',
    short: '우드 인테리어 브랜드의 이벤트 배너와 프로모션 무드를 설계했습니다.',
    issue: '할인 정보와 브랜드 무드를 동시에 전달해야 했습니다.',
    solution: '간결한 카피, 제품 이미지, 우드 톤 비주얼을 중심으로 구매 유도 배너를 구성했습니다.',
    role: '이벤트명, 배너 구조, 인플루언서 추천 제품 카드 방향을 기획했습니다.',
    summary: 'ARBOR 프로젝트는 인테리어 브랜드의 감성과 구매 유도 정보를 함께 정리한 디자인 기록입니다.\n할인율, 추천 제품, 브랜드 무드를 한 화면에서 인지할 수 있도록 단순한 위계를 우선했습니다.\nCURIO는 이 프로젝트를 프로모션 비주얼과 정보 구조화 사례로 분류합니다.',
  },
];

// ------------------------------------------------------------
// AI 자막 숨김 처리
// ------------------------------------------------------------
function hideCaption() {
  clearTimeout(captionTimer);
  clearInterval(captionTyping);
  caption.classList.remove('show');
  floatingCurio.classList.remove('speaking');
}

function hideModalCaption() {
  clearTimeout(modalCaptionTimer);
  clearInterval(modalCaptionTyping);
  if (modalCaption) modalCaption.classList.remove('show');
  if (modalCaptionText) modalCaptionText.textContent = '';
  floatingCurio.classList.remove('speaking');
}

// ------------------------------------------------------------
// 프로젝트 상세창 내부 CURIO 요약 브리핑 타이핑
// - 별도의 자막을 새로 띄우지 않고, 우측 요약 브리핑 카드 내용 자체가
//   실시간으로 생성되는 것처럼 보이게 한다.
// ------------------------------------------------------------
function typeModalSummary(text) {
  if (!modalSummaryText) return;

  clearInterval(modalSummaryTyping);
  modalSummaryText.textContent = '';
  floatingCurio.classList.add('speaking');

  if (curioSummary) curioSummary.classList.add('is-briefing');

  let index = 0;
  modalSummaryTyping = setInterval(() => {
    modalSummaryText.textContent = text.slice(0, ++index);

    if (index >= text.length) {
      clearInterval(modalSummaryTyping);
      floatingCurio.classList.remove('speaking');

      setTimeout(() => {
        if (curioSummary) curioSummary.classList.remove('is-briefing');
      }, 6500);
    }
  }, 22);
}

// ------------------------------------------------------------
// AI 자막 출력 함수
// - 사용자가 사이트에 진입한 뒤에만 실행
// - 문장 완성 후 기본 6.8초 유지
// ------------------------------------------------------------
function speak(text, options = {}) {
  if (!hasEntered) return;

  const hold = options.hold ?? 6800;
  const targetCaption = options.target === 'modal' ? modalCaption : caption;
  const targetText = options.target === 'modal' ? modalCaptionText : captionText;
  const isModal = options.target === 'modal';

  if (!targetCaption || !targetText) return;

  if (isModal) {
    clearTimeout(modalCaptionTimer);
    clearInterval(modalCaptionTyping);
  } else {
    clearTimeout(captionTimer);
    clearInterval(captionTyping);
  }

  targetCaption.classList.remove('show');
  floatingCurio.classList.remove('speaking');
  targetText.textContent = '';

  setTimeout(() => {
    targetCaption.classList.add('show');
    floatingCurio.classList.add('speaking');

    let index = 0;
    const typing = setInterval(() => {
      targetText.textContent = text.slice(0, ++index);
      if (index >= text.length) {
        clearInterval(typing);
        const timer = setTimeout(() => {
          targetCaption.classList.remove('show');
          floatingCurio.classList.remove('speaking');
        }, hold);

        if (isModal) modalCaptionTimer = timer;
        else captionTimer = timer;
      }
    }, 24);

    if (isModal) modalCaptionTyping = typing;
    else captionTyping = typing;
  }, 110);
}

// ------------------------------------------------------------
// Hero 시스템 메시지 타이핑 효과
// ------------------------------------------------------------
function typeHero() {
  if (!typeText) return;
  clearInterval(typeTimer);
  typeText.textContent = '';
  let index = 0;
  typeTimer = setInterval(() => {
    typeText.textContent = initialMessage.slice(0, ++index);
    if (index >= initialMessage.length) clearInterval(typeTimer);
  }, 35);
}

// ------------------------------------------------------------
// 프로젝트 카드 목업 HTML 생성
// ------------------------------------------------------------
function createMockupHTML() {
  return `
    <div class="mockup-screen">
      <div class="mockup-bar"></div>
      <div class="mockup-line"></div>
      <div class="mockup-line short"></div>
      <div class="mockup-blocks"><i></i><i></i><i></i><i></i></div>
    </div>
  `;
}

// ------------------------------------------------------------
// 프로젝트 카드 렌더링
// - 필터에 맞는 프로젝트만 카드로 생성
// ------------------------------------------------------------
function getFilteredProjects(filter = currentFilter) {
  return filter === 'all'
    ? projects
    : projects.filter((project) => project.categories.includes(filter));
}

function updateProjectPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PROJECTS_PER_PAGE));

  if (currentProjectPage > totalPages) currentProjectPage = totalPages;
  if (currentProjectPage < 1) currentProjectPage = 1;

  if (projectPageStatus) {
    projectPageStatus.textContent = `${String(currentProjectPage).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
  }

  if (prevProjectPage) prevProjectPage.disabled = currentProjectPage <= 1;
  if (nextProjectPage) nextProjectPage.disabled = currentProjectPage >= totalPages;

  if (projectPagination) {
    projectPagination.style.display = totalItems > PROJECTS_PER_PAGE ? 'flex' : 'none';
  }
}

// ------------------------------------------------------------
// 프로젝트 카드 렌더링
// - 총 프로젝트 수는 9개
// - 한 화면에서는 최대 6개 카드만 표시
// - 나머지 카드는 < > 페이지 버튼으로 탐색
// ------------------------------------------------------------
function renderProjects(filter = 'all', page = 1) {
  currentFilter = filter;
  currentProjectPage = page;

  const filtered = getFilteredProjects(filter);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PROJECTS_PER_PAGE));

  if (currentProjectPage > totalPages) currentProjectPage = totalPages;
  if (currentProjectPage < 1) currentProjectPage = 1;

  const startIndex = (currentProjectPage - 1) * PROJECTS_PER_PAGE;
  const visibleProjects = filtered.slice(startIndex, startIndex + PROJECTS_PER_PAGE);

  projectCount.textContent = String(totalItems).padStart(2, '0');
  updateProjectPagination(totalItems);

  projectGrid.classList.add('filtering');
  projectGrid.innerHTML = visibleProjects.map((project) => `
    <article class="card project-card reveal on" data-project-id="${project.id}" tabindex="0" role="button" aria-label="${project.title} 상세 보기">
      <div class="project-mockup">${createMockupHTML()}</div>
      <div class="project-body">
        <div>
          <span class="chip">${project.type}</span>
          <h3>${project.title}</h3>
          <p class="project-summary">${project.short}</p>
        </div>
        <div class="project-tags">
          ${project.categories.map((category) => `<span class="tag">${category}</span>`).join('')}
        </div>
      </div>
    </article>
  `).join('');

  setTimeout(() => projectGrid.classList.remove('filtering'), 420);

  $$('.project-card').forEach((card) => {
    card.addEventListener('click', () => openProjectModal(card.dataset.projectId));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') openProjectModal(card.dataset.projectId);
    });
  });
}

// ------------------------------------------------------------
// 필터 선택 시 CURIO 반응 메시지
// ------------------------------------------------------------
function getFilterMessage(filter) {
  const count = filter === 'all'
    ? projects.length
    : projects.filter((project) => project.categories.includes(filter)).length;

  const labelMap = {
    all: '전체 프로젝트',
    design: '디자인 중심 프로젝트',
    coding: '직접 구현한 코딩 프로젝트',
    team: '협업 프로젝트',
  };

  return `${labelMap[filter]} ${count}건을 표시합니다. CURIO가 선택한 기준에 맞춰 프로젝트 아카이브를 다시 정리했습니다.`;
}

// ------------------------------------------------------------
// 프로젝트 상세 모달 오픈
// - 브라우저 창처럼 보이는 80~90% 크기 모달
// - 우측 CURIO ANALYSIS에 프로젝트 내용 요약 출력
// ------------------------------------------------------------
function openProjectModal(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  $('#modalBrowserTitle').textContent = `CURIO / ${project.title}`;
  $('#modalMockup').innerHTML = createMockupHTML();
  $('#modalMeta').innerHTML = `
    <span>${project.status}</span>
    <span>${project.year}</span>
    <span>${project.roleType}</span>
  `;
  $('#modalTitle').textContent = project.title;
  $('#modalDesc').textContent = project.short;
  $('#modalIssue').textContent = project.issue;
  $('#modalSolution').textContent = project.solution;
  $('#modalRole').textContent = project.role;
  $('#modalSummary').textContent = '';

  hideCaption();
  hideModalCaption();

  projectModal.classList.remove('minimized');
  if (modalWindow) modalWindow.classList.remove('maximized');
  if (projectWindowDock) {
    projectWindowDock.classList.remove('show');
    projectWindowDock.setAttribute('aria-hidden', 'true');
  }
  if (dockProjectTitle) dockProjectTitle.textContent = project.title;

  projectModal.classList.add('open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('window-open');
  document.body.style.overflow = 'hidden';
  activeProjectId = project.id;

  if (modalWindow) {
    modalWindow.classList.add('is-focused');
    modalWindow.style.left = '50%';
    modalWindow.style.top = '50%';
    modalWindow.style.transform = 'translate(-50%, -50%) scale(1)';
  }

  speakSequence(['Opening Project Window.', 'Analyzing Selected Record...', `${project.title} briefing ready.`], { hold: 1150, gap: 360, target: 'modal' });
  typeModalSummary(project.summary);

  updateActivityLog([
    { text: 'Opening Project Window', state: 'done' },
    { text: `${project.title} Loaded`, state: 'done' },
    { text: 'Generating CURIO Briefing...', state: 'active' },
    { text: 'Project Detail Ready', state: '' },
  ]);

  // 상세창 내부의 CURIO ANALYSIS 카드가 실시간 브리핑처럼 타이핑됩니다.
}

// ------------------------------------------------------------
// 프로젝트 상세 모달 닫기
// ------------------------------------------------------------
function closeProjectModal() {
  clearTimeout(sequenceTimer);
  clearInterval(modalSummaryTyping);
  hideModalCaption();
  if (modalWindow) modalWindow.classList.remove('maximized');
  if (projectWindowDock) {
    projectWindowDock.classList.remove('show');
    projectWindowDock.setAttribute('aria-hidden', 'true');
  }
  projectModal.classList.remove('open', 'minimized');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('window-open');
  document.body.style.overflow = '';
  activeProjectId = null;
  if (modalWindow) {
    modalWindow.classList.remove('is-focused', 'is-dragging');
    modalWindow.style.left = '';
    modalWindow.style.top = '';
    modalWindow.style.transform = '';
  }
  sectionActivity('projects');
  updateReportProgress('projects');
}

function minimizeProjectWindow() {
  if (!projectModal || !projectModal.classList.contains('open')) return;
  projectModal.classList.add('minimized');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('window-open');
  document.body.style.overflow = '';

  if (projectWindowDock) {
    projectWindowDock.classList.add('show');
    projectWindowDock.setAttribute('aria-hidden', 'false');
  }
}

function restoreProjectWindow() {
  if (!projectModal) return;
  projectModal.classList.remove('minimized');
  projectModal.classList.add('open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('window-open');
  document.body.style.overflow = 'hidden';
  if (modalWindow) modalWindow.classList.add('is-focused');

  if (projectWindowDock) {
    projectWindowDock.classList.remove('show');
    projectWindowDock.setAttribute('aria-hidden', 'true');
  }
}

function toggleMaximizeProjectWindow() {
  if (!modalWindow || !projectModal.classList.contains('open')) return;
  modalWindow.classList.toggle('maximized');
  modalWindow.classList.remove('is-dragging');
  modalWindow.style.left = '50%';
  modalWindow.style.top = '50%';
  modalWindow.style.transform = 'translate(-50%, -50%) scale(1)';
}

// ------------------------------------------------------------
// Project Window Drag / Focus
// - 상세 페이지는 새 창처럼 이동 가능
// - 최대화 상태에서는 드래그를 비활성화
// ------------------------------------------------------------
function startWindowDrag(event) {
  // Window control 버튼(− / □ / ×)을 누를 때는 드래그가 시작되지 않도록 분리합니다.
  // 기존에는 topbar 전체가 drag handle이라 버튼 클릭 시 창 위치가 튀고, click 이벤트가 불안정해지는 문제가 있었습니다.
  if (event.target.closest('.browser-controls')) return;
  if (!modalWindow || modalWindow.classList.contains('maximized')) return;
  if (!projectModal.classList.contains('open')) return;

  isDraggingWindow = true;
  modalWindow.classList.add('is-focused', 'is-dragging');

  const rect = modalWindow.getBoundingClientRect();
  dragOffset.x = event.clientX - rect.left;
  dragOffset.y = event.clientY - rect.top;

  modalWindow.style.left = `${rect.left}px`;
  modalWindow.style.top = `${rect.top}px`;
  modalWindow.style.transform = 'translate(0, 0) scale(1)';

  document.addEventListener('mousemove', dragProjectWindow);
  document.addEventListener('mouseup', stopWindowDrag);
}

function dragProjectWindow(event) {
  if (!isDraggingWindow || !modalWindow) return;

  const nextLeft = Math.min(Math.max(12, event.clientX - dragOffset.x), window.innerWidth - modalWindow.offsetWidth - 12);
  const nextTop = Math.min(Math.max(12, event.clientY - dragOffset.y), window.innerHeight - modalWindow.offsetHeight - 12);

  modalWindow.style.left = `${nextLeft}px`;
  modalWindow.style.top = `${nextTop}px`;
}

function stopWindowDrag() {
  isDraggingWindow = false;
  if (modalWindow) modalWindow.classList.remove('is-dragging');
  document.removeEventListener('mousemove', dragProjectWindow);
  document.removeEventListener('mouseup', stopWindowDrag);
}

// ------------------------------------------------------------
// 페이지 로드 후 부팅 화면 종료 → CURIO 진입 확인 화면 노출
// ------------------------------------------------------------
window.addEventListener('load', () => {
  renderProjects('all');

  setTimeout(() => {
    boot.classList.add('hide');
    entry.classList.add('show');
    shapeWave.triggerWave();
  }, 2500);
});

// ------------------------------------------------------------
// 사용자가 Enter Portfolio를 누르면 실제 포트폴리오 진입
// ------------------------------------------------------------
enterBtn.addEventListener('click', (event) => {
  shapeWave.triggerWave(event.clientX, event.clientY);
  entry.classList.add('entering');
  hasEntered = true;
  document.body.classList.add('entered');

  setTimeout(() => {
    entry.classList.remove('show');
    entry.style.display = 'none';
    typeHero();
    runSectionBriefing('hero', '안녕하세요. 조현정님의 포트폴리오에 진입하셨습니다.');
  }, 760);
});

// ------------------------------------------------------------
// 상단 네비게이션 클릭 이동 보정
// - IntersectionObserver만 의존하면 Projects처럼 섹션이 길거나
//   카드 렌더링 타이밍이 있는 영역에서 CURIO 멘트가 늦게 뜰 수 있음
// - 메뉴 클릭 시 직접 스크롤 + active + CURIO 멘트를 즉시 실행
// ------------------------------------------------------------
$$('.nav a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    const targetSection = $(targetId);
    if (!targetSection) return;

    event.preventDefault();

    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    navLinks.forEach((nav) => {
      nav.classList.toggle('active', nav.getAttribute('href') === targetId);
    });

    if (hasEntered && targetSection.dataset.ai) {
      lastSection = targetSection.id;
      window.setTimeout(() => {
        runSectionBriefing(targetSection.id, targetSection.dataset.ai);
      }, 320);
    }
  });
});

// ------------------------------------------------------------
// data-say 속성을 가진 버튼/링크 클릭 시 CURIO 자막 출력
// - href가 있는 CTA는 이동 후 멘트가 보이도록 약간 지연
// ------------------------------------------------------------
$$('[data-say]').forEach((element) => {
  element.addEventListener('click', () => {
    window.setTimeout(() => {
      speak(element.dataset.say, { hold: 7000 });
    }, element.getAttribute('href') ? 360 : 0);
  });
});

// ------------------------------------------------------------
// 하단 CURIO 버튼: 선택형 Quick Guide
// - 상단 메뉴와 같은 단어를 반복하지 않고 질문형 버튼으로 탐색 지원
// ------------------------------------------------------------
if (floatingCurio) {
  floatingCurio.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleQuickGuide();
  });
}

if (quickGuideClose) {
  quickGuideClose.addEventListener('click', (event) => {
    event.stopPropagation();
    closeQuickGuide();
  });
}

$$('[data-guide-target]').forEach((button) => {
  button.addEventListener('click', () => {
    moveToSectionById(button.dataset.guideTarget, button.dataset.guideSay);
  });
});

document.addEventListener('click', (event) => {
  if (!curioQuickGuide || !curioQuickGuide.classList.contains('open')) return;
  if (curioQuickGuide.contains(event.target) || floatingCurio.contains(event.target)) return;
  closeQuickGuide();
});

// ------------------------------------------------------------
// 프로젝트 필터 버튼 이벤트
// ------------------------------------------------------------
$$('.filter-chip').forEach((button) => {
  button.addEventListener('click', () => {
    $$('.filter-chip').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    renderProjects(filter, 1);
    const count = filter === 'all' ? projects.length : projects.filter((project) => project.categories.includes(filter)).length;
    updateActivityLog([
      { text: 'Archive Filter Updated', state: 'done' },
      { text: `${filter.toUpperCase()} Projects Selected`, state: 'done' },
      { text: `${String(Math.min(count, PROJECTS_PER_PAGE)).padStart(2, '0')} Cards Displayed`, state: 'active' },
      { text: 'Waiting For Project Selection', state: '' },
    ]);
    speak(getFilterMessage(filter), { hold: 7000 });
  });
});

// ------------------------------------------------------------
// 프로젝트 페이지네이션 이벤트
// ------------------------------------------------------------
if (prevProjectPage) {
  prevProjectPage.addEventListener('click', () => {
    if (currentProjectPage <= 1) return;
    renderProjects(currentFilter, currentProjectPage - 1);
    speak(`프로젝트 아카이브 ${currentProjectPage}페이지를 표시합니다.`, { hold: 5200 });
  });
}

if (nextProjectPage) {
  nextProjectPage.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredProjects(currentFilter).length / PROJECTS_PER_PAGE));
    if (currentProjectPage >= totalPages) return;
    renderProjects(currentFilter, currentProjectPage + 1);
    speak(`프로젝트 아카이브 ${currentProjectPage}페이지를 표시합니다.`, { hold: 5200 });
  });
}

// ------------------------------------------------------------
// 프로젝트 상세 Window 버튼 이벤트
// - − : 최소화 후 Dock으로 보관
// - □ : 최대화 / 복원 토글
// - × : 창 닫기
// ------------------------------------------------------------
$$('[data-window-close]').forEach((button) => {
  if (button.closest('.browser-controls')) {
    button.addEventListener('mousedown', (event) => event.stopPropagation());
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    closeProjectModal();
  });
});

$$('[data-window-minimize]').forEach((button) => {
  button.addEventListener('mousedown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    minimizeProjectWindow();
  });
});

$$('[data-window-maximize]').forEach((button) => {
  button.addEventListener('mousedown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMaximizeProjectWindow();
  });
});

if (projectWindowDock) {
  projectWindowDock.addEventListener('click', restoreProjectWindow);
}

if (modalWindow) {
  modalWindow.addEventListener('mousedown', () => modalWindow.classList.add('is-focused'));
}

const windowDragHandle = $('[data-window-drag]');
if (windowDragHandle) {
  windowDragHandle.addEventListener('mousedown', startWindowDrag);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && projectModal.classList.contains('open')) closeProjectModal();
  if (event.key === 'Escape') closeQuickGuide();
});

// ------------------------------------------------------------
// 섹션 진입 감지: CURIO 자막 / 네비게이션 active / reveal 처리
// ------------------------------------------------------------
const sections = $$('.section');
const navLinks = $$('.nav a:not(.logo)');
const revealItems = $$('.reveal');

sections.forEach((section) => {
  const labelMap = {
    hero: 'CURIO BRIEFING',
    about: 'CURIO ANALYSIS',
    projects: 'CURIO ARCHIVE',
    contact: 'CURIO SUMMARY',
  };
  section.dataset.reportLabel = labelMap[section.id] || 'CURIO REPORT';
});

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entryItem) => {
    if (!entryItem.isIntersecting) return;

    entryItem.target.querySelectorAll('.reveal').forEach((item, index) => {
      setTimeout(() => item.classList.add('on'), index * 90);
    });

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entryItem.target.id}`);
    });

    if (hasEntered && entryItem.target.dataset.ai && lastSection !== entryItem.target.id) {
      lastSection = entryItem.target.id;
      runSectionBriefing(entryItem.target.id, entryItem.target.dataset.ai);
    }
  });
}, { threshold: 0.48 });

sections.forEach((section) => sectionObserver.observe(section));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entryItem) => {
    if (entryItem.isIntersecting) entryItem.target.classList.add('on');
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));

// ------------------------------------------------------------
// Shape Wave Canvas Motion
// - 제공한 CodePen JS를 CURIO 진입 화면에 맞게 객체화
// - [data-shape-mask] 영역에는 도형이 가려져 텍스트 가독성을 확보
// ------------------------------------------------------------
const shapeWave = (() => {
  const canvas = $('#shapeWaveCanvas');
  const ctx = canvas.getContext('2d');

  const gap = 40;
  const radiusVmin = 30;
  const speedIn = 0.5;
  const speedOut = 0.6;
  const restScale = 0.09;
  const minHoverScale = 1;
  const maxHoverScale = 3;
  const waveSpeed = 1200;
  const waveWidth = 180;

  const PALETTE = [
    { type: 'solid', value: '#22c55e' },
    { type: 'solid', value: '#06b6d4' },
    { type: 'solid', value: '#f97316' },
    { type: 'solid', value: '#ef4444' },
    { type: 'solid', value: '#facc15' },
    { type: 'solid', value: '#ec4899' },
    { type: 'solid', value: '#9ca3af' },
    { type: 'solid', value: '#a78bfa' },
    { type: 'solid', value: '#60a5fa' },
    { type: 'solid', value: '#34d399' },
    { type: 'gradient', stops: ['#6366f1', '#3b82f6'] },
    { type: 'gradient', stops: ['#06b6d4', '#6366f1'] },
    { type: 'gradient', stops: ['#22c55e', '#06b6d4'] },
    { type: 'gradient', stops: ['#f97316', '#ef4444'] },
    { type: 'gradient', stops: ['#8b5cf6', '#06b6d4'] },
    { type: 'gradient', stops: ['#3b82f6', '#8b5cf6'] },
    { type: 'gradient', stops: ['#34d399', '#3b82f6'] },
  ];

  const SHAPE_TYPES = ['circle', 'pill', 'star', 'star'];

  let grid = null;
  let rafId = null;
  let pointer = null;
  let activity = 0;
  let waves = [];
  let maskRects = [];
  let frameCount = 0;
  let maskOverride = false;

  function rnd(min, max) { return Math.random() * (max - min) + min; }
  function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function smoothstep(t) {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  }

  function durationToFactor(seconds) {
    if (seconds <= 0) return 1;
    return 1 - Math.pow(0.05, 1 / (60 * seconds));
  }

  function drawCircle(size) {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPill(size) {
    const w = size * 0.48;
    const h = size;
    ctx.beginPath();
    ctx.roundRect(-w, -h, w * 2, h * 2, w);
    ctx.fill();
  }

  function drawStar(size, points, innerRatio) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * innerRatio;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawShape(shape) {
    switch (shape.type) {
      case 'circle': return drawCircle(shape.size / 1.5);
      case 'pill': return drawPill(shape.size / 1.4);
      case 'star': return drawStar(shape.size, shape.points, shape.innerRatio);
      default: return null;
    }
  }

  function resolveFill(colorDef, size) {
    if (colorDef.type === 'solid') return colorDef.value;
    const grad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, size * 0.3, size * 1.5);
    grad.addColorStop(0, colorDef.stops[0]);
    grad.addColorStop(1, colorDef.stops[1]);
    return grad;
  }

  function randomStarProps() {
    return { points: rndInt(4, 10), innerRatio: rnd(0.1, 0.5) };
  }

  function buildGrid() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cols = Math.floor(W / gap);
    const rows = Math.floor(H / gap);
    const offsetX = (W - (cols - 1) * gap) / 2;
    const offsetY = (H - (rows - 1) * gap) / 2;
    const shapes = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const type = pick(SHAPE_TYPES);
        const shape = {
          x: offsetX + col * gap,
          y: offsetY + row * gap,
          type,
          color: pick(PALETTE),
          angle: rnd(0, Math.PI * 2),
          size: gap * 0.38,
          scale: restScale,
          maxScale: rnd(minHoverScale, maxHoverScale),
          hovered: false,
        };
        if (type === 'star') Object.assign(shape, randomStarProps());
        shapes.push(shape);
      }
    }
    return { shapes, width: W, height: H };
  }

  function init() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    grid = buildGrid();
  }

  function tick() {
    if (!grid) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const shapes = grid.shapes;
    const width = grid.width;
    const height = grid.height;
    const radius = Math.min(width, height) * (radiusVmin / 100);
    const now = performance.now();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);
    activity *= 0.93;

    frameCount++;
    if (frameCount % 10 === 0) {
      maskRects = Array.from(document.querySelectorAll('[data-shape-mask]'))
        .map((el) => el.getBoundingClientRect());
    }

    const maxDist = Math.sqrt(width * width + height * height);
    waves = waves.filter((w) => ((now - w.startTime) / 1000) * waveSpeed < maxDist + waveWidth);

    for (const shape of shapes) {
      const pad = gap / 2;
      const masked = !maskOverride && maskRects.some((r) => (
        shape.x >= r.left - pad && shape.x <= r.right + pad &&
        shape.y >= r.top - pad && shape.y <= r.bottom + pad
      ));

      if (masked) {
        shape.scale += (0 - shape.scale) * durationToFactor(speedOut);
        if (shape.scale < 0.005) shape.scale = 0;
        continue;
      }

      let pointerInfluence = 0;
      if (pointer && activity > 0.001) {
        const dx = shape.x - pointer.x;
        const dy = shape.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pointerInfluence = smoothstep(1 - dist / radius) * activity;

        if (pointerInfluence > 0.05 && !shape.hovered) {
          shape.hovered = true;
          shape.maxScale = rnd(minHoverScale, maxHoverScale);
          shape.angle = rnd(0, Math.PI * 2);
          if (shape.type === 'star') Object.assign(shape, randomStarProps());
        } else if (pointerInfluence <= 0.05) {
          shape.hovered = false;
        }
      } else {
        shape.hovered = false;
      }

      let waveInfluence = 0;
      for (const wave of waves) {
        const waveRadius = ((now - wave.startTime) / 1000) * waveSpeed;
        const wdx = shape.x - wave.x;
        const wdy = shape.y - wave.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        const t = 1 - Math.abs(wdist - waveRadius) / waveWidth;
        if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
      }

      const pointerTarget = restScale + pointerInfluence * (shape.maxScale - restScale);
      const waveTarget = restScale + waveInfluence * (shape.maxScale - restScale);
      const target = Math.max(pointerTarget, waveTarget);
      const factor = target > shape.scale ? durationToFactor(speedIn) : durationToFactor(speedOut);
      shape.scale += (target - shape.scale) * factor;

      if (shape.scale < restScale * 0.15) continue;

      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.angle);
      ctx.scale(shape.scale, shape.scale);
      ctx.fillStyle = resolveFill(shape.color, shape.size);
      drawShape(shape);
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  }

  function onMove(e) {
    pointer = { x: e.clientX, y: e.clientY };
    activity = 1;
  }

  function triggerWave(x, y) {
    const waveX = x !== undefined ? x : window.innerWidth / 2;
    const waveY = y !== undefined ? y : window.innerHeight / 2;
    waves.push({ x: waveX, y: waveY, startTime: performance.now() });
    maskOverride = true;
    const delay = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / waveSpeed;
    setTimeout(() => { maskOverride = false; }, delay * 1000);
  }

  init();
  rafId = requestAnimationFrame(tick);
  window.addEventListener('resize', init);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('click', (e) => triggerWave(e.clientX, e.clientY));

  return { triggerWave };
})();
