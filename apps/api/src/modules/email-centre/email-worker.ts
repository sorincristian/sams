import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient() as any;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'mock_user',
    pass: process.env.SMTP_PASS || 'mock_pass'
  }
});

// Exact backoff ladder
const BACKOFF_MS = [
  1 * 60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000
];

export async function processOutboundEmails() {
  const BATCH_SIZE = 10;
  
  try {
    const unfulfilled = await prisma.outboundEmail.findMany({
      where: {
        status: "QUEUED" as any,
        attempts: { lt: 5 },
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
      include: { garage: { include: { emailProfile: true } } }
    });

    if (unfulfilled.length === 0) return;

    // Lock records
    const lockTime = new Date(Date.now() + 2 * 60 * 1000); // 2 min processing lock
    await prisma.outboundEmail.updateMany({
      where: { id: { in: unfulfilled.map((e: any) => e.id) } },
      data: { lockedUntil: lockTime, status: "SENDING" as any }
    });

    for (const email of unfulfilled) {
      const profile = email.garage?.emailProfile;
      try {
        const mailOptions: any = {
          from: profile ? `"${profile.fromName}" <${profile.fromEmail}>` : process.env.SMTP_FROM,
          to: email.to,
          subject: email.subject,
          html: email.bodyHtml,
        };
        if (email.cc) mailOptions.cc = email.cc;
        if (email.bcc) mailOptions.bcc = email.bcc;
        if (profile?.replyToEmail) mailOptions.replyTo = profile.replyToEmail;

        const info = await transporter.sendMail(mailOptions);
        const providerMessageId = info.messageId || 'MOCK_ID';

        await prisma.$transaction(async (tx: any) => {
          // Success Event
          await tx.emailAuditEvent.create({
            data: {
              emailId: email.id,
              status: "SENT" as any,
              message: "Sent via SMTP",
              providerResponse: JSON.stringify(info)
            }
          });

          // Update Email
          await tx.outboundEmail.update({
            where: { id: email.id },
            data: {
              status: "SENT" as any,
              providerMessageId,
              lockedUntil: null,
              attempts: email.attempts + 1
            }
          });

          console.info('EMAIL_SENT', { orderId: email.seatOrderId, emailId: email.id });

          // Sync with Order State Machine
          if (email.seatOrderId) {
            await tx.seatOrder.update({
              where: { id: email.seatOrderId },
              data: { status: "SENT" as any, sentAt: new Date() }
            });
          }
        });

      } catch (err: any) {
        const newAttempts = email.attempts + 1;
        const failedPermanently = newAttempts >= 5;
        
        const nextStatus = failedPermanently ? "FAILED" : "QUEUED";
        const backoffIndex = Math.min(newAttempts - 1, BACKOFF_MS.length - 1);
        const nextLock = failedPermanently ? null : new Date(Date.now() + BACKOFF_MS[backoffIndex]);

        await prisma.$transaction(async (tx: any) => {
          await tx.emailAuditEvent.create({
            data: {
              emailId: email.id,
              status: nextStatus as any,
              message: `Attempt ${newAttempts} failed: ${err.message}`,
              providerResponse: err.stack?.substring(0, 1000)
            }
          });

          await tx.outboundEmail.update({
            where: { id: email.id },
            data: {
              status: nextStatus as any,
              errorMessage: err.message,
              lockedUntil: nextLock,
              attempts: newAttempts
            }
          });
          
          console.error('EMAIL_FAILED', { emailId: email.id, error: err.message, attempts: newAttempts, failedPermanently });
        });
      }
    }

  } catch (error) {
    console.error("Critical error in email worker:", error);
  }
}
