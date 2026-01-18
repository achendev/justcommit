import { StorageService } from '../../services/storageService';

const STORAGE_KEY = 'ip_masking_map';

// IPv4
const IPV4_PATTERN = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9]{1,2})(?:\\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9]{1,2})){3}';

// IPv6
const IPV6_PATTERN = '(?:' +
    '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|' +
    '(?:[0-9a-fA-F]{1,4}:){1,7}:|' +
    '(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|' +
    '(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|' +
    '(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|' +
    '(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|' +
    '(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|' +
    '[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|' +
    ':(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|' +
    'fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|' +
    '::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|' +
    '(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])' +
')';

// Regex to capture IP (Group 1 or 3) and optional CIDR (Group 2 or 4)
const MASTER_IP_REGEX = new RegExp(
    `(${IPV6_PATTERN})(\\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?|(${IPV4_PATTERN})(\\/(?:[0-9]|[1-2][0-9]|3[0-2]))?`, 
    'gi'
);

interface MaskingData {
    originalToFake: { [key: string]: string };
    fakeToOriginal: { [key: string]: string };
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomIPv4(): string {
    return `${getRandomInt(1, 223)}.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
}

function generateRandomIPv6(): string {
    const parts: string[] = [];
    for (let i = 0; i < 8; i++) {
        parts.push(getRandomInt(0, 65535).toString(16));
    }
    return parts.join(':');
}

function loadData(): MaskingData {
    return StorageService.get<MaskingData>(STORAGE_KEY, { originalToFake: {}, fakeToOriginal: {} });
}

async function saveData(data: MaskingData): Promise<void> {
    await StorageService.update(STORAGE_KEY, data);
}

export async function maskIPs(text: string): Promise<string> {
    if (!text) { return text; }

    const data = loadData();
    const map = data.originalToFake;
    const reverseMap = data.fakeToOriginal;
    let hasChanges = false;

    const newText = text.replace(MASTER_IP_REGEX, (match, ipv6, ipv6Cidr, ipv4, ipv4Cidr) => {
        const ip = ipv6 || ipv4;
        const cidr = ipv6Cidr || ipv4Cidr || '';
        const isV6 = !!ipv6;
        
        if (!ip) { return match; }

        const key = ip.trim().toLowerCase();

        let fakeIP;
        if (map[key]) {
            fakeIP = map[key];
        } else {
            let attempts = 0;
            do {
                fakeIP = isV6 ? generateRandomIPv6() : generateRandomIPv4();
                attempts++;
            } while (reverseMap[fakeIP] && attempts < 10);
            
            map[key] = fakeIP;
            reverseMap[fakeIP] = key;
            hasChanges = true;
        }

        return fakeIP + cidr;
    });

    if (hasChanges) {
        await saveData({ originalToFake: map, fakeToOriginal: reverseMap });
    }

    return newText;
}

export async function unmaskIPs(text: string): Promise<string> {
    if (!text) { return text; }

    const data = loadData();
    const reverseMap = data.fakeToOriginal;

    return text.replace(MASTER_IP_REGEX, (match, ipv6, ipv6Cidr, ipv4, ipv4Cidr) => {
        const ip = ipv6 || ipv4;
        const cidr = ipv6Cidr || ipv4Cidr || '';
        
        if (!ip) { return match; }

        const key = ip.trim().toLowerCase();
        
        if (reverseMap[key]) {
            return reverseMap[key] + cidr; 
        }

        return match;
    });
}