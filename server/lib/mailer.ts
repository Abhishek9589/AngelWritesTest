import nodemailer from "nodemailer";

function getEnv(name: string, optional = false): string | undefined {
  const v = process.env[name];
  if (!v && !optional) throw new Error(`${name} is not set`);
  return v;
}

export function createMailer() {
  const host = getEnv("SMTP_HOST")!;
  const port = Number(getEnv("SMTP_PORT") || 587);
  const user = getEnv("SMTP_USER")!;
  const pass = getEnv("SMTP_PASS")!;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    async sendOtp(to: string, code: string) {
      const from = getEnv("SMTP_USER")!;
      const info = await transporter.sendMail({
        from: `AngelWrites <${from}>`,
        to,
        subject: "Your AngelWrites verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your verification code is <strong style="font-size:18px">${code}</strong>.</p><p>This code expires in 10 minutes.</p>`
      });
      return info;
    },
    verify: () => transporter.verify(),
  };
}
