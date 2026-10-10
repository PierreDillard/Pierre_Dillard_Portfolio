import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { BlobError, BlobPreconditionFailedError, get, put } from '@vercel/blob';

const isStoragePreview = process.env.VERCEL_ENV === 'preview'
  && process.env.VERCEL_GIT_COMMIT_REF === 'dev/portfolio-storage';
const probeRun = process.env.STORAGE_PROBE_RUN;

if (!isStoragePreview || !probeRun) {
  console.log('[storage-proof] skipped: isolated preview probe is not enabled');
} else {
  assert.ok(process.env.BLOB_STORE_ID, 'Preview Blob store must be configured');
  assert.match(probeRun, /^[a-zA-Z0-9-]{1,64}$/, 'Invalid probe run marker');
  const documentPath = 'proof/persistence.json';
  const readDocument = async (pathname = documentPath) => {
    const response = await get(pathname, { access: 'private', useCache: false });
    if (!response) return null;
    assert.equal(response.statusCode, 200);
    return {
      document: JSON.parse(await new Response(response.stream).text()),
      etag: response.blob.etag,
      url: response.blob.url,
    };
  };
  const writeDocument = (document, expectedEtag) => put(documentPath, JSON.stringify(document), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    ...(expectedEtag ? { ifMatch: expectedEtag } : { allowOverwrite: false }),
  });

  const previous = await readDocument();
  const expectedPreviousRun = process.env.STORAGE_PROBE_EXPECT_PREVIOUS_RUN;
  if (expectedPreviousRun) {
    assert.ok(previous, 'Document must survive the previous deployment');
    assert.equal(previous.document.run, expectedPreviousRun);
  }
  console.log('[storage-proof] previous-document', JSON.stringify({
    exists: Boolean(previous),
    expectedRunMatched: expectedPreviousRun ? true : null,
  }));

  const baselineDocument = { schemaVersion: 1, run: probeRun, marker: randomUUID() };
  await writeDocument(baselineDocument, previous?.etag);
  const baseline = await readDocument();
  assert.ok(baseline);
  assert.deepEqual(baseline.document, baselineDocument);

  const snapshotPath = `proof/snapshots/${baselineDocument.marker}.json`;
  await put(snapshotPath, JSON.stringify(baselineDocument), {
    access: 'private', addRandomSuffix: false, allowOverwrite: false,
    contentType: 'application/json',
  });

  const competingWrites = await Promise.allSettled([
    writeDocument({ ...baselineDocument, candidate: 'first' }, baseline.etag),
    writeDocument({ ...baselineDocument, candidate: 'second' }, baseline.etag),
  ]);
  assert.equal(competingWrites.filter((result) => result.status === 'fulfilled').length, 1);
  const failedWrite = competingWrites.find((result) => result.status === 'rejected');
  assert.ok(failedWrite?.status === 'rejected');
  const isConcurrentConditionalConflict = failedWrite.reason instanceof BlobError
    && failedWrite.reason.message === 'Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.';
  assert.ok(failedWrite.reason instanceof BlobPreconditionFailedError || isConcurrentConditionalConflict,
    `Unexpected concurrent rejection: ${failedWrite.reason?.message}`);
  await assert.rejects(
    writeDocument({ ...baselineDocument, candidate: 'stale-retry' }, baseline.etag),
    BlobPreconditionFailedError,
  );

  const winningDocument = await readDocument();
  assert.ok(winningDocument);
  assert.ok(['first', 'second'].includes(winningDocument.document.candidate));
  const savedSnapshot = await readDocument(snapshotPath);
  assert.ok(savedSnapshot);
  assert.deepEqual(savedSnapshot.document, baselineDocument);
  await writeDocument(savedSnapshot.document, winningDocument.etag);
  const restored = await readDocument();
  assert.ok(restored);
  assert.deepEqual(restored.document, baselineDocument);

  const anonymousResponse = await fetch(restored.url, { cache: 'no-store', redirect: 'manual' });
  assert.ok([401, 403, 404].includes(anonymousResponse.status),
    `Private document must deny anonymous reads, got ${anonymousResponse.status}`);
  await anonymousResponse.body?.cancel();

  console.log('[storage-proof] passed', JSON.stringify({
    run: probeRun,
    persistentPreviousRunVerified: Boolean(expectedPreviousRun),
    concurrentWriteSuccesses: 1,
    staleWriteRejected: true,
    concurrentConditionalConflict: isConcurrentConditionalConflict,
    privateSnapshotVerified: true,
    restorationVerified: true,
    anonymousReadStatus: anonymousResponse.status,
  }));
}
