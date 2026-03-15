/**
 * Subcis audio compilation job.
 *
 * Steps:
 *  1. Load all approved assignments for the cycle (ordered by portion_order)
 *  2. Download each audio file from MinIO to a temp dir
 *  3. Concatenate with ffmpeg in order
 *  4. Upload compiled track back to MinIO
 *  5. Update cycle status → 'complete', set compiled_audio_url
 *  6. Push notification to all group members
 */

import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { db } from '../db/index.js';
import { subcisAssignments, subcisCycles, groupMemberships, notifications } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

const TMP_DIR = process.env.TMP_DIR ?? '/tmp/youssouf';

function s3Client() {
  return new S3Client({
    endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'minio'}:${process.env.MINIO_PORT ?? 9000}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'changeme',
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.MINIO_BUCKET ?? 'youssouf-audio';

async function downloadToFile(s3: S3Client, key: string, dest: string): Promise<void> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = res.Body as Readable;
  await new Promise<void>((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    body.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function uploadFile(s3: S3Client, key: string, filePath: string): Promise<void> {
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'audio/mp4',
  }));
}

function concatAudio(inputFiles: string[], outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const f of inputFiles) cmd.input(f);
    cmd
      .on('error', (err: Error) => reject(err))
      .on('end', () => resolve())
      .mergeToFile(outputFile, TMP_DIR);
  });
}

export async function compileSubcisCycle(cycleId: string): Promise<void> {
  const s3 = s3Client();
  const jobTmp = path.join(TMP_DIR, cycleId);
  fs.mkdirSync(jobTmp, { recursive: true });

  try {
    // 1. Load approved assignments in order
    const assignments = await db
      .select()
      .from(subcisAssignments)
      .where(and(eq(subcisAssignments.cycleId, cycleId), eq(subcisAssignments.status, 'approved')))
      .orderBy(subcisAssignments.portionOrder);

    if (assignments.length === 0) {
      throw new Error(`No approved assignments for cycle ${cycleId}`);
    }

    // 2. Download each clip
    const localFiles: string[] = [];
    for (const a of assignments) {
      if (!a.audioUrl) throw new Error(`Assignment ${a.id} has no audio URL`);
      const ext = path.extname(a.audioUrl) || '.m4a';
      const dest = path.join(jobTmp, `${a.portionOrder}${ext}`);
      await downloadToFile(s3, a.audioUrl, dest);
      localFiles.push(dest);
    }

    // 3. Concatenate
    const outputFile = path.join(jobTmp, 'compiled.m4a');
    await concatAudio(localFiles, outputFile);

    // 4. Upload compiled track
    const compiledKey = `subcis/${cycleId}/compiled.m4a`;
    await uploadFile(s3, compiledKey, outputFile);

    // 5. Update cycle record
    await db
      .update(subcisCycles)
      .set({ status: 'complete', compiledAudioUrl: compiledKey })
      .where(eq(subcisCycles.id, cycleId));

    // 6. Notify all group members
    const cycle = await db.select().from(subcisCycles).where(eq(subcisCycles.id, cycleId)).limit(1);
    if (cycle[0]) {
      const members = await db
        .select()
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, cycle[0].groupId));

      const notifRows = members.map((m) => ({
        id: randomUUID(),
        userId: m.userId,
        type: 'subcis_compiled' as const,
        title: 'Subcis compilation ready',
        body: 'The group revision track has been compiled. Tap to listen.',
        relatedId: cycleId,
        isRead: false,
        createdAt: new Date(),
      }));

      if (notifRows.length > 0) {
        await db.insert(notifications).values(notifRows as any);
      }
    }
  } finally {
    // Clean up temp files
    fs.rmSync(jobTmp, { recursive: true, force: true });
  }
}
