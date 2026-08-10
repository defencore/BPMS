export const CLINICAL_SOURCES = Object.freeze([
    Object.freeze({
        id: 'esc-guideline',
        titleKey: 'methodology.source.esc-guideline',
        descriptionKey: 'methodology.source.esc-guideline-description',
        url: 'https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/elevated-blood-pressure-and-hypertension/'
    }),
    Object.freeze({
        id: 'esc-public-summary',
        titleKey: 'methodology.source.esc-summary',
        descriptionKey: 'methodology.source.esc-summary-description',
        url: 'https://www.escardio.org/news/press/press-releases/New-ESC-Hypertension-Guidelines-recommend-intensified-BP-targets-and-introduce-a-novel-elevated-blood-pressure-category-to-better-identify-people-at-risk-for-heart-attack-and-stroke/'
    }),
    Object.freeze({
        id: 'esc-journal',
        titleKey: 'methodology.source.journal',
        descriptionKey: 'methodology.source.journal-description',
        url: 'https://doi.org/10.1093/eurheartj/ehae178'
    }),
    Object.freeze({
        id: 'esc-corrigendum',
        titleKey: 'methodology.source.corrigendum',
        descriptionKey: 'methodology.source.corrigendum-description',
        url: 'https://doi.org/10.1093/eurheartj/ehaf031'
    }),
    Object.freeze({
        id: 'esc-patient-guide',
        titleKey: 'methodology.source.esc-patient-guide',
        descriptionKey: 'methodology.source.esc-patient-guide-description',
        url: 'https://www.escardio.org/static-file/Escardio/Guidelines/Documents/ESC-Patient-Guidelines-Hypertension.pdf'
    })
]);

export const ESC_GUIDELINE_URL = CLINICAL_SOURCES[0].url;
