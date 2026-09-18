/* =========================================================
   كتاب اللغة العربية التفاعلي
   Main Application
========================================================= */

/* =========================================================
   CONFIGURATION
========================================================= */

const pages = [
    {
        number: 1,
        image: "pages/page-1.webp"
    },
    {
        number: 2,
        image: "pages/page-2.webp"
    }
];

const EDITOR_PASSWORD = "omarisraa2027";
const LOCAL_BACKUP_KEY = "arabic-book-annotations-backup";
const ANNOTATIONS_FILE = "annotations.json";

/* =========================================================
   ANNOTATION DATA
========================================================= */

const annotations = [];

/* =========================================================
   ANNOTATION COLORS
========================================================= */

const annotationColors = {
    meaning: "meaning",
    irab: "irab",
    mohassanatLafziya: "mohassanat-lafziya",
    mohassanatManawiya: "mohassanat-manawiya",
    tashbeeh: "tashbeeh",
    general: "general"
};

const annotationTypePriority = [
    "meaning",
    "irab",
    "mohassanatLafziya",
    "mohassanatManawiya",
    "tashbeeh",
    "general"
];

/* =========================================================
   STATE
========================================================= */

let currentPageIndex = 0;
let activeFilter = "all";

/* =========================================================
   EDITOR STATE
========================================================= */

let editorOpen = false;
let selectedRect = null;
let selectedAnnotationType = null;
let isDrawing = false;
let drawStart = null;
let selectionElement = null;
let selectedAnnotationForDelete = null;
let activePointerId = null;

/* =========================================================
   DOM REFERENCES
========================================================= */

let pageImage;
let annotationLayer;
let bookPage;
let pageNumber;
let currentPage;
let totalPages;
let annotationCount;
let previousPage;
let nextPage;
let previousPageBottom;
let nextPageBottom;
let annotationCard;
let cardContent;
let overlay;
let closeCard;
let printButton;
let searchButton;
let searchPanel;
let searchInput;
let searchResults;
let closeSearch;
let themeButton;
let themeIcon;
let editorButton;
let editorPanel;
let editorClose;
let editorBackdrop;
let selectionPreview;
let editorForm;
let saveAnnotation;
let exportAnnotations;
let editorStatus;
let editorText;

/* =========================================================
   CACHE DOM
========================================================= */

function cacheDOM() {
    pageImage = document.getElementById("pageImage");
    annotationLayer = document.getElementById("annotationLayer");
    bookPage = document.getElementById("bookPage");

    pageNumber = document.getElementById("pageNumber");
    currentPage = document.getElementById("currentPage");
    totalPages = document.getElementById("totalPages");
    annotationCount = document.getElementById("annotationCount");

    previousPage = document.getElementById("previousPage");
    nextPage = document.getElementById("nextPage");
    previousPageBottom = document.getElementById("previousPageBottom");
    nextPageBottom = document.getElementById("nextPageBottom");

    annotationCard = document.getElementById("annotationCard");
    cardContent = document.getElementById("cardContent");
    overlay = document.getElementById("overlay");
    closeCard = document.getElementById("closeCard");

    printButton = document.getElementById("printButton");

    searchButton = document.getElementById("searchButton");
    searchPanel = document.getElementById("searchPanel");
    searchInput = document.getElementById("searchInput");
    searchResults = document.getElementById("searchResults");
    closeSearch = document.getElementById("closeSearch");

    themeButton = document.getElementById("themeButton");
    themeIcon = document.getElementById("themeIcon");

    editorButton = document.getElementById("editorButton");
    editorPanel = document.getElementById("editorPanel");
    editorClose = document.getElementById("editorClose");
    editorBackdrop = document.getElementById("editorBackdrop");
    selectionPreview = document.getElementById("selectionPreview");
    editorForm = document.getElementById("editorForm");
    saveAnnotation = document.getElementById("saveAnnotation");
    exportAnnotations = document.getElementById("exportAnnotations");
    editorStatus = document.getElementById("editorStatus");
    editorText = document.getElementById("editorText");
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function init() {
    cacheDOM();

    if (!pageImage || !annotationLayer || !bookPage) {
        console.error("Required DOM elements are missing.");
        return;
    }

    totalPages.textContent = pages.length;

    setupEvents();
    loadTheme();

    createDeleteButton();
    createBackupButton();

    /*
       First load annotations.json.
    */
    await loadAnnotations();

    /*
       Then render the application.
    */
    renderPage();
    updateAnnotationCount();
}

/* =========================================================
   LOAD ANNOTATIONS.JSON
========================================================= */

async function loadAnnotations() {
    try {
        console.log(`Loading ${ANNOTATIONS_FILE}...`);

        const response = await fetch(
            `${ANNOTATIONS_FILE}?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "annotations.json must contain a JSON array."
            );
        }

        const validAnnotations = data.filter(
            isValidAnnotation
        );

        annotations.splice(
            0,
            annotations.length,
            ...validAnnotations
        );

        console.log(
            `✓ Loaded ${validAnnotations.length} annotations from ${ANNOTATIONS_FILE}`
        );

        if (editorStatus) {
            showEditorSuccess(
                `✓ تم تحميل ${validAnnotations.length} ملاحظة من annotations.json`
            );
        }

    } catch (error) {
        console.error(
            "❌ Failed to load annotations.json:",
            error
        );

        annotations.splice(
            0,
            annotations.length
        );

        if (editorStatus) {
            showEditorError(
                "تعذر تحميل annotations.json"
            );
        }

        /*
           This message is especially useful while developing.
        */
        console.warn(
            "Make sure annotations.json is in the same folder as index.html."
        );
    }
}

/* =========================================================
   PAGE RENDERING
========================================================= */

function renderPage() {
    const page = pages[currentPageIndex];

    if (!page) {
        return;
    }

    pageImage.src = page.image;

    pageImage.alt =
        `صفحة ${page.number} من كتاب اللغة العربية`;

    pageNumber.textContent = page.number;
    currentPage.textContent = page.number;

    renderAnnotations();
    updateNavigation();
}

/* =========================================================
   GET PRIMARY ANNOTATION TYPE
========================================================= */

function getAnnotationPrimaryType(annotation) {
    if (!annotation || !annotation.notes) {
        return "general";
    }

    for (const type of annotationTypePriority) {
        const value = annotation.notes[type];

        if (value) {
            return type;
        }
    }

    return "general";
}

/* =========================================================
   RENDER ANNOTATIONS
========================================================= */

function renderAnnotations() {
    if (!annotationLayer) {
        return;
    }

    annotationLayer.innerHTML = "";

    const page = pages[currentPageIndex];

    if (!page) {
        return;
    }

    const pageAnnotations = annotations.filter(
        annotation =>
            annotation &&
            Number(annotation.page) === Number(page.number)
    );

    pageAnnotations.forEach(annotation => {
        if (
            activeFilter !== "all" &&
            !annotationHasType(
                annotation,
                activeFilter
            )
        ) {
            return;
        }

        const primaryType =
            getAnnotationPrimaryType(annotation);

        const rects =
            Array.isArray(annotation.rects)
                ? annotation.rects
                : [];

        rects.forEach(rect => {
            if (!rect) {
                return;
            }

            const element =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                );

            element.setAttribute(
                "x",
                Number(rect.x) || 0
            );

            element.setAttribute(
                "y",
                Number(rect.y) || 0
            );

            element.setAttribute(
                "width",
                Number(rect.w) || 0
            );

            element.setAttribute(
                "height",
                Number(rect.h) || 0
            );

            element.classList.add(
                "annotation-highlight"
            );

            element.classList.add(
                `annotation-${annotationColors[primaryType]}`
            );

            element.dataset.id =
                annotation.id;

            element.dataset.type =
                primaryType;

            element.setAttribute(
                "aria-label",
                annotation.text || "ملاحظة"
            );

            /*
               Reader mode.
            */

            element.addEventListener(
                "click",
                event => {
                    if (editorOpen) {
                        return;
                    }

                    event.stopPropagation();
                    openAnnotation(annotation);
                }
            );

            annotationLayer.appendChild(element);
        });
    });
}

/* =========================================================
   CHECK ANNOTATION TYPE
========================================================= */

function annotationHasType(annotation, type) {
    if (!annotation || !annotation.notes) {
        return false;
    }

    const value = annotation.notes[type];

    if (type === "tashbeeh") {
        return Boolean(
            value &&
            typeof value === "object" &&
            Object.values(value).some(Boolean)
        );
    }

    return Boolean(value);
}

/* =========================================================
   ANNOTATION COUNT
========================================================= */

function updateAnnotationCount() {
    const page = pages[currentPageIndex];

    if (!page) {
        annotationCount.textContent = "0";
        return;
    }

    const count = annotations.filter(
        annotation =>
            annotation &&
            Number(annotation.page) === Number(page.number) &&
            (
                activeFilter === "all" ||
                annotationHasType(
                    annotation,
                    activeFilter
                )
            )
    ).length;

    annotationCount.textContent = count;
}

/* =========================================================
   OPEN ANNOTATION
========================================================= */

function openAnnotation(annotation) {
    if (!annotationCard || !cardContent) {
        return;
    }

    cardContent.innerHTML =
        createAnnotationHTML(annotation);

    annotationCard.classList.add("open");
    overlay.classList.add("open");

    annotationCard.setAttribute(
        "aria-hidden",
        "false"
    );
}

/* =========================================================
   CREATE ANNOTATION HTML
========================================================= */

function createAnnotationHTML(annotation) {
    const notes = annotation.notes || {};

    let html = `
        <div class="target-word">
            <span class="label">
                الكلمة / العبارة
            </span>

            <h3>
                ${escapeHTML(annotation.text)}
            </h3>
        </div>
    `;

    if (notes.meaning) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    📖 المعنى
                </div>

                <div class="note-body">
                    ${escapeHTML(notes.meaning)}
                </div>
            </div>
        `;
    }

    if (notes.irab) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    🔤 الإعراب
                </div>

                <div class="note-body">
                    ${escapeHTML(notes.irab)}
                </div>
            </div>
        `;
    }

    if (notes.mohassanatLafziya) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    ✨ المحسنات اللفظية
                </div>

                <div class="note-body">
                    ${escapeHTML(
                        notes.mohassanatLafziya
                    )}
                </div>
            </div>
        `;
    }

    if (notes.mohassanatManawiya) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    💭 المحسنات المعنوية
                </div>

                <div class="note-body">
                    ${escapeHTML(
                        notes.mohassanatManawiya
                    )}
                </div>
            </div>
        `;
    }

    if (
        notes.tashbeeh &&
        typeof notes.tashbeeh === "object"
    ) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    🎨 التشبيه
                </div>

                <div class="simile-grid">
                    ${createSimileItem(
                        "المشبّه",
                        notes.tashbeeh.mushabbah
                    )}

                    ${createSimileItem(
                        "المشبّه به",
                        notes.tashbeeh.mushabbahBih
                    )}

                    ${createSimileItem(
                        "أداة التشبيه",
                        notes.tashbeeh.tool
                    )}

                    ${createSimileItem(
                        "وجه الشبه",
                        notes.tashbeeh.wajh
                    )}
                </div>
            </div>
        `;
    }

    if (notes.general) {
        html += `
            <div class="note-block">
                <div class="note-title">
                    💡 ملاحظة
                </div>

                <div class="note-body">
                    ${escapeHTML(notes.general)}
                </div>
            </div>
        `;
    }

    return html;
}

/* =========================================================
   SIMILE ITEM
========================================================= */

function createSimileItem(label, value) {
    if (!value) {
        return "";
    }

    return `
        <div class="simile-item">
            <small>
                ${escapeHTML(label)}
            </small>

            <span>
                ${escapeHTML(value)}
            </span>
        </div>
    `;
}

/* =========================================================
   CLOSE ANNOTATION
========================================================= */

function closeAnnotation() {
    if (!annotationCard || !overlay) {
        return;
    }

    annotationCard.classList.remove("open");
    overlay.classList.remove("open");

    annotationCard.setAttribute(
        "aria-hidden",
        "true"
    );
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function goToPage(index) {
    if (
        index < 0 ||
        index >= pages.length
    ) {
        return;
    }

    currentPageIndex = index;

    closeAnnotation();

    clearSelection();

    selectedAnnotationForDelete = null;

    renderPage();
    updateAnnotationCount();
    updateDeleteButton();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function updateNavigation() {
    const atFirst =
        currentPageIndex === 0;

    const atLast =
        currentPageIndex === pages.length - 1;

    previousPage.disabled = atFirst;
    previousPageBottom.disabled = atFirst;

    nextPage.disabled = atLast;
    nextPageBottom.disabled = atLast;
}

/* =========================================================
   FILTERS
========================================================= */

function setFilter(filter) {
    activeFilter = filter;

    document
        .querySelectorAll(".filter")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.filter === filter
            );
        });

    renderAnnotations();
    updateAnnotationCount();
}

/* =========================================================
   SEARCH
========================================================= */

function openSearch() {
    searchPanel.classList.add("open");

    setTimeout(() => {
        searchInput.focus();
    }, 50);
}

function closeSearchPanel() {
    searchPanel.classList.remove("open");

    searchInput.value = "";
    searchResults.innerHTML = "";
}

function performSearch(query) {
    const normalizedQuery =
        normalizeArabic(query);

    if (!normalizedQuery) {
        searchResults.innerHTML = "";
        return;
    }

    const matches = annotations.filter(
        annotation => {
            const simile =
                annotation.notes?.tashbeeh;

            const searchableText = [
                annotation.text,
                annotation.notes?.meaning,
                annotation.notes?.irab,
                annotation.notes?.mohassanatLafziya,
                annotation.notes?.mohassanatManawiya,
                annotation.notes?.general,
                simile?.mushabbah,
                simile?.mushabbahBih,
                simile?.tool,
                simile?.wajh
            ]
                .filter(Boolean)
                .join(" ");

            return normalizeArabic(
                searchableText
            ).includes(
                normalizedQuery
            );
        }
    );

    if (!matches.length) {
        searchResults.innerHTML = `
            <div class="search-result">
                <span>
                    لم يتم العثور على نتائج.
                </span>
            </div>
        `;

        return;
    }

    searchResults.innerHTML =
        matches
            .map(annotation => `
                <div
                    class="search-result"
                    data-result-id="${escapeHTML(
                        annotation.id
                    )}"
                >
                    <strong>
                        ${escapeHTML(
                            annotation.text
                        )}
                    </strong>

                    <span>
                        الصفحة ${escapeHTML(
                            annotation.page
                        )}
                    </span>
                </div>
            `)
            .join("");

    document
        .querySelectorAll(
            ".search-result[data-result-id]"
        )
        .forEach(result => {
            result.addEventListener(
                "click",
                () => {
                    const annotation =
                        annotations.find(
                            item =>
                                item.id ===
                                result.dataset.resultId
                        );

                    if (!annotation) {
                        return;
                    }

                    const pageIndex =
                        pages.findIndex(
                            page =>
                                Number(page.number) ===
                                Number(annotation.page)
                        );

                    if (pageIndex !== -1) {
                        currentPageIndex =
                            pageIndex;

                        renderPage();
                        updateAnnotationCount();
                    }

                    closeSearchPanel();
                    openAnnotation(annotation);
                }
            );
        });
}

/* =========================================================
   ARABIC NORMALIZATION
========================================================= */

function normalizeArabic(text) {
    return String(text || "")
        .toLowerCase()
        .replace(
            /[\u064B-\u065F\u0670]/g,
            ""
        )
        .replace(
            /[إأآٱ]/g,
            "ا"
        )
        .replace(
            /ى/g,
            "ي"
        )
        .replace(
            /ة/g,
            "ه"
        )
        .replace(
            /ـ/g,
            ""
        )
        .trim();
}

/* =========================================================
   PRINT
========================================================= */

function preparePrintView() {
    const printView =
        document.getElementById("printView");

    if (!printView) {
        return;
    }

    const categories = {
        meaning: {
            title: "📖 المعاني والمفردات",
            items: []
        },

        irab: {
            title: "🔤 الإعراب",
            items: []
        },

        mohassanatLafziya: {
            title: "✨ المحسنات اللفظية",
            items: []
        },

        mohassanatManawiya: {
            title: "💭 المحسنات المعنوية",
            items: []
        },

        tashbeeh: {
            title: "🎨 التشبيهات",
            items: []
        },

        general: {
            title: "💡 ملاحظات إضافية",
            items: []
        }
    };

    annotations.forEach(annotation => {
        const notes =
            annotation.notes || {};

        if (notes.meaning) {
            categories.meaning.items.push({
                text: annotation.text,
                content: notes.meaning,
                page: annotation.page
            });
        }

        if (notes.irab) {
            categories.irab.items.push({
                text: annotation.text,
                content: notes.irab,
                page: annotation.page
            });
        }

        if (notes.mohassanatLafziya) {
            categories.mohassanatLafziya.items.push({
                text: annotation.text,
                content: notes.mohassanatLafziya,
                page: annotation.page
            });
        }

        if (notes.mohassanatManawiya) {
            categories.mohassanatManawiya.items.push({
                text: annotation.text,
                content: notes.mohassanatManawiya,
                page: annotation.page
            });
        }

        if (notes.tashbeeh) {
            categories.tashbeeh.items.push({
                text: annotation.text,
                content: notes.tashbeeh,
                page: annotation.page
            });
        }

        if (notes.general) {
            categories.general.items.push({
                text: annotation.text,
                content: notes.general,
                page: annotation.page
            });
        }
    });

    let html = `
        <div class="print-header">
            <h1>
                كتاب اللغة العربية
            </h1>

            <p>
                ملخص الملاحظات والتطبيقات
            </p>
        </div>
    `;

    Object.values(categories).forEach(
        category => {
            if (!category.items.length) {
                return;
            }

            html += `
                <section class="print-category">
                    <h2>
                        ${escapeHTML(
                            category.title
                        )}
                    </h2>
            `;

            category.items.forEach(item => {
                if (
                    category ===
                    categories.tashbeeh
                ) {
                    html +=
                        createPrintableSimile(item);

                    return;
                }

                html += `
                    <div class="print-note">
                        <div class="print-target">
                            ${escapeHTML(
                                item.text
                            )}
                        </div>

                        <div class="print-content">
                            ${escapeHTML(
                                item.content
                            )}
                        </div>
                    </div>
                `;
            });

            html += `
                </section>
            `;
        }
    );

    printView.innerHTML = html;
}

function createPrintableSimile(item) {
    const simile =
        item.content || {};

    return `
        <div class="print-note">
            <div class="print-target">
                ${escapeHTML(item.text)}
            </div>

            <div class="print-simile">
                <div>
                    <strong>المشبّه:</strong>
                    ${escapeHTML(
                        simile.mushabbah || "—"
                    )}
                </div>

                <div>
                    <strong>المشبّه به:</strong>
                    ${escapeHTML(
                        simile.mushabbahBih || "—"
                    )}
                </div>

                <div>
                    <strong>أداة التشبيه:</strong>
                    ${escapeHTML(
                        simile.tool || "—"
                    )}
                </div>

                <div>
                    <strong>وجه الشبه:</strong>
                    ${escapeHTML(
                        simile.wajh || "—"
                    )}
                </div>
            </div>
        </div>
    `;
}

/* =========================================================
   THEME
========================================================= */

function loadTheme() {
    const savedTheme =
        localStorage.getItem(
            "arabic-book-theme"
        );

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeIcon.textContent = "☀";
    } else {
        themeIcon.textContent = "☾";
    }
}

function toggleTheme() {
    const isDark =
        document.body.classList.toggle("dark");

    localStorage.setItem(
        "arabic-book-theme",
        isDark ? "dark" : "light"
    );

    themeIcon.textContent =
        isDark ? "☀" : "☾";
}

/* =========================================================
   EDITOR PASSWORD
========================================================= */

function requestEditorAccess() {
    if (editorOpen) {
        return;
    }

    const password =
        prompt(
            "🔐 أدخل كلمة مرور وضع التحرير:"
        );

    if (password === null) {
        return;
    }

    if (password !== EDITOR_PASSWORD) {
        alert(
            "❌ كلمة المرور غير صحيحة."
        );

        return;
    }

    openEditor();
}

/* =========================================================
   OPEN EDITOR
========================================================= */

function openEditor() {
    editorOpen = true;

    document.body.classList.add(
        "editor-mode"
    );

    editorPanel.classList.add(
        "open"
    );

    editorPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    editorBackdrop.classList.add(
        "open"
    );

    editorButton.classList.add(
        "active"
    );

    resetEditor();

    showEditorSuccess(
        "🔓 تم فتح وضع التحرير."
    );
}

/* =========================================================
   CLOSE EDITOR
========================================================= */

function closeEditor() {
    finishActivePointer();

    editorOpen = false;

    document.body.classList.remove(
        "editor-mode"
    );

    editorPanel.classList.remove(
        "open"
    );

    editorPanel.setAttribute(
        "aria-hidden",
        "true"
    );

    editorBackdrop.classList.remove(
        "open"
    );

    editorButton.classList.remove(
        "active"
    );

    selectedAnnotationForDelete = null;

    clearSelection();

    renderAnnotations();
    updateDeleteButton();
}

/* =========================================================
   RESET EDITOR
========================================================= */

function resetEditor() {
    selectedRect = null;
    selectedAnnotationType = null;
    isDrawing = false;
    drawStart = null;
    activePointerId = null;

    if (selectionElement) {
        selectionElement.remove();
        selectionElement = null;
    }

    selectionPreview.textContent =
        "لم يتم تحديد أي نص";

    selectionPreview.classList.remove(
        "selected"
    );

    if (editorText) {
        editorText.value = "";
    }

    editorStatus.textContent = "";
    editorStatus.className =
        "editor-status";

    document
        .querySelectorAll(".editor-type")
        .forEach(button => {
            button.classList.remove(
                "active"
            );
        });

    selectedAnnotationForDelete = null;

    updateDeleteButton();

    renderAnnotations();
}

/* =========================================================
   PAGE COORDINATES
========================================================= */

function getPagePoint(event) {
    const rect =
        bookPage.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return {
            x: 0,
            y: 0
        };
    }

    return {
        x: Math.max(
            0,
            Math.min(
                100,
                (
                    (event.clientX - rect.left) /
                    rect.width
                ) * 100
            )
        ),

        y: Math.max(
            0,
            Math.min(
                100,
                (
                    (event.clientY - rect.top) /
                    rect.height
                ) * 100
            )
        )
    };
}

/* =========================================================
   FIND ANNOTATION UNDER POINT
========================================================= */

function findAnnotationAtPoint(point) {
    const page =
        pages[currentPageIndex];

    if (!page) {
        return null;
    }

    const pageAnnotations =
        annotations.filter(
            annotation =>
                annotation &&
                Number(annotation.page) ===
                Number(page.number)
        );

    for (
        let i = pageAnnotations.length - 1;
        i >= 0;
        i--
    ) {
        const annotation =
            pageAnnotations[i];

        const rects =
            Array.isArray(annotation.rects)
                ? annotation.rects
                : [];

        for (const rect of rects) {
            if (!rect) {
                continue;
            }

            const x =
                Number(rect.x) || 0;

            const y =
                Number(rect.y) || 0;

            const w =
                Number(rect.w) || 0;

            const h =
                Number(rect.h) || 0;

            if (
                point.x >= x &&
                point.x <= x + w &&
                point.y >= y &&
                point.y <= y + h
            ) {
                return annotation;
            }
        }
    }

    return null;
}

/* =========================================================
   START DRAWING
========================================================= */

function startSelection(event) {
    if (!editorOpen) {
        return;
    }

    if (
        event.pointerType === "mouse" &&
        event.button !== 0
    ) {
        return;
    }

    event.preventDefault();

    activePointerId =
        event.pointerId;

    try {
        bookPage.setPointerCapture(
            event.pointerId
        );
    } catch (error) {
        console.warn(
            "Pointer capture unavailable."
        );
    }

    isDrawing = true;

    drawStart =
        getPagePoint(event);

    if (selectionElement) {
        selectionElement.remove();
        selectionElement = null;
    }

    selectionElement =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
        );

    selectionElement.classList.add(
        "editor-selection-rect"
    );

    selectionElement.setAttribute(
        "x",
        drawStart.x
    );

    selectionElement.setAttribute(
        "y",
        drawStart.y
    );

    selectionElement.setAttribute(
        "width",
        0
    );

    selectionElement.setAttribute(
        "height",
        0
    );

    annotationLayer.appendChild(
        selectionElement
    );
}

/* =========================================================
   UPDATE DRAWING
========================================================= */

function updateSelection(event) {
    if (
        !editorOpen ||
        !isDrawing ||
        !selectionElement
    ) {
        return;
    }

    if (
        activePointerId !== null &&
        event.pointerId !== activePointerId
    ) {
        return;
    }

    event.preventDefault();

    const current =
        getPagePoint(event);

    const x =
        Math.min(
            drawStart.x,
            current.x
        );

    const y =
        Math.min(
            drawStart.y,
            current.y
        );

    const width =
        Math.abs(
            current.x -
            drawStart.x
        );

    const height =
        Math.abs(
            current.y -
            drawStart.y
        );

    selectionElement.setAttribute(
        "x",
        x
    );

    selectionElement.setAttribute(
        "y",
        y
    );

    selectionElement.setAttribute(
        "width",
        width
    );

    selectionElement.setAttribute(
        "height",
        height
    );
}

/* =========================================================
   FINISH DRAWING
========================================================= */

function finishSelection(event) {
    if (
        !editorOpen ||
        !isDrawing ||
        !selectionElement
    ) {
        return;
    }

    if (
        activePointerId !== null &&
        event.pointerId !== activePointerId
    ) {
        return;
    }

    event.preventDefault();

    isDrawing = false;

    const x =
        parseFloat(
            selectionElement.getAttribute("x")
        );

    const y =
        parseFloat(
            selectionElement.getAttribute("y")
        );

    const width =
        parseFloat(
            selectionElement.getAttribute("width")
        );

    const height =
        parseFloat(
            selectionElement.getAttribute("height")
        );

    if (
        width < 0.5 ||
        height < 0.5
    ) {
        clearSelection();

        activePointerId = null;

        return;
    }

    selectedRect = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        w: Number(width.toFixed(2)),
        h: Number(height.toFixed(2))
    };

    selectionPreview.textContent =
        `تم تحديد منطقة: ${selectedRect.w}% × ${selectedRect.h}%`;

    selectionPreview.classList.add(
        "selected"
    );

    editorStatus.textContent =
        "✓ تم التحديد — اختر نوع الملاحظة ثم اكتب محتواها.";

    editorStatus.className =
        "editor-status success";

    drawStart = null;
    activePointerId = null;
}

/* =========================================================
   FINISH ACTIVE POINTER
========================================================= */

function finishActivePointer() {
    if (activePointerId !== null) {
        try {
            if (
                bookPage.hasPointerCapture(
                    activePointerId
                )
            ) {
                bookPage.releasePointerCapture(
                    activePointerId
                );
            }
        } catch (error) {
            // Ignore.
        }
    }

    activePointerId = null;
}

/* =========================================================
   CANCEL DRAWING
========================================================= */

function cancelSelection() {
    if (!isDrawing) {
        return;
    }

    isDrawing = false;
    drawStart = null;

    if (selectionElement) {
        selectionElement.remove();
        selectionElement = null;
    }

    finishActivePointer();
}

/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelection() {
    selectedRect = null;
    drawStart = null;
    isDrawing = false;

    if (selectionElement) {
        selectionElement.remove();
        selectionElement = null;
    }

    finishActivePointer();

    selectionPreview.textContent =
        "لم يتم تحديد أي نص";

    selectionPreview.classList.remove(
        "selected"
    );
}

/* =========================================================
   SELECT EDITOR TYPE
========================================================= */

function selectEditorType(type) {
    selectedAnnotationType = type;

    document
        .querySelectorAll(".editor-type")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.type === type
            );
        });

    renderEditorForm();
}

/* =========================================================
   EDITOR FORM
========================================================= */

function renderEditorForm() {
    if (
        selectedAnnotationType ===
        "tashbeeh"
    ) {
        editorForm.innerHTML = `
            <div class="simile-form">

                <input
                    class="simile-input"
                    id="simileMushabbah"
                    placeholder="المشبّه"
                    autocomplete="off"
                >

                <input
                    class="simile-input"
                    id="simileMushabbahBih"
                    placeholder="المشبّه به"
                    autocomplete="off"
                >

                <input
                    class="simile-input"
                    id="simileTool"
                    placeholder="أداة التشبيه"
                    autocomplete="off"
                >

                <input
                    class="simile-input"
                    id="simileWajh"
                    placeholder="وجه الشبه"
                    autocomplete="off"
                >

            </div>
        `;

        editorText = null;

        return;
    }

    editorForm.innerHTML = `
        <textarea
            id="editorText"
            class="editor-textarea"
            placeholder="${escapeHTML(
                getEditorPlaceholder()
            )}"
        ></textarea>
    `;

    editorText =
        document.getElementById(
            "editorText"
        );
}

/* =========================================================
   PLACEHOLDERS
========================================================= */

function getEditorPlaceholder() {
    const placeholders = {
        meaning:
            "مثال: ارتفع وعلا",

        irab:
            "مثال: مبتدأ مرفوع وعلامة رفعه الضمة الظاهرة على آخره",

        mohassanatLafziya:
            "مثال: جناس / سجع / طباق لفظي...",

        mohassanatManawiya:
            "مثال: طباق بين «الليل» و«النهار»",

        general:
            "اكتب الملاحظة هنا..."
    };

    return (
        placeholders[
            selectedAnnotationType
        ] ||
        "اكتب الملاحظة هنا..."
    );
}

/* =========================================================
   GET EDITOR VALUE
========================================================= */

function getEditorValue() {
    if (
        selectedAnnotationType ===
        "tashbeeh"
    ) {
        return {
            mushabbah:
                document.getElementById(
                    "simileMushabbah"
                )?.value.trim() || "",

            mushabbahBih:
                document.getElementById(
                    "simileMushabbahBih"
                )?.value.trim() || "",

            tool:
                document.getElementById(
                    "simileTool"
                )?.value.trim() || "",

            wajh:
                document.getElementById(
                    "simileWajh"
                )?.value.trim() || ""
        };
    }

    const textarea =
        document.getElementById(
            "editorText"
        );

    return textarea
        ? textarea.value.trim()
        : "";
}

/* =========================================================
   SELECTED TEXT
========================================================= */

function getSelectedTextPlaceholder() {
    const entered =
        prompt(
            "اكتب الكلمة أو العبارة التي حددتها:"
        );

    return (
        entered?.trim() ||
        "نص محدد"
    );
}

/* =========================================================
   SAVE ANNOTATION
========================================================= */

function saveCurrentAnnotation() {
    editorStatus.textContent = "";
    editorStatus.className =
        "editor-status";

    if (!selectedRect) {
        showEditorError(
            "حدد الكلمة أو العبارة أولاً."
        );

        return;
    }

    if (!selectedAnnotationType) {
        showEditorError(
            "اختر نوع الملاحظة أولاً."
        );

        return;
    }

    const value =
        getEditorValue();

    if (
        selectedAnnotationType ===
        "tashbeeh"
    ) {
        const hasValue =
            Object.values(value)
                .some(Boolean);

        if (!hasValue) {
            showEditorError(
                "أدخل بيانات التشبيه أولاً."
            );

            return;
        }
    } else if (!value) {
        showEditorError(
            "اكتب محتوى الملاحظة أولاً."
        );

        return;
    }

    const page =
        pages[currentPageIndex];

    const existing =
        findAnnotationAtSamePosition(
            page.number,
            selectedRect
        );

    if (existing) {
        addNoteToExistingAnnotation(
            existing,
            value
        );
    } else {
        createNewAnnotation(
            page.number,
            value
        );
    }

    saveLocalBackup();

    renderAnnotations();
    updateAnnotationCount();

    showEditorSuccess(
        existing
            ? "✓ تم تحديث الملاحظة وحفظها."
            : "✓ تم حفظ الملاحظة بنجاح."
    );

    setTimeout(
        resetEditor,
        900
    );
}

/* =========================================================
   CREATE NEW ANNOTATION
========================================================= */

function createNewAnnotation(
    pageNumberValue,
    value
) {
    const newAnnotation = {
        id:
            `ann_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,

        page:
            Number(pageNumberValue),

        text:
            getSelectedTextPlaceholder(),

        rects: [
            {
                ...selectedRect
            }
        ],

        notes: {
            meaning: null,
            irab: null,
            mohassanatLafziya: null,
            mohassanatManawiya: null,
            tashbeeh: null,
            general: null
        }
    };

    newAnnotation.notes[
        selectedAnnotationType
    ] = value;

    annotations.push(
        newAnnotation
    );
}

/* =========================================================
   ADD NOTE TO EXISTING ANNOTATION
========================================================= */

function addNoteToExistingAnnotation(
    annotation,
    value
) {
    if (!annotation.notes) {
        annotation.notes = {};
    }

    annotation.notes[
        selectedAnnotationType
    ] = value;
}

/* =========================================================
   FIND EXISTING TARGET
========================================================= */

function findAnnotationAtSamePosition(
    page,
    rect
) {
    return annotations.find(
        annotation => {
            if (
                Number(annotation.page) !==
                Number(page)
            ) {
                return false;
            }

            if (
                !annotation.rects?.length
            ) {
                return false;
            }

            const old =
                annotation.rects[0];

            return (
                Math.abs(
                    Number(old.x) -
                    Number(rect.x)
                ) < 1 &&

                Math.abs(
                    Number(old.y) -
                    Number(rect.y)
                ) < 1 &&

                Math.abs(
                    Number(old.w) -
                    Number(rect.w)
                ) < 1 &&

                Math.abs(
                    Number(old.h) -
                    Number(rect.h)
                ) < 1
            );
        }
    );
}

/* =========================================================
   DELETE BUTTON
========================================================= */

function createDeleteButton() {
    const actions =
        document.querySelector(
            ".editor-actions"
        );

    if (!actions) {
        return;
    }

    if (
        document.getElementById(
            "deleteAnnotation"
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            "button"
        );

    button.type = "button";
    button.id =
        "deleteAnnotation";

    button.className =
        "editor-delete";

    button.textContent =
        "🗑 حذف الملاحظة";

    button.disabled = true;

    button.addEventListener(
        "click",
        deleteSelectedAnnotation
    );

    actions.appendChild(
        button
    );
}

/* =========================================================
   SELECT ANNOTATION FOR DELETION
========================================================= */

function selectAnnotationForDeletion(
    annotation
) {
    if (!annotation) {
        return;
    }

    selectedAnnotationForDelete =
        annotation;

    document
        .querySelectorAll(
            ".annotation-highlight"
        )
        .forEach(element => {
            element.classList.toggle(
                "editor-selected-annotation",
                element.dataset.id ===
                annotation.id
            );
        });

    selectionPreview.textContent =
        `تم اختيار: ${annotation.text}`;

    selectionPreview.classList.add(
        "selected"
    );

    editorStatus.textContent =
        "يمكنك الآن حذف هذه الملاحظة أو اختيار منطقة جديدة.";

    editorStatus.className =
        "editor-status";

    updateDeleteButton();
}

/* =========================================================
   UPDATE DELETE BUTTON
========================================================= */

function updateDeleteButton() {
    const button =
        document.getElementById(
            "deleteAnnotation"
        );

    if (!button) {
        return;
    }

    button.disabled =
        !selectedAnnotationForDelete;
}

/* =========================================================
   DELETE SELECTED ANNOTATION
========================================================= */

function deleteSelectedAnnotation() {
    if (
        !selectedAnnotationForDelete
    ) {
        showEditorError(
            "اختر ملاحظة أولاً."
        );

        return;
    }

    const annotation =
        selectedAnnotationForDelete;

    const confirmed =
        confirm(
            `هل أنت متأكد من حذف الملاحظة عن "${annotation.text}"؟`
        );

    if (!confirmed) {
        return;
    }

    const index =
        annotations.findIndex(
            item =>
                item.id ===
                annotation.id
        );

    if (index === -1) {
        showEditorError(
            "تعذر العثور على الملاحظة."
        );

        return;
    }

    annotations.splice(
        index,
        1
    );

    selectedAnnotationForDelete =
        null;

    clearSelection();

    renderAnnotations();
    updateAnnotationCount();

    saveLocalBackup();

    showEditorSuccess(
        "✓ تم حذف الملاحظة وحفظ التغيير."
    );

    updateDeleteButton();
}

/* =========================================================
   LOCAL BACKUP
========================================================= */

function saveLocalBackup() {
    try {
        localStorage.setItem(
            LOCAL_BACKUP_KEY,
            JSON.stringify(
                annotations
            )
        );

        return true;

    } catch (error) {
        console.error(
            "Could not save annotation backup:",
            error
        );

        return false;
    }
}

/* =========================================================
   VALIDATE ANNOTATION
========================================================= */

function isValidAnnotation(annotation) {
    if (
        !annotation ||
        typeof annotation !== "object"
    ) {
        return false;
    }

    if (
        typeof annotation.page !== "number" &&
        typeof annotation.page !== "string"
    ) {
        return false;
    }

    if (
        typeof annotation.id !== "string"
    ) {
        return false;
    }

    if (
        !Array.isArray(annotation.rects)
    ) {
        return false;
    }

    if (
        !annotation.notes ||
        typeof annotation.notes !== "object"
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   LOAD LOCAL BACKUP
========================================================= */

function loadLocalBackup() {
    try {
        const saved =
            localStorage.getItem(
                LOCAL_BACKUP_KEY
            );

        if (!saved) {
            return false;
        }

        const parsed =
            JSON.parse(saved);

        if (
            !Array.isArray(parsed)
        ) {
            return false;
        }

        const validAnnotations =
            parsed.filter(
                isValidAnnotation
            );

        annotations.splice(
            0,
            annotations.length,
            ...validAnnotations
        );

        console.info(
            `Restored ${annotations.length} annotations from local backup.`
        );

        return true;

    } catch (error) {
        console.error(
            "Could not load annotation backup:",
            error
        );

        return false;
    }
}

/* =========================================================
   BACKUP BUTTON
========================================================= */

function createBackupButton() {
    const actions =
        document.querySelector(
            ".editor-actions"
        );

    if (!actions) {
        return;
    }

    if (
        document.getElementById(
            "restoreBackup"
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            "button"
        );

    button.type = "button";

    button.id =
        "restoreBackup";

    button.className =
        "editor-backup";

    button.textContent =
        "↻ استعادة النسخة المحلية";

    button.addEventListener(
        "click",
        () => {
            const saved =
                localStorage.getItem(
                    LOCAL_BACKUP_KEY
                );

            if (!saved) {
                showEditorError(
                    "لا توجد نسخة محلية محفوظة."
                );

                return;
            }

            const confirmed =
                confirm(
                    "سيتم استبدال البيانات الحالية بالنسخة المحلية المحفوظة في هذا المتصفح. هل تريد المتابعة؟"
                );

            if (!confirmed) {
                return;
            }

            loadLocalBackup();

            renderAnnotations();
            updateAnnotationCount();

            showEditorSuccess(
                "✓ تمت استعادة النسخة المحلية."
            );
        }
    );

    actions.appendChild(
        button
    );
}

/* =========================================================
   EXPORT ANNOTATIONS
========================================================= */

function exportAnnotationData() {
    saveLocalBackup();

    const json =
        JSON.stringify(
            annotations,
            null,
            4
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href = url;

    link.download =
        "annotations.json";

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

    showEditorSuccess(
        `✓ تم تصدير annotations.json — ${annotations.length} ملاحظة`
    );
}

/* =========================================================
   EDITOR MESSAGES
========================================================= */

function showEditorError(message) {
    if (!editorStatus) {
        return;
    }

    editorStatus.textContent =
        message;

    editorStatus.className =
        "editor-status error";
}

function showEditorSuccess(message) {
    if (!editorStatus) {
        return;
    }

    editorStatus.textContent =
        message;

    editorStatus.className =
        "editor-status success";
}

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    /* PAGE NAVIGATION */

    previousPage.addEventListener(
        "click",
        () =>
            goToPage(
                currentPageIndex - 1
            )
    );

    nextPage.addEventListener(
        "click",
        () =>
            goToPage(
                currentPageIndex + 1
            )
    );

    previousPageBottom.addEventListener(
        "click",
        () =>
            goToPage(
                currentPageIndex - 1
            )
    );

    nextPageBottom.addEventListener(
        "click",
        () =>
            goToPage(
                currentPageIndex + 1
            )
    );

    /* ANNOTATION CARD */

    closeCard.addEventListener(
        "click",
        closeAnnotation
    );

    overlay.addEventListener(
        "click",
        closeAnnotation
    );

    /* FILTERS */

    document
        .querySelectorAll(".filter")
        .forEach(button => {
            button.addEventListener(
                "click",
                () =>
                    setFilter(
                        button.dataset.filter
                    )
            );
        });

    /* PRINT */

    printButton.addEventListener(
        "click",
        () => {
            preparePrintView();
            window.print();
        }
    );

    /* SEARCH */

    searchButton.addEventListener(
        "click",
        openSearch
    );

    closeSearch.addEventListener(
        "click",
        closeSearchPanel
    );

    searchInput.addEventListener(
        "input",
        event =>
            performSearch(
                event.target.value
            )
    );

    /* THEME */

    themeButton.addEventListener(
        "click",
        toggleTheme
    );

    /* EDITOR */

    editorButton.addEventListener(
        "click",
        requestEditorAccess
    );

    editorClose.addEventListener(
        "click",
        closeEditor
    );

    editorBackdrop.addEventListener(
        "click",
        closeEditor
    );

    document
        .querySelectorAll(".editor-type")
        .forEach(button => {
            button.addEventListener(
                "click",
                () =>
                    selectEditorType(
                        button.dataset.type
                    )
            );
        });

    saveAnnotation.addEventListener(
        "click",
        saveCurrentAnnotation
    );

    exportAnnotations.addEventListener(
        "click",
        exportAnnotationData
    );

    /* DRAWING */

    bookPage.addEventListener(
        "pointerdown",
        startSelection
    );

    bookPage.addEventListener(
        "pointermove",
        updateSelection
    );

    bookPage.addEventListener(
        "pointerup",
        finishSelection
    );

    bookPage.addEventListener(
        "pointercancel",
        cancelSelection
    );

    bookPage.addEventListener(
        "lostpointercapture",
        () => {
            if (isDrawing) {
                cancelSelection();
            }
        }
    );

    /* RIGHT CLICK = DELETE TARGET */

    bookPage.addEventListener(
        "contextmenu",
        event => {
            if (!editorOpen) {
                return;
            }

            event.preventDefault();

            const point =
                getPagePoint(event);

            const annotation =
                findAnnotationAtPoint(
                    point
                );

            if (annotation) {
                selectAnnotationForDeletion(
                    annotation
                );
            }
        }
    );

    /* DOUBLE CLICK = DELETE TARGET */

    bookPage.addEventListener(
        "dblclick",
        event => {
            if (!editorOpen) {
                return;
            }

            event.preventDefault();

            const point =
                getPagePoint(event);

            const annotation =
                findAnnotationAtPoint(
                    point
                );

            if (annotation) {
                selectAnnotationForDeletion(
                    annotation
                );
            }
        }
    );

    /* KEYBOARD */

    document.addEventListener(
        "keydown",
        event => {

            const activeElement =
                document.activeElement;

            const isTyping =
                activeElement &&
                (
                    activeElement.tagName ===
                        "INPUT" ||
                    activeElement.tagName ===
                        "TEXTAREA"
                );

            if (
                event.key ===
                "Escape"
            ) {
                if (editorOpen) {
                    closeEditor();
                }

                closeAnnotation();
                closeSearchPanel();

                return;
            }

            if (isTyping) {
                return;
            }

            if (
                event.key ===
                "ArrowRight"
            ) {
                event.preventDefault();

                goToPage(
                    currentPageIndex - 1
                );
            }

            if (
                event.key ===
                "ArrowLeft"
            ) {
                event.preventDefault();

                goToPage(
                    currentPageIndex + 1
                );
            }
        }
    );

    /* PREVENT IMAGE DRAGGING */

    pageImage.addEventListener(
        "dragstart",
        event =>
            event.preventDefault()
    );
}

/* =========================================================
   SECURITY / HTML ESCAPING
========================================================= */

function escapeHTML(value) {
    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);