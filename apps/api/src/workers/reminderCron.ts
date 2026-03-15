/**
 * Daily reminder cron job.
 *
 * Runs once per day (scheduled by worker.ts via BullMQ repeat).
 * Finds users who have an active goal but haven't logged today,
 * and sends them a push notification via Expo Push API.
 */

import { db } from '../db/index.js';
import { users, memorizationGoals, progressLogs } from '../db/schema.js';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function sendDailyReminders(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Users with an active goal and a push token who haven't logged today
  const usersToRemind = await db
    .select({
      userId: users.id,
      pushToken: users.expoPushToken,
      displayName: users.displayName,
    })
    .from(users)
    .innerJoin(memorizationGoals, and(
      eq(memorizationGoals.userId, users.id),
      eq(memorizationGoals.isActive, true)
    ))
    .where(
      and(
        isNotNull(users.expoPushToken),
        sql`NOT EXISTS (
          SELECT 1 FROM ${progressLogs}
          WHERE ${progressLogs.userId} = ${users.id}
          AND ${progressLogs.logDate} = ${today}
        )`
      )
    );

  if (usersToRemind.length === 0) {
    console.log('[reminderCron] no users to remind today');
    return;
  }

  const messages = usersToRemind
    .filter((u) => u.pushToken && Expo.isExpoPushToken(u.pushToken))
    .map((u) => ({
      to: u.pushToken as string,
      sound: 'default' as const,
      title: 'Your daily hifz session',
      body: `Assalamu alaykum${u.displayName ? `, ${u.displayName}` : ''}. Don't forget to log your memorisation today.`,
      data: { screen: 'log' },
    }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      sent += chunk.length;
    } catch (err: any) {
      console.error('[reminderCron] push chunk failed:', err.message);
    }
  }

  console.log(`[reminderCron] sent ${sent} reminders`);
}
