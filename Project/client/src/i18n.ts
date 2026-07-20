import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  app: { name: "CVForge", tagline: "Positions, attributes and auto-generated CVs" },
  nav: {
    home: "Home", positions: "Positions", attributes: "Attribute Library", profile: "My Profile",
    users: "Users", login: "Sign in", logout: "Sign out", register: "Register", search: "Search everywhere…",
  },
  common: {
    create: "Create", edit: "Edit", delete: "Delete", duplicate: "Duplicate", save: "Save", cancel: "Cancel",
    add: "Add", close: "Close", loading: "Loading…", name: "Name", description: "Description", type: "Type",
    category: "Category", actions: "Actions", selected: "selected", confirmDelete: "Delete selected item(s)?",
    saved: "Saved", saving: "Saving…", empty: "Nothing here yet", all: "All", yes: "Yes", no: "No",
    conflict: "Someone else changed this data. It was reloaded — please re-apply your change.",
    open: "Open", download: "Download CSV",
  },
  home: {
    latest: "Latest positions", popular: "Most popular positions", tags: "Technology tags", stats: "Statistics",
    cvs24h: "CVs in the last 24h", totalCvs: "Total CVs", totalPositions: "Positions",
    candidates: "Candidates", recruiters: "Recruiters",
  },
  auth: {
    signInTitle: "Sign in to CVForge", google: "Continue with Google", github: "Continue with GitHub",
    or: "or use email", email: "Email", password: "Password", nameLabel: "Full name",
    signIn: "Sign in", signUp: "Create account", noAccount: "No account? Register", haveAccount: "Have an account? Sign in",
    blocked: "Your account is blocked", failed: "Authentication failed", badCredentials: "Wrong email or password",
    emailTaken: "This email is already registered",
  },
  positions: {
    title: "Positions", company: "Company", level: "Level", cvs: "CVs", updated: "Updated", access: "Access",
    public: "Public", restricted: "Restricted", accessible: "Available to you", notAccessible: "Not available",
    newPosition: "New position", basicInfo: "Basic information", attributes: "Attributes",
    projectTags: "Project tags", maxProjects: "Max projects in CV", accessRules: "Access rules",
    addRule: "Add rule", operator: "Operator", value: "Value", discussion: "Discussion",
    createCv: "Create my CV", openCv: "Open my CV", cvsTab: "Submitted CVs", overview: "Overview",
    average: "Average", candidate: "Candidate", likes: "Likes", noCvs: "No published CVs yet",
    writeComment: "Write a comment (Markdown supported)…", send: "Send",
  },
  attrs: {
    title: "Attribute Library", newAttribute: "New attribute", options: "Options (one per line)",
    builtIn: "Built-in", searchPrefix: "Search by prefix…", recent: "Recently used",
    imageDropzone: "Drag & drop an image, or click to select",
    imageUrl: "Image URL",
    names: {
      firstName: "First Name", lastName: "Last Name", location: "Location", personalPhoto: "Personal Photo",
      aboutMe: "About Me", englishLevel: "English Level", ieltsScore: "IELTS Score", gpa: "GPA",
      remoteWork: "Remote Work Availability", presentationSkills: "Presentation Skills", cap: "CAP",
      python: "Python", apacheHadoop: "Apache Hadoop", availableFrom: "Available From",
      lastEmployment: "Last Employment",
    },
    placeholders: { firstName: "Given name", lastName: "Family name", location: "City, Country" },
    categories: {
      personalInformation: "Personal Information", certification: "Certification",
      domainKnowledge: "Domain Knowledge", softSkills: "Soft Skills",
      technicalSkills: "Technical Skills", languages: "Languages",
    },
    types: {
      STRING: "String", TEXT: "Text (Markdown)", IMAGE: "Image", NUMERIC: "Numeric",
      DATE: "Date", PERIOD: "Period", BOOLEAN: "Checkbox", SELECT: "Dropdown",
    },
  },
  profile: {
    me: "Me", info: "Info", projects: "Projects", cvs: "CVs", addAttribute: "Add attribute",
    project: { name: "Project name", period: "Period", description: "Description (Markdown)", tags: "Technology tags", new: "New project", start: "Start", end: "End (empty = ongoing)" },
    noCvs: "No CVs yet. Open a position and press “Create my CV”.",
    autoSave: "Changes are saved automatically",
  },
  cv: {
    status: { DRAFT: "Draft", PUBLISHED: "Published" }, publish: "Publish", unpublish: "Unpublish",
    publishHint: "Fill all attributes to publish", generatedFor: "CV for position", sectionProjects: "Projects",
    emptyValue: "Not filled", like: "Like", unlike: "Remove like", incomplete: "Fill all attributes first ({{n}} missing)",
    deleteCv: "Delete CV",
  },
  users: {
    title: "Users", role: "Role", blocked: "Blocked", block: "Block", unblock: "Unblock",
    makeAdmin: "Make Admin", makeRecruiter: "Make Recruiter", makeCandidate: "Make Candidate", provider: "Sign-in",
  },
  search: { results: "Search results for “{{q}}”", positions: "Positions", attributes: "Attributes", cvs: "CVs", nothing: "Nothing found" },
};

// Russian translation of the same keys.
const ru: typeof en = {
  app: { name: "CVForge", tagline: "Позиции, атрибуты и автогенерация резюме" },
  nav: {
    home: "Главная", positions: "Позиции", attributes: "Библиотека атрибутов", profile: "Мой профиль",
    users: "Пользователи", login: "Войти", logout: "Выйти", register: "Регистрация", search: "Поиск по всему…",
  },
  common: {
    create: "Создать", edit: "Изменить", delete: "Удалить", duplicate: "Дублировать", save: "Сохранить", cancel: "Отмена",
    add: "Добавить", close: "Закрыть", loading: "Загрузка…", name: "Название", description: "Описание", type: "Тип",
    category: "Категория", actions: "Действия", selected: "выбрано", confirmDelete: "Удалить выбранное?",
    saved: "Сохранено", saving: "Сохранение…", empty: "Пока пусто", all: "Все", yes: "Да", no: "Нет",
    conflict: "Данные изменены другим пользователем. Они перезагружены — примените правку заново.",
    open: "Открыть", download: "Скачать CSV",
  },
  home: {
    latest: "Новые позиции", popular: "Популярные позиции", tags: "Теги технологий", stats: "Статистика",
    cvs24h: "Резюме за 24 часа", totalCvs: "Всего резюме", totalPositions: "Позиции",
    candidates: "Кандидаты", recruiters: "Рекрутёры",
  },
  auth: {
    signInTitle: "Вход в CVForge", google: "Войти через Google", github: "Войти через GitHub",
    or: "или по почте", email: "Почта", password: "Пароль", nameLabel: "Полное имя",
    signIn: "Войти", signUp: "Создать аккаунт", noAccount: "Нет аккаунта? Зарегистрируйтесь", haveAccount: "Есть аккаунт? Войдите",
    blocked: "Ваш аккаунт заблокирован", failed: "Ошибка аутентификации", badCredentials: "Неверная почта или пароль",
    emailTaken: "Эта почта уже зарегистрирована",
  },
  positions: {
    title: "Позиции", company: "Компания", level: "Уровень", cvs: "Резюме", updated: "Обновлено", access: "Доступ",
    public: "Открытая", restricted: "Ограниченная", accessible: "Доступна вам", notAccessible: "Недоступна",
    newPosition: "Новая позиция", basicInfo: "Основная информация", attributes: "Атрибуты",
    projectTags: "Теги проектов", maxProjects: "Макс. проектов в резюме", accessRules: "Правила доступа",
    addRule: "Добавить правило", operator: "Оператор", value: "Значение", discussion: "Обсуждение",
    createCv: "Создать моё резюме", openCv: "Открыть моё резюме", cvsTab: "Поданные резюме", overview: "Обзор",
    average: "Среднее", candidate: "Кандидат", likes: "Лайки", noCvs: "Опубликованных резюме пока нет",
    writeComment: "Напишите комментарий (поддерживается Markdown)…", send: "Отправить",
  },
  attrs: {
    title: "Библиотека атрибутов", newAttribute: "Новый атрибут", options: "Варианты (по одному в строке)",
    builtIn: "Встроенный", searchPrefix: "Поиск по префиксу…", recent: "Недавние",
    imageDropzone: "Перетащите изображение сюда или кликните для выбора",
    imageUrl: "URL изображения",
    names: {
      firstName: "Имя", lastName: "Фамилия", location: "Локация / Город", personalPhoto: "Личное фото",
      aboutMe: "Обо мне", englishLevel: "Уровень английского", ieltsScore: "Баллы IELTS", gpa: "Средний балл",
      remoteWork: "Готовность к удалённой работе", presentationSkills: "Навыки презентации", cap: "CAP",
      python: "Python", apacheHadoop: "Apache Hadoop", availableFrom: "Доступен с",
      lastEmployment: "Последнее место работы",
    },
    placeholders: { firstName: "Введите имя", lastName: "Введите фамилию", location: "Город, Страна" },
    categories: {
      personalInformation: "Личная информация", certification: "Сертификаты",
      domainKnowledge: "Предметные знания", softSkills: "Гибкие навыки",
      technicalSkills: "Технические навыки", languages: "Языки",
    },
    types: {
      STRING: "Строка", TEXT: "Текст (Markdown)", IMAGE: "Изображение", NUMERIC: "Число",
      DATE: "Дата", PERIOD: "Период", BOOLEAN: "Флажок", SELECT: "Список",
    },
  },
  profile: {
    me: "Обо мне", info: "Информация", projects: "Проекты", cvs: "Резюме", addAttribute: "Добавить атрибут",
    project: { name: "Название проекта", period: "Период", description: "Описание (Markdown)", tags: "Теги технологий", new: "Новый проект", start: "Начало", end: "Конец (пусто = идёт сейчас)" },
    noCvs: "Резюме пока нет. Откройте позицию и нажмите «Создать моё резюме».",
    autoSave: "Изменения сохраняются автоматически",
  },
  cv: {
    status: { DRAFT: "Черновик", PUBLISHED: "Опубликовано" }, publish: "Опубликовать", unpublish: "Скрыть",
    publishHint: "Заполните все атрибуты для публикации", generatedFor: "Резюме для позиции", sectionProjects: "Проекты",
    emptyValue: "Не заполнено", like: "Лайк", unlike: "Убрать лайк", incomplete: "Сначала заполните все атрибуты (не хватает: {{n}})",
    deleteCv: "Удалить резюме",
  },
  users: {
    title: "Пользователи", role: "Роль", blocked: "Заблокирован", block: "Заблокировать", unblock: "Разблокировать",
    makeAdmin: "Сделать админом", makeRecruiter: "Сделать рекрутёром", makeCandidate: "Сделать кандидатом", provider: "Вход",
  },
  search: { results: "Результаты поиска «{{q}}»", positions: "Позиции", attributes: "Атрибуты", cvs: "Резюме", nothing: "Ничего не найдено" },
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
