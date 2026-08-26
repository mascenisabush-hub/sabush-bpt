// [Bug fix — both scan buttons spun at once regardless of which was
// clicked] Owner-reported: while a receipt is loading, whether taken
// by camera or uploaded, BOTH "Take Picture" and "Upload" buttons
// show the spinning loader, even though only one of them was actually
// clicked. Root cause: both buttons' spinner rendering read the same
// single `scanState === 'processing'` flag, with nothing recording
// which of the two input methods actually triggered the scan.
//
// Fix: a new `scanInputMethod` ref/state ('camera' | 'upload' | null)
// is set alongside `scanState` the moment a file is handed to
// handleFileSelected, and each button's spinner now additionally
// checks `scanInputMethod === '<its own method>'` — so only the
// button that was actually pressed animates. Both buttons remain
// `disabled` while a scan is in flight (a second scan really can't
// start mid-flight), just not both misleadingly spinning.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-scan-button-independent-spinner.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('AddStockView.tsx — camera and upload scan buttons animate independently', () => {
  it('scanInputMethod state is declared, distinct from scanState', () => {
    assert.match(
      addStockSrc,
      /const \[scanInputMethod, setScanInputMethod\] = useState<'camera' \| 'upload' \| null>\(null\);/
    );
  });

  it('handleFileSelected accepts a method parameter and records it into scanInputMethod at the start of a scan', () => {
    const start = addStockSrc.indexOf(
      "const handleFileSelected = async (file: File | undefined | null, method: 'camera' | 'upload') => {"
    );
    assert.notEqual(start, -1, 'handleFileSelected must take a method parameter');
    const nearby = addStockSrc.slice(start, start + 300);
    assert.match(nearby, /setScanState\('processing'\);\s*\n\s*setScanInputMethod\(method\);/);
  });

  it('the camera file input passes \'camera\' as the method', () => {
    const start = addStockSrc.indexOf('ref={cameraFileInputRef}');
    const end = addStockSrc.indexOf('ref={uploadFileInputRef}');
    const block = addStockSrc.slice(start, end);
    assert.match(block, /handleFileSelected\(file, 'camera'\)/);
  });

  it('the upload file input passes \'upload\' as the method', () => {
    const start = addStockSrc.indexOf('ref={uploadFileInputRef}');
    const end = addStockSrc.indexOf("onClick={() => cameraFileInputRef.current?.click()}");
    const block = addStockSrc.slice(start, end);
    assert.match(block, /handleFileSelected\(file, 'upload'\)/);
  });

  it('the "Take Picture" button only spins when scanInputMethod is \'camera\', not merely when scanState is processing', () => {
    const start = addStockSrc.indexOf("onClick={() => cameraFileInputRef.current?.click()}");
    const end = addStockSrc.indexOf('takePictureButton');
    const block = addStockSrc.slice(start, end);
    assert.match(block, /scanState === 'processing' && scanInputMethod === 'camera'/);
  });

  it('the "Upload" button only spins when scanInputMethod is \'upload\', not merely when scanState is processing', () => {
    const start = addStockSrc.indexOf("onClick={() => uploadFileInputRef.current?.click()}");
    const end = addStockSrc.indexOf('uploadButton');
    const block = addStockSrc.slice(start, end);
    assert.match(block, /scanState === 'processing' && scanInputMethod === 'upload'/);
  });

  it('both buttons remain disabled purely off scanState (unchanged) — a second scan still cannot start mid-flight even though only one button animates', () => {
    const disabledOccurrences = addStockSrc.match(/disabled=\{scanState === 'processing'\}/g) || [];
    assert.equal(disabledOccurrences.length, 2, 'Both the camera and upload buttons must still disable together while any scan is in flight.');
  });

  it('scanInputMethod is reset to null on every exit path from a scan: unreadable-file error, scan-service error, success, and explicit reject', () => {
    const resetCount = (addStockSrc.match(/setScanInputMethod\(null\);/g) || []).length;
    assert.equal(
      resetCount,
      4,
      'Expected exactly 4 reset sites: the unreadable-file catch, the scan-service failure branch, the success path, and handleRejectScan.'
    );
  });
});
