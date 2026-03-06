const SUPABASE_URL = "https://icjgccpbijtfvumzcayl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljamdjY3BiaWp0ZnZ1bXpjYXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY4MzEsImV4cCI6MjA4ODMyMjgzMX0.xY1qyKncr8Hr35PiI_EiYFD9Sx20N-MWtq6sU6diAHM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.error("getCurrentUser error:", error.message);
      return null;
    }
    return data?.user || null;
  } catch (err) {
    console.error("getCurrentUser catch:", err);
    return null;
  }
}

async function getSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("getSession error:", error.message);
      return null;
    }
    return data?.session || null;
  } catch (err) {
    console.error("getSession catch:", err);
    return null;
  }
}

async function ensureLoggedIn() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("getMyProfile error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("getMyProfile catch:", err);
    return null;
  }
}

async function getMyWallet() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("getMyWallet error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("getMyWallet catch:", err);
    return null;
  }
}

async function getUserProfileByEmail(email) {
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      console.error("getUserProfileByEmail error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("getUserProfileByEmail catch:", err);
    return null;
  }
}

async function getWalletByUserId(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("getWalletByUserId error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("getWalletByUserId catch:", err);
    return null;
  }
}

async function logoutUser() {
  try {
    await supabaseClient.auth.signOut();
  } catch (err) {
    console.error("logoutUser catch:", err);
  } finally {
    window.location.href = "login.html";
  }
}

function money(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ar");
  } catch (err) {
    return value;
  }
}

function formatStatus(status) {
  const map = {
    pending: "قيد الانتظار",
    confirmed: "تم التأكيد",
    rejected: "مرفوض",
    approved: "مقبول",
    active: "مفعل",
    inactive: "غير مفعل",
    banned: "محظور",
    open: "مفتوح",
    closed: "مغلق",
    not_submitted: "غير مرسل"
  };
  return map[status] || status || "";
}

function getReferralLink(referralCode) {
  if (!referralCode) return "";
  const base = window.location.origin + window.location.pathname.replace(/[^/]+$/, "");
  return `${base}register.html?ref=${referralCode}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("copyText error:", err);
    return false;
  }
}

async function requireAdmin() {
  const user = await ensureLoggedIn();
  if (!user) return null;

  const profile = await getMyProfile();
  if (!profile || profile.role !== "admin") {
    alert("ليس لديك صلاحية الوصول");
    window.location.href = "index.html";
    return null;
  }

  return profile;
}

async function uploadToKycBucket(file, folderName = "file") {
  const user = await getCurrentUser();
  if (!user || !file) return null;

  const safeName = `${Date.now()}_${file.name}`.replace(/\s+/g, "_");
  const filePath = `${user.id}/${folderName}_${safeName}`;

  const { error } = await supabaseClient.storage
    .from("kyc-documents")
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error("uploadToKycBucket error:", error.message);
    throw error;
  }

  return filePath;
}

function getKycPublicUrl(path) {
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/kyc-documents/${path}`;
}

async function refreshReferralStatsForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: refs, error } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referrer_id", user.id);

    if (error) {
      console.error("refreshReferralStatsForCurrentUser error:", error.message);
      return;
    }

    const count = refs ? refs.length : 0;

    await supabaseClient
      .from("profiles")
      .update({
        referral_count: count,
        team_feature_unlocked: count >= 5
      })
      .eq("id", user.id);

  } catch (err) {
    console.error("refreshReferralStatsForCurrentUser catch:", err);
  }
}

async function addActivityFeed(userId, activityType, amount, displayText) {
  try {
    await supabaseClient.from("activity_feed").insert({
      user_id: userId,
      activity_type: activityType,
      amount: amount || 0,
      display_text: displayText,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("addActivityFeed catch:", err);
  }
}
