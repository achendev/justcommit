import { StorageService } from '../../services/storageService';

const STORAGE_KEY = 'email_masking_map';
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

interface MaskingData {
    originalToFake: { [key: string]: string };
    fakeToOriginal: { [key: string]: string };
}

function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateFakeEmail(): string {
    const user = 'user-' + generateRandomString(5);
    const domain = 'email-' + generateRandomString(3) + '.com';
    return `${user}@${domain}`;
}

function loadData(): MaskingData {
    return StorageService.get<MaskingData>(STORAGE_KEY, { originalToFake: {}, fakeToOriginal: {} });
}

async function saveData(data: MaskingData): Promise<void> {
    await StorageService.update(STORAGE_KEY, data);
}

export async function maskEmails(text: string): Promise<string> {
    if (!text) { return text; }

    const data = loadData();
    const map = data.originalToFake;
    const reverseMap = data.fakeToOriginal;
    let hasChanges = false;

    const newText = text.replace(EMAIL_REGEX, (match) => {
        const key = match.trim().toLowerCase();

        if (map[key]) {
            return map[key];
        } else {
            let fakeEmail;
            let attempts = 0;
            do {
                fakeEmail = generateFakeEmail();
                attempts++;
            } while (reverseMap[fakeEmail] && attempts < 10);

            map[key] = fakeEmail;
            reverseMap[fakeEmail] = key;
            hasChanges = true;
            return fakeEmail;
        }
    });

    if (hasChanges) {
        await saveData({ originalToFake: map, fakeToOriginal: reverseMap });
    }

    return newText;
}

export async function unmaskEmails(text: string): Promise<string> {
    if (!text) { return text; }

    const data = loadData();
    const reverseMap = data.fakeToOriginal;

    return text.replace(EMAIL_REGEX, (match) => {
        const key = match.trim().toLowerCase();

        if (reverseMap[key]) {
            return reverseMap[key];
        }

        return match;
    });
}