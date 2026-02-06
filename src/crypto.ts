// 简单的加密/解密工具
// 使用 XOR 加密 + Base64 编码

const ENCRYPTION_KEY = 'jws_landing_page_2024';

// 域名配置（部署时修改）
const LANDING_DOMAIN = 'https://jws.example.com';

export function encrypt(plaintext: string): string {
  let result = '';
  for (let i = 0; i < plaintext.length; i++) {
    result += String.fromCharCode(
      plaintext.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

export function decrypt(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

// 验证 UUID 格式
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 生成完整的邀请链接
export function generateInviteLink(uuid: string, domain?: string): string {
  const token = encrypt(uuid);
  const baseUrl = domain || LANDING_DOMAIN;
  return `${baseUrl}?t=${encodeURIComponent(token)}}`;
}

// 从 URL 中提取 token
export function extractTokenFromUrl(url: string): string | null {
  try {
    const params = new URLSearchParams(new URL(url).search);
    return params.get('t');
  } catch {
    return null;
  }
}

// 示例：生成邀请链接
// const uuid = '550e8400-e29b-41d4-a716-446655440000';
// const link = generateInviteLink(uuid); // https://domain.com?t=xxxxx
