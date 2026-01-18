import { StorageService } from '../../services/storageService';

const STORAGE_KEY = 'fqdn_masking_map';

const FQDN_REGEX = /\b((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63})\b/gi;

const IGNORED_EXTENSIONS = new Set([
    'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'lua', 'pl', 'swift', 'kt', 'dart',
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'md', 'txt', 'rtf', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'tiff',
    'zip', 'tar', 'gz', 'rar', '7z', 'iso', 'bin', 'exe', 'dll', 'so', 'dylib',
    'log', 'lock', 'map', 'bak', 'tmp', 'swp'
]);

const COMMON_TLDS = new Set([
    'com', 'net', 'org', 'edu', 'gov', 'mil', 'io', 'co', 'info', 'biz', 'ai', 'app', 'dev', 'uk', 'ca', 'de', 'jp', 'fr', 'au', 'us', 'ru', 'ch', 'it', 'nl', 'se', 'no', 'es', 'br'
]);

interface FQDNData {
    globalRootCounter: number;
    rootMap: { [key: string]: string };
    scopeData: { 
        [key: string]: { 
            counter: number; 
            subMap: { [key: string]: string };
        };
    };
    fullMap: { [key: string]: string };
    reverseMap: { [key: string]: string };
}

function numberToLetters(num: number): string {
    let s = '';
    while (num >= 0) {
        s = String.fromCharCode((num % 26) + 97) + s;
        num = Math.floor(num / 26) - 1;
    }
    return s;
}

function loadData(): FQDNData {
    const defaultData: FQDNData = {
        globalRootCounter: 0,
        rootMap: {},
        scopeData: {},
        fullMap: {},
        reverseMap: {}
    };
    return StorageService.get<FQDNData>(STORAGE_KEY, defaultData);
}

async function saveData(data: FQDNData): Promise<void> {
    await StorageService.update(STORAGE_KEY, data);
}

function getOrGenerateMask(domain: string, state: FQDNData): string {
    const lowerDomain = domain.toLowerCase();

    if (state.fullMap[lowerDomain]) {
        return state.fullMap[lowerDomain];
    }

    const parts = lowerDomain.split('.');
    if (parts.length < 2) { return domain; }

    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    const rootDomain = `${sld}.${tld}`;
    const subParts = parts.slice(0, -2);

    let maskedRoot = '';

    if (state.rootMap[rootDomain]) {
        maskedRoot = state.rootMap[rootDomain];
    } else {
        const rootLabel = `dom-${numberToLetters(state.globalRootCounter)}`;
        maskedRoot = `${rootLabel}.${tld}`;

        state.rootMap[rootDomain] = maskedRoot;
        state.fullMap[rootDomain] = maskedRoot;
        state.reverseMap[maskedRoot] = rootDomain;

        state.globalRootCounter++;
    }

    if (subParts.length === 0) {
        return maskedRoot;
    }

    let currentOriginalParent = rootDomain;
    let currentMaskedParent = maskedRoot;

    for (let i = subParts.length - 1; i >= 0; i--) {
        const subLabel = subParts[i];

        if (!state.scopeData[currentOriginalParent]) {
            state.scopeData[currentOriginalParent] = { counter: 0, subMap: {} };
        }

        const scope = state.scopeData[currentOriginalParent];
        let mappedLabel = '';

        if (scope.subMap[subLabel]) {
            mappedLabel = scope.subMap[subLabel];
        } else {
            mappedLabel = numberToLetters(scope.counter);
            scope.subMap[subLabel] = mappedLabel;
            scope.counter++;
        }

        const newMasked = `${mappedLabel}.${currentMaskedParent}`;
        const newOriginal = `${subLabel}.${currentOriginalParent}`;

        state.fullMap[newOriginal] = newMasked;
        state.reverseMap[newMasked] = newOriginal;

        currentOriginalParent = newOriginal;
        currentMaskedParent = newMasked;
    }

    return currentMaskedParent;
}

export async function maskFQDNs(text: string): Promise<string> {
    if (!text) { return text; }

    const state = loadData();
    let hasChanges = false;

    const newText = text.replace(FQDN_REGEX, (match) => {
        const parts = match.split('.');
        const lastPart = parts[parts.length - 1].toLowerCase();

        if (IGNORED_EXTENSIONS.has(lastPart) && !COMMON_TLDS.has(lastPart)) {
            return match;
        }

        const masked = getOrGenerateMask(match, state);
        if (masked !== match) {
            hasChanges = true;
        }
        return masked;
    });

    if (hasChanges) {
        await saveData(state);
    }

    return newText;
}

export async function unmaskFQDNs(text: string): Promise<string> {
    if (!text) { return text; }

    const state = loadData();
    const reverseMap = state.reverseMap;

    return text.replace(FQDN_REGEX, (match) => {
        const key = match.toLowerCase();
        if (reverseMap[key]) {
            return reverseMap[key];
        }
        return match;
    });
}