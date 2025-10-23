import crypto from 'crypto';

/**
 * 秘钥加密工具类
 * 
 * 使用 AES-256-GCM 算法进行加密
 * 加密密钥从环境变量读取，如果未设置则自动生成（仅开发环境）
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * 获取加密密钥
 * 优先从环境变量读取，如果未设置则生成临时密钥（开发环境）
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.SECRET_ENCRYPTION_KEY;
  
  if (keyHex) {
    // 从环境变量读取
    return Buffer.from(keyHex, 'hex');
  }
  
  // 开发环境：生成临时密钥并警告
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Encryption] WARNING: SECRET_ENCRYPTION_KEY not set, using temporary key. Set SECRET_ENCRYPTION_KEY in production!');
    const tempKey = crypto.randomBytes(KEY_LENGTH);
    process.env.SECRET_ENCRYPTION_KEY = tempKey.toString('hex');
    return tempKey;
  }
  
  // 生产环境：必须设置
  throw new Error('SECRET_ENCRYPTION_KEY must be set in production environment!');
}

/**
 * 加密秘钥值
 * @param plaintext 明文
 * @returns 加密后的字符串，格式: iv:authTag:encrypted
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式：iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密秘钥值
 * @param ciphertext 密文，格式: iv:authTag:encrypted
 * @returns 明文
 */
export function decryptSecret(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt secret');
  }
}

/**
 * 生成加密密钥（用于初始化）
 * 运行一次，将输出保存到环境变量 SECRET_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('hex');
}

/**
 * 验证密文格式是否正确
 */
export function isValidCiphertext(ciphertext: string): boolean {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return false;
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  // 验证各部分是否是有效的十六进制字符串
  const hexRegex = /^[0-9a-f]+$/i;
  return hexRegex.test(ivHex) && hexRegex.test(authTagHex) && hexRegex.test(encrypted);
}

/**
 * 生成秘钥预览（隐藏敏感部分）
 * 例如：postgresql://user:****@host:5432/db
 */
export function getSecretPreview(plaintext: string, maxLength: number = 50): string {
  if (!plaintext) {
    return '';
  }
  
  // 如果是URL格式，隐藏密码部分
  try {
    const url = new URL(plaintext);
    if (url.password) {
      url.password = '****';
      return url.toString();
    }
  } catch {
    // 不是URL，继续下面的逻辑
  }
  
  // 如果包含等号（可能是 key=value 格式），隐藏等号后的值
  if (plaintext.includes('=')) {
    const parts = plaintext.split('=');
    if (parts.length === 2) {
      return `${parts[0]}=****`;
    }
  }
  
  // 如果是长字符串，显示开头和结尾
  if (plaintext.length > maxLength) {
    const start = plaintext.substring(0, 10);
    const end = plaintext.substring(plaintext.length - 4);
    return `${start}****${end}`;
  }
  
  // 短字符串，全部替换为星号
  if (plaintext.length > 8) {
    return plaintext.substring(0, 4) + '****';
  }
  
  return '****';
}

