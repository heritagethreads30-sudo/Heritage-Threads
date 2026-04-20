async function bootAuthUi() {
  await (window.htReady || Promise.resolve());
  applyStoreBrand();
  if (typeof initEmailJS === "function") initEmailJS();

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const verifyForm = document.getElementById("verifyForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetForm = document.getElementById("resetForm");

  if (loginForm) loginForm.addEventListener("submit", loginUser);
  if (registerForm) registerForm.addEventListener("submit", registerUser);
  if (verifyForm) verifyForm.addEventListener("submit", verifyUserCode);
  if (forgotForm) forgotForm.addEventListener("submit", sendResetCode);
  if (resetForm) resetForm.addEventListener("submit", resetPasswordWithCode);

  const rememberedVerifyEmail = localStorage.getItem("ht_verify_email") || "";
  const verifyEmailInput = document.getElementById("verifyEmail");
  if (verifyEmailInput && rememberedVerifyEmail) {
    verifyEmailInput.value = rememberedVerifyEmail;
    verifyEmailInput.readOnly = true;
    const verifyMessage = document.querySelector(".auth-card .muted");
    if (verifyMessage) {
      verifyMessage.innerHTML = `A verification code has been sent to <strong>${rememberedVerifyEmail}</strong>.`;
    }
  }

  const rememberedResetEmail = localStorage.getItem("ht_reset_email") || "";
  const resetEmailInput = document.getElementById("resetEmail");
  if (resetEmailInput && rememberedResetEmail) resetEmailInput.value = rememberedResetEmail;
}

async function registerUser(e) {
  e.preventDefault();

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn ? btn.innerText : "Create Account";
  
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Please wait...";
  }

  const users = getUsers();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value.trim();
  const confirmPassword = document.getElementById("regConfirmPassword").value.trim();
  const firstName = document.getElementById("regFirstName").value.trim();
  const middleName = document.getElementById("regMiddleName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();

  if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
    showAlert("Fill all required fields.");
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert("Please enter a valid email address.");
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
    return;
  }

  if (users.find((u) => u.email === email)) {
    showAlert("That email already exists.");
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
    return;
  }

  if (password !== confirmPassword) {
    showAlert("Passwords do not match.");
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
    return;
  }

  const code = generateCode();
  const pending = getPendingVerifications().filter((x) => x.email !== email);

  pending.push({
    email,
    firstName,
    middleName,
    lastName,
    phone,
    password,
    code,
    createdAt: Date.now()
  });

  savePendingVerifications(pending);
  localStorage.setItem("ht_verify_email", email);

  const sent = await sendVerificationEmail(email, firstName, code);
  if (!sent.ok) {
    showAlert(sent.message || "Verification email failed.");
    if (btn) { btn.disabled = false; btn.innerText = originalText; }
    return;
  }

  if (btn) {
    btn.innerText = "Verification code sent...";
  }
  showAlert("Verification code sent.");
  setTimeout(() => {
    window.location.href = "verify.html";
  }, 500);
}

async function resendVerificationCode() {
  const emailInput = document.getElementById("verifyEmail");
  const email = (emailInput?.value || localStorage.getItem("ht_verify_email") || "").trim().toLowerCase();

  if (!email) {
    showAlert("Enter your email first.");
    return;
  }

  const pending = getPendingVerifications();
  const item = pending.find((x) => x.email === email);

  if (!item) {
    showAlert("No pending verification found for this email.");
    return;
  }

  item.code = generateCode();
  item.createdAt = Date.now();
  savePendingVerifications(pending);

  const sent = await sendVerificationEmail(email, item.firstName || "Customer", item.code);
  if (!sent.ok) {
    showAlert(sent.message || "Could not resend verification code.");
    return;
  }

  localStorage.setItem("ht_verify_email", email);
  showAlert("New verification code sent.");
}

function verifyUserCode(e) {
  e.preventDefault();

  const code = document.getElementById("verifyCode").value.trim();
  const emailFromPage = (document.getElementById("verifyEmail")?.value || "").trim().toLowerCase();
  const remembered = (localStorage.getItem("ht_verify_email") || "").trim().toLowerCase();
  const email = emailFromPage || remembered;

  if (!email) {
    showAlert("Enter the email you used to register.");
    return;
  }

  const pending = getPendingVerifications();
  const item = pending.find((x) => x.email === email && x.code === code);

  if (!item) {
    showAlert("Invalid verification code.");
    return;
  }

  const users = getUsers();
  const newUser = {
    id: generateId("user"),
    firstName: item.firstName,
    middleName: item.middleName,
    lastName: item.lastName,
    email: item.email,
    phone: item.phone,
    password: item.password,
    role: "customer",
    status: "active",
    verified: true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  savePendingVerifications(pending.filter((x) => !(x.email === email && x.code === code)));
  localStorage.removeItem("ht_verify_email");
  setCurrentUser(newUser);

  showAlert("Account verified successfully.");
  setTimeout(() => {
    window.location.href = "shop.html";
  }, 600);
}

function loginUser(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();
  const user = getUsers().find((u) => u.email === email && u.password === password);

  if (!user) {
    showAlert("Invalid email or password.");
    return;
  }

  if (user.status === "blocked") {
    showAlert("This account has been blocked.");
    return;
  }

  if (!user.verified) {
    localStorage.setItem("ht_verify_email", email);
    showAlert("Please verify your email first.");
    setTimeout(() => {
      window.location.href = "verify.html";
    }, 700);
    return;
  }

  setCurrentUser(user);
  showAlert("Login successful.");
  setTimeout(() => {
    window.location.href = user.role === "admin" ? "admin.html" : "shop.html";
  }, 500);
}

async function sendResetCode(e) {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
  const user = getUsers().find((u) => u.email === email);

  if (!user) {
    showAlert("No account found with that email.");
    return;
  }

  const code = generateCode();
  const pending = getPendingResets().filter((x) => x.email !== email);

  pending.push({
    email,
    code,
    createdAt: Date.now()
  });

  savePendingResets(pending);
  localStorage.setItem("ht_reset_email", email);

  const sent = await sendResetEmail(email, user.firstName || "Customer", code);
  if (!sent.ok) {
    showAlert(sent.message || "Reset email failed.");
    return;
  }

  showAlert("Reset code sent.");
  setTimeout(() => {
    window.location.href = "reset-password.html";
  }, 500);
}

async function resendResetCode() {
  const emailInput = document.getElementById("resetEmail");
  const email = (emailInput?.value || localStorage.getItem("ht_reset_email") || "").trim().toLowerCase();

  if (!email) {
    showAlert("Enter your email first.");
    return;
  }

  const user = getUsers().find((u) => u.email === email);
  if (!user) {
    showAlert("No account found with that email.");
    return;
  }

  const pending = getPendingResets();
  let item = pending.find((x) => x.email === email);

  if (!item) {
    item = { email, code: generateCode(), createdAt: Date.now() };
    pending.push(item);
  } else {
    item.code = generateCode();
    item.createdAt = Date.now();
  }

  savePendingResets(pending);
  localStorage.setItem("ht_reset_email", email);

  const sent = await sendResetEmail(email, user.firstName || "Customer", item.code);
  if (!sent.ok) {
    showAlert(sent.message || "Could not resend reset code.");
    return;
  }

  showAlert("New reset code sent.");
}

function resetPasswordWithCode(e) {
  e.preventDefault();

  const emailInput = document.getElementById("resetEmail").value.trim().toLowerCase();
  const remembered = (localStorage.getItem("ht_reset_email") || "").trim().toLowerCase();
  const email = emailInput || remembered;
  const code = document.getElementById("resetCode").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmNewPassword = document.getElementById("confirmNewPassword").value.trim();

  if (!email) {
    showAlert("Enter your email.");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showAlert("Passwords do not match.");
    return;
  }

  const pending = getPendingResets();
  const item = pending.find((x) => x.email === email && x.code === code);

  if (!item) {
    showAlert("Invalid reset code.");
    return;
  }

  const users = getUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    showAlert("User not found.");
    return;
  }

  user.password = newPassword;
  saveUsers(users);
  savePendingResets(pending.filter((x) => !(x.email === email && x.code === code)));
  localStorage.removeItem("ht_reset_email");

  showAlert("Password changed successfully.");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 600);
}
