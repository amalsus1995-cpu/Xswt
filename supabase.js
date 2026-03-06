const SUPABASE_URL = "ضع_رابط_مشروعك_من_سبابيس_هنا";
const SUPABASE_ANON_KEY = "ضع_مفتاح_ANON_هنا";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// جلب المستخدم الحالي
async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data.user;
}

// جلب البروفايل
async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile error:", error.message);
    return null;
  }

  return data;
}

// جلب المحفظة
async function getMyWallet() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Wallet error:", error.message);
    return null;
  }

  return data;
}

// تسجيل خروج
async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
