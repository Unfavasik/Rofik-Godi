import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  extractApkMetadata,
  formatApkBytes,
  parseBinaryAndroidManifest,
  parsePlainManifestXml,
  validateReleaseDraft,
} from './apkManifest';

function encodeAxmlStringPool(strings: string[], utf8 = false): Uint8Array {
  const encodedStrings = strings.map((str) => {
    if (utf8) {
      const utf8Bytes = new TextEncoder().encode(str);
      const out = new Uint8Array(2 + utf8Bytes.length + 1);
      out[0] = str.length & 0x7f;
      out[1] = utf8Bytes.length & 0x7f;
      out.set(utf8Bytes, 2);
      return out;
    }
    const out = new Uint8Array(2 + str.length * 2 + 2);
    const dv = new DataView(out.buffer);
    dv.setUint16(0, str.length, true);
    for (let i = 0; i < str.length; i++) {
      dv.setUint16(2 + i * 2, str.charCodeAt(i), true);
    }
    return out;
  });

  const offsetsSize = strings.length * 4;
  const stringsDataSize = encodedStrings.reduce((sum, item) => sum + item.length, 0);
  const paddedStringsDataSize = (stringsDataSize + 3) & ~3;
  const headerSize = 28;
  const stringsStart = headerSize + offsetsSize;
  const chunkSize = stringsStart + paddedStringsDataSize;

  const buf = new Uint8Array(chunkSize);
  const view = new DataView(buf.buffer);
  view.setUint16(0, 0x0001, true); // STRING_POOL
  view.setUint16(2, headerSize, true);
  view.setUint32(4, chunkSize, true);
  view.setUint32(8, strings.length, true);
  view.setUint32(12, 0, true); // styleCount
  view.setUint32(16, utf8 ? 0x0100 : 0, true); // flags
  view.setUint32(20, stringsStart, true);
  view.setUint32(24, 0, true); // stylesStart

  let dataCursor = 0;
  for (let i = 0; i < strings.length; i++) {
    view.setUint32(headerSize + i * 4, dataCursor, true);
    buf.set(encodedStrings[i], stringsStart + dataCursor);
    dataCursor += encodedStrings[i].length;
  }

  return buf;
}

function buildSyntheticBinaryManifest(options: {
  packageName: string;
  versionName: string;
  versionCode: number;
  utf8?: boolean;
}): Uint8Array {
  // Put versionName at index 0 deliberately to verify string pool index 0 works
  const strings = [
    options.versionName,
    'manifest',
    'package',
    options.packageName,
    'versionCode',
    'versionName',
    'uses-sdk',
    'minSdkVersion',
    'targetSdkVersion',
  ];
  const stringPool = encodeAxmlStringPool(strings, options.utf8 ?? false);

  const buildStartElement = (
    nameIdx: number,
    attrs: Array<{ nameIdx: number; rawValueIdx: number; valueType: number; valueData: number }>,
  ): Uint8Array => {
    const chunkSize = 36 + attrs.length * 20;
    const buf = new Uint8Array(chunkSize);
    const dv = new DataView(buf.buffer);
    dv.setUint16(0, 0x0102, true); // XML_START_ELEMENT
    dv.setUint16(2, 16, true); // headerSize
    dv.setUint32(4, chunkSize, true);
    dv.setUint32(8, 1, true); // line
    dv.setInt32(12, -1, true); // comment
    dv.setInt32(16, -1, true); // ns
    dv.setInt32(20, nameIdx, true);
    dv.setUint16(24, 20, true); // attrStart relative to chunkStart + 16
    dv.setUint16(26, 20, true); // attrSize
    dv.setUint16(28, attrs.length, true);

    attrs.forEach((attr, idx) => {
      const base = 36 + idx * 20;
      dv.setInt32(base, -1, true); // ns
      dv.setInt32(base + 4, attr.nameIdx, true);
      dv.setInt32(base + 8, attr.rawValueIdx, true);
      dv.setUint16(base + 12, 8, true); // valueSize
      buf[base + 14] = 0;
      buf[base + 15] = attr.valueType;
      dv.setInt32(base + 16, attr.valueData, true);
    });
    return buf;
  };

  const manifestEl = buildStartElement(1, [
    { nameIdx: 2, rawValueIdx: 3, valueType: 0x03, valueData: 3 }, // package
    { nameIdx: 4, rawValueIdx: -1, valueType: 0x10, valueData: options.versionCode }, // versionCode
    { nameIdx: 5, rawValueIdx: 0, valueType: 0x03, valueData: 0 }, // versionName at string index 0
  ]);

  const usesSdkEl = buildStartElement(6, [
    { nameIdx: 7, rawValueIdx: -1, valueType: 0x10, valueData: 24 },
    { nameIdx: 8, rawValueIdx: -1, valueType: 0x10, valueData: 35 },
  ]);

  const totalSize = 8 + stringPool.length + manifestEl.length + usesSdkEl.length;
  const out = new Uint8Array(totalSize);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, 0x0003, true); // CHUNK_XML
  dv.setUint16(2, 8, true);
  dv.setUint32(4, totalSize, true);

  let offset = 8;
  out.set(stringPool, offset);
  offset += stringPool.length;
  out.set(manifestEl, offset);
  offset += manifestEl.length;
  out.set(usesSdkEl, offset);
  return out;
}

test('parseBinaryAndroidManifest decodes UTF-16LE AXML including string pool index 0', () => {
  const axml = buildSyntheticBinaryManifest({
    packageName: 'com.rofikgodi.app',
    versionName: '1.1.59',
    versionCode: 61,
    utf8: false,
  });
  const parsed = parseBinaryAndroidManifest(axml);
  assert.deepEqual(parsed, {
    packageName: 'com.rofikgodi.app',
    versionName: '1.1.59',
    versionCode: 61,
    minSdkVersion: 24,
    targetSdkVersion: 35,
  });
});

test('parseBinaryAndroidManifest decodes UTF-8 AXML string pools', () => {
  const axml = buildSyntheticBinaryManifest({
    packageName: 'com.rofikgodi.app',
    versionName: '2.0.4',
    versionCode: 75,
    utf8: true,
  });
  const parsed = parseBinaryAndroidManifest(axml);
  assert.equal(parsed.versionName, '2.0.4');
  assert.equal(parsed.versionCode, 75);
  assert.equal(parsed.packageName, 'com.rofikgodi.app');
});

test('parsePlainManifestXml extracts manifest metadata from plain text XML', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
    <manifest package="com.rofikgodi.app" android:versionCode="64" android:versionName="1.2.0">
      <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="35" />
    </manifest>`;
  const parsed = parsePlainManifestXml(xml);
  assert.equal(parsed.versionName, '1.2.0');
  assert.equal(parsed.versionCode, 64);
  assert.equal(parsed.minSdkVersion, 24);
  assert.equal(parsed.targetSdkVersion, 35);
});

test('extractApkMetadata extracts AndroidManifest.xml from an APK zip blob using fast tail-slice', async () => {
  const zip = new JSZip();
  const axml = buildSyntheticBinaryManifest({
    packageName: 'com.rofikgodi.app',
    versionName: '1.1.62',
    versionCode: 62,
  });
  zip.file('AndroidManifest.xml', axml);
  zip.file('classes.dex', new Uint8Array(1024));
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const apkFile = new File([blob], 'rofik-godi-v1.1.62.apk', {
    type: 'application/vnd.android.package-archive',
  });

  const parsed = await extractApkMetadata(apkFile);
  assert.equal(parsed.versionName, '1.1.62');
  assert.equal(parsed.versionCode, 62);
  assert.equal(parsed.packageName, 'com.rofikgodi.app');
});

test('validateReleaseDraft enforces APK file, positive integer code, and higher-than-live check', () => {
  const goodFile = new File([new Uint8Array(1024)], 'app-release.apk');
  assert.equal(
    validateReleaseDraft({
      file: goodFile,
      versionName: '1.1.61',
      versionCode: '61',
      liveVersionCode: 60,
    }).valid,
    true,
  );

  const sameCode = validateReleaseDraft({
    file: goodFile,
    versionName: '1.1.60',
    versionCode: '60',
    liveVersionCode: 60,
  });
  assert.equal(sameCode.valid, false);
  assert.match(sameCode.reason || '', /higher than live version code 60/i);

  const badExt = new File([new Uint8Array(1024)], 'app-release.zip');
  assert.equal(
    validateReleaseDraft({
      file: badExt,
      versionName: '1.1.61',
      versionCode: '61',
      liveVersionCode: 60,
    }).valid,
    false,
  );

  assert.equal(formatApkBytes(19 * 1024 * 1024), '19.00 MB');
  assert.equal(formatApkBytes(512 * 1024), '512.0 KB');
});
