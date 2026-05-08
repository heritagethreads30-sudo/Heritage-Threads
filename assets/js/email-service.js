function initEmailJS() {
  try {
    if (
      window.emailjs &&
      window.EMAILJS_CONFIG &&
      window.EMAILJS_CONFIG.publicKey &&
      !window.EMAILJS_CONFIG.publicKey.includes("YOUR_")
    ) {
      emailjs.init(window.EMAILJS_CONFIG.publicKey);
      return true;
    }
  } catch (err) {
    console.error("EmailJS Init Error:", err);
  }
  return false;
}

function emailJsReady() {
  return !!(
    window.emailjs &&
    window.EMAILJS_CONFIG &&
    window.EMAILJS_CONFIG.publicKey &&
    !window.EMAILJS_CONFIG.publicKey.includes("YOUR_")
  );
}

async function sendVerificationEmail(email, firstName, code) {
  if (!emailJsReady()) {
    return { ok: false, message: "EmailJS is not configured yet." };
  }

  try {
    await emailjs.send(
      window.EMAILJS_CONFIG.serviceId || "service_njjway9",
      window.EMAILJS_CONFIG.verificationTemplateId || "template_1xv6o9x",
      {
        email: email,
        passcode: code,
        time: "5 minutes"
      },
      window.EMAILJS_CONFIG.publicKey || "58P-Ol9hKHrZENqP5"
    );
    return { ok: true };
  } catch (err) {
    console.error("EmailJS Error - sendVerificationEmail:", err);
    if (err && err.text) {
      console.error("EmailJS Error Details:", err.text);
    }
    return { ok: false, message: "Failed to send verification email. Please try again." };
  }
}

async function sendResetEmail(email, firstName, code) {
  if (!emailJsReady()) {
    return { ok: false, message: "EmailJS is not configured yet." };
  }

  try {
    await emailjs.send(
      window.EMAILJS_CONFIG.serviceId,
      window.EMAILJS_CONFIG.verificationTemplateId,
      {
        email: email,
        passcode: code,
        time: "5 minutes"
      }
    );
    return { ok: true };
  } catch (err) {
    console.error("EmailJS Error:", err);
    return { ok: false, message: "Failed to send reset email. Please try again." };
  }
}

async function sendContactEmail(payload) {
  if (!emailJsReady()) {
    return { ok: false, message: "EmailJS is not configured yet." };
  }

  try {
    await emailjs.send(
      window.EMAILJS_CONFIG.serviceId,
      window.EMAILJS_CONFIG.contactTemplateId,
      {
        name: payload.name,
        email: payload.email,
        message: payload.message,
      }
    );
    return { ok: true };
  } catch (err) {
    console.error("EmailJS Error:", err);
    return { ok: false, message: "Failed to send message. Please try again." };
  }
}
