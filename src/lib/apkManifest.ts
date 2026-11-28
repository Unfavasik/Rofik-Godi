import JSZip from 'jszip';

export const MAX_APK_BYTES = 52_428_800; // 50 MB

export interface ParsedApkMetadata {
  packageName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
}

export interface ReleaseValidationResult {
  valid: boolean;
  reason: string | null;
  codeNumber: number;
  isHigherThanLive: boolean;
}

export function formatApkBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateApkFile(file: Pick<File, 'name' | 'size'> | null): string | null {
  if (!file) return 'Choose an Android .apk build to continue.';
  if (!/\.apk$/i.test(file.name)) return 'Only .apk files are supported.';
  if (file.size <= 0) return 'The selected APK file is empty.';
  if (file.size > MAX_APK_BYTES) {
    return `APK size (${formatApkBytes(file.size)}) exceeds the 50 MB Supabase limit.`;
  }
  return null;
}

export function validateReleaseDraft(params: {
  file: Pick<File, 'name' | 'size'> | null;
  versionName: string;
  versionCode: string;
  liveVersionCode: number;
}): ReleaseValidationResult {
  const codeNumber = Number(params.versionCode);
  const isIntegerCode = Number.isInteger(codeNumber) && codeNumber > 0;
  const isHigherThanLive = isIntegerCode && codeNumber > params.liveVersionCode;

  const fileError = validateApkFile(params.file);
  if (fileError) {
    return { valid: false, reason: fileError, codeNumber, isHigherThanLive };
  }
  if (!params.versionName.trim()) {
    return { valid: false, reason: 'Version name is required.', codeNumber, isHigherThanLive };
  }
  if (!isIntegerCode) {
    return { valid: false, reason: 'Version code must be a positive integer.', codeNumber, isHigherThanLive };
  }
  if (!isHigherThanLive) {
    return {
      valid: false,
      reason: `Version code ${codeNumber} must be higher than live version code ${params.liveVersionCode}.`,
      codeNumber,
      isHigherThanLive: false,
    };
  }
  return { valid: true, reason: null, codeNumber, isHigherThanLive: true };
}

const utf8Decoder = new TextDecoder('utf-8');
const utf16Decoder = new TextDecoder('utf-16le');

function readZipEntryFromTailSlice(
  blob: Blob,
): Promise<Uint8Array | null> {
  return (async () => {
    const tailSize = Math.min(blob.size, 66_000);
    if (tailSize < 22) return null;
    const tailStart = blob.size - tailSize;
    const tailBuf = await blob.slice(tailStart, blob.size).arrayBuffer();
    const tailView = new DataView(tailBuf);

    // Search backwards for End of Central Directory signature 0x06054b50
    let eocdOffset = -1;
    for (let i = tailBuf.byteLength - 22; i >= 0; i--) {
      if (tailView.getUint32(i, true) === 0x06054b50) {
        const commentLen = tailView.getUint16(i + 20, true);
        if (i + 22 + commentLen === tailBuf.byteLength) {
          eocdOffset = i;
          break;
        }
      }
    }
    if (eocdOffset < 0) return null;

    const cdSize = tailView.getUint32(eocdOffset + 12, true);
    const cdOffset = tailView.getUint32(eocdOffset + 16, true);
    if (cdOffset === 0xffffffff || cdSize === 0xffffffff || cdOffset + cdSize > blob.size) {
      return null; // ZIP64 or invalid offset -> let JSZip fallback handle it
    }

    const cdBuf = await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer();
    const cdView = new DataView(cdBuf);
    let cursor = 0;

    while (cursor + 46 <= cdBuf.byteLength) {
      if (cdView.getUint32(cursor, true) !== 0x02014b50) break;
      const compressionMethod = cdView.getUint16(cursor + 10, true);
      const compressedSize = cdView.getUint32(cursor + 20, true);
      const fileNameLen = cdView.getUint16(cursor + 28, true);
      const extraLen = cdView.getUint16(cursor + 30, true);
      const commentLen = cdView.getUint16(cursor + 32, true);
      const localHeaderOffset = cdView.getUint32(cursor + 42, true);

      const nameBytes = new Uint8Array(cdBuf, cursor + 46, fileNameLen);
      const fileName = utf8Decoder.decode(nameBytes);
      cursor += 46 + fileNameLen + extraLen + commentLen;

      if (fileName !== 'AndroidManifest.xml') continue;
      if (compressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) return null;

      // Read local file header (30 bytes) to find exact start of compressed data
      const lfhBuf = await blob.slice(localHeaderOffset, localHeaderOffset + 30).arrayBuffer();
      const lfhView = new DataView(lfhBuf);
      if (lfhView.getUint32(0, true) !== 0x04034b50) return null;
      const lfhNameLen = lfhView.getUint16(26, true);
      const lfhExtraLen = lfhView.getUint16(28, true);
      const dataStart = localHeaderOffset + 30 + lfhNameLen + lfhExtraLen;
      const payloadBuf = await blob.slice(dataStart, dataStart + compressedSize).arrayBuffer();
      const payload = new Uint8Array(payloadBuf);

      if (compressionMethod === 0) {
        return payload;
      }
      if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        const inflated = await new Response(stream).arrayBuffer();
        return new Uint8Array(inflated);
      }
      return null;
    }

    return null;
  })();
}

async function extractManifestBytes(file: Blob): Promise<Uint8Array> {
  try {
    const fastBytes = await readZipEntryFromTailSlice(file);
    if (fastBytes && fastBytes.byteLength >= 20) {
      return fastBytes;
    }
  } catch {
    // Fallback to JSZip below
  }

  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const manifestEntry = zip.file('AndroidManifest.xml');
  if (!manifestEntry) {
    throw new Error('APK does not contain AndroidManifest.xml');
  }
  const bytes = await manifestEntry.async('uint8array');
  if (bytes.byteLength < 20) {
    throw new Error('AndroidManifest.xml is invalid or truncated');
  }
  return bytes;
}

const CHUNK_STRING_POOL = 0x0001;
const CHUNK_XML = 0x0003;
const CHUNK_XML_START_NAMESPACE = 0x0100;
const CHUNK_XML_END_NAMESPACE = 0x0101;
const CHUNK_XML_START_ELEMENT = 0x0102;
const CHUNK_XML_END_ELEMENT = 0x0103;
const CHUNK_XML_CDATA = 0x0104;
const CHUNK_XML_RESOURCE_MAP = 0x0180;
const STRING_FLAG_UTF8 = 0x0100;

const TYPE_NULL = 0x00;
const TYPE_REFERENCE = 0x01;
const TYPE_STRING = 0x03;
const TYPE_INT_DEC = 0x10;
const TYPE_INT_HEX = 0x11;
const TYPE_INT_BOOLEAN = 0x12;

export function parsePlainManifestXml(xmlText: string): ParsedApkMetadata {
  const cleaned = xmlText.replace(/\0/g, '');
  const manifestTagMatch = cleaned.match(/<manifest\b([^>]*)>/i);
  if (!manifestTagMatch) {
    throw new Error('Manifest XML does not contain a <manifest> root element');
  }
  const attrs = manifestTagMatch[1];
  const getAttr = (pattern: RegExp) => attrs.match(pattern)?.[1]?.trim() ?? '';

  const packageName = getAttr(/\bpackage\s*=\s*["']([^"']+)["']/i);
  const versionName = getAttr(/\bandroid:versionName\s*=\s*["']([^"']+)["']/i);
  const rawCode = getAttr(/\bandroid:versionCode\s*=\s*["']([^"']+)["']/i);
  const versionCode = Number(rawCode);

  if (!versionName || !Number.isInteger(versionCode) || versionCode <= 0) {
    throw new Error('AndroidManifest.xml is missing versionName or versionCode');
  }

  const usesSdkMatch = cleaned.match(/<uses-sdk\b([^>]*)>/i)?.[1] ?? '';
  const minSdk = Number(usesSdkMatch.match(/\bandroid:minSdkVersion\s*=\s*["']([^"']+)["']/i)?.[1] ?? '');
  const targetSdk = Number(usesSdkMatch.match(/\bandroid:targetSdkVersion\s*=\s*["']([^"']+)["']/i)?.[1] ?? '');

  return {
    packageName,
    versionName,
    versionCode,
    ...(Number.isInteger(minSdk) && minSdk > 0 ? { minSdkVersion: minSdk } : {}),
    ...(Number.isInteger(targetSdk) && targetSdk > 0 ? { targetSdkVersion: targetSdk } : {}),
  };
}

export function parseBinaryAndroidManifest(bytes: Uint8Array): ParsedApkMetadata {
  if (bytes.byteLength < 8) {
    throw new Error('AndroidManifest.xml is too short');
  }

  // Check if plain text XML (ASCII or UTF-16LE)
  const asciiPrefix = utf8Decoder.decode(bytes.subarray(0, Math.min(64, bytes.byteLength)));
  if (asciiPrefix.includes('<manifest') || asciiPrefix.trimStart().startsWith('<?xml')) {
    return parsePlainManifestXml(utf8Decoder.decode(bytes));
  }
  const utf16Prefix = utf16Decoder.decode(bytes.subarray(0, Math.min(64, bytes.byteLength)));
  if (utf16Prefix.includes('<manifest') || utf16Prefix.trimStart().startsWith('<?xml')) {
    return parsePlainManifestXml(utf16Decoder.decode(bytes));
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rootType = view.getUint16(0, true);
  if (rootType !== CHUNK_XML) {
    throw new Error('Unsupported AndroidManifest.xml binary header');
  }

  const rootHeaderSize = view.getUint16(2, true);
  let cursor = rootHeaderSize;
  let strings: string[] = [];

  const readUtf8Length = () => {
    const first = bytes[cursor++];
    if (first & 0x80) {
      const second = bytes[cursor++];
      return ((first & 0x7f) << 8) | second;
    }
    return first;
  };

  const readUtf16Length = () => {
    const first = view.getUint16(cursor, true);
    cursor += 2;
    if (first & 0x8000) {
      const second = view.getUint16(cursor, true);
      cursor += 2;
      return ((first & 0x7fff) << 16) | second;
    }
    return first;
  };

  let packageName = '';
  let versionName = '';
  let versionCode: number | null = null;
  let versionCodeMajor: number | null = null;
  let minSdkVersion: number | undefined;
  let targetSdkVersion: number | undefined;

  while (cursor + 8 <= bytes.byteLength) {
    const chunkStart = cursor;
    const chunkType = view.getUint16(cursor, true);
    const headerSize = view.getUint16(cursor + 2, true);
    const chunkSize = view.getUint32(cursor + 4, true);
    if (chunkSize < 8 || chunkStart + chunkSize > bytes.byteLength) break;

    if (chunkType === CHUNK_STRING_POOL) {
      const stringCount = view.getUint32(chunkStart + 8, true);
      const flags = view.getUint32(chunkStart + 16, true);
      const stringsStart = view.getUint32(chunkStart + 20, true);
      const isUtf8 = (flags & STRING_FLAG_UTF8) !== 0;

      const offsets: number[] = [];
      const offsetTableStart = chunkStart + headerSize;
      for (let i = 0; i < stringCount; i++) {
        offsets.push(view.getUint32(offsetTableStart + i * 4, true));
      }

      const poolBase = chunkStart + stringsStart;
      strings = offsets.map((offset) => {
        cursor = poolBase + offset;
        if (cursor >= chunkStart + chunkSize) return '';
        if (isUtf8) {
          readUtf8Length(); // char length
          const byteLength = readUtf8Length();
          const sliceEnd = Math.min(chunkStart + chunkSize, cursor + byteLength);
          return utf8Decoder.decode(bytes.subarray(cursor, sliceEnd));
        }
        const charLength = readUtf16Length();
        const byteLength = charLength * 2;
        const sliceEnd = Math.min(chunkStart + chunkSize, cursor + byteLength);
        return utf16Decoder.decode(bytes.subarray(cursor, sliceEnd));
      });
    } else if (chunkType === CHUNK_XML_START_ELEMENT) {
      const attrOffsetBase = chunkStart + headerSize;
      // Start element payload: lineNumber(4), comment(4), ns(4), name(4), attrStart(2), attrSize(2), attrCount(2), ...
      const nameIdx = view.getInt32(chunkStart + 20, true);
      const elementName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : '';
      const attrStart = view.getUint16(chunkStart + 24, true);
      const attrSize = view.getUint16(chunkStart + 26, true);
      const attrCount = view.getUint16(chunkStart + 28, true);

      // attrStart is relative to chunkStart + 16 (start of ResXMLTree_attrExt)
      let attrCursor = Math.max(attrOffsetBase, chunkStart + 16 + attrStart);

      for (let i = 0; i < attrCount; i++) {
        if (attrCursor + 20 > chunkStart + chunkSize) break;
        const attrNameIdx = view.getInt32(attrCursor + 4, true);
        const attrRawValueIdx = view.getInt32(attrCursor + 8, true);
        const valueType = bytes[attrCursor + 15];
        const valueData = view.getInt32(attrCursor + 16, true);
        const valueDataUnsigned = view.getUint32(attrCursor + 16, true);

        const attrName = attrNameIdx >= 0 && attrNameIdx < strings.length ? strings[attrNameIdx] : '';

        let resolvedString = '';
        let resolvedNumber: number | null = null;

        if (valueType === TYPE_STRING) {
          const strIdx = valueData >= 0 ? valueData : attrRawValueIdx;
          if (strIdx >= 0 && strIdx < strings.length) {
            resolvedString = strings[strIdx];
            const parsed = Number(resolvedString);
            if (Number.isFinite(parsed)) resolvedNumber = parsed;
          }
        } else if (valueType === TYPE_INT_DEC || valueType === TYPE_INT_HEX) {
          resolvedNumber = valueData;
          resolvedString = String(valueData);
        } else if (valueType === TYPE_INT_BOOLEAN) {
          resolvedString = valueData !== 0 ? 'true' : 'false';
        } else if (valueType === TYPE_REFERENCE) {
          resolvedString = `resource:0x${valueDataUnsigned.toString(16)}`;
        } else if (valueType !== TYPE_NULL && attrRawValueIdx >= 0 && attrRawValueIdx < strings.length) {
          resolvedString = strings[attrRawValueIdx];
        }

        if (elementName === 'manifest') {
          if (attrName === 'package' && resolvedString) packageName = resolvedString;
          if (attrName === 'versionName' && resolvedString) versionName = resolvedString;
          if (attrName === 'versionCode' && resolvedNumber !== null) versionCode = resolvedNumber;
          if (attrName === 'versionCodeMajor' && resolvedNumber !== null) versionCodeMajor = resolvedNumber;
        } else if (elementName === 'uses-sdk') {
          if (attrName === 'minSdkVersion' && resolvedNumber !== null) minSdkVersion = resolvedNumber;
          if (attrName === 'targetSdkVersion' && resolvedNumber !== null) targetSdkVersion = resolvedNumber;
        }

        attrCursor += attrSize > 0 ? attrSize : 20;
      }
    } else if (
      chunkType !== CHUNK_XML_RESOURCE_MAP &&
      chunkType !== CHUNK_XML_START_NAMESPACE &&
      chunkType !== CHUNK_XML_END_NAMESPACE &&
      chunkType !== CHUNK_XML_END_ELEMENT &&
      chunkType !== CHUNK_XML_CDATA
    ) {
      // Skip unknown or NULL chunks safely via chunkSize
    }

    cursor = chunkStart + chunkSize;
  }

  let resolvedVersionCode = versionCode;
  if (resolvedVersionCode !== null && versionCodeMajor !== null && versionCodeMajor > 0) {
    resolvedVersionCode = versionCodeMajor * 0x1_0000_0000 + (resolvedVersionCode >>> 0);
  }

  if (!versionName || resolvedVersionCode === null || !Number.isInteger(resolvedVersionCode) || resolvedVersionCode <= 0) {
    throw new Error('APK manifest is missing versionName or versionCode');
  }

  return {
    packageName,
    versionName,
    versionCode: resolvedVersionCode,
    ...(minSdkVersion !== undefined ? { minSdkVersion } : {}),
    ...(targetSdkVersion !== undefined ? { targetSdkVersion } : {}),
  };
}

export async function extractApkMetadata(file: File): Promise<ParsedApkMetadata> {
  const fileError = validateApkFile(file);
  if (fileError) {
    throw new Error(fileError);
  }
  const manifestBytes = await extractManifestBytes(file);
  return parseBinaryAndroidManifest(manifestBytes);
}
