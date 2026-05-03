import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_live_a9be345cef070ecdb866dac516648beda2b3742a";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, plan } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({ error: "Payment reference is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const verifyData = await verifyRes.json();
    console.log("Paystack verify:", verifyData.status, verifyData.data?.status);

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment not successful", details: verifyData.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const txData = verifyData.data;
    const userEmail = txData.customer?.email;
    const planName = plan || txData.metadata?.plan || "monthly";

    console.log(`Payment verified for ${userEmail}, plan: ${planName}`);

    // Activate premium in DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch user by email
    const { data: users } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("email", userEmail)
      .limit(1);

    const userId = users?.[0]?.id;

    if (userId) {
      const expiry = new Date();
      if (planName === "weekly") expiry.setDate(expiry.getDate() + 7);
      else if (planName === "monthly") expiry.setMonth(expiry.getMonth() + 1);
      else if (planName === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setMonth(expiry.getMonth() + 1);

      await supabaseAdmin
        .from("user_profiles")
        .update({
          is_premium: true,
          premium_plan: planName,
          premium_expiry: expiry.toISOString(),
        })
        .eq("id", userId);

      // Store proof record
      await supabaseAdmin.from("payment_proofs").insert({
        user_id: userId,
        plan: planName,
        amount: `₦${(txData.amount / 100).toLocaleString()}`,
        proof_url: `paystack:${reference}`,
        status: "approved",
        reviewed_at: new Date().toISOString(),
        notes: `Auto-approved. Ref: ${reference}`,
      });

      console.log(`Premium activated for user ${userId} until ${expiry.toISOString()}`);
    } else {
      console.warn("User not found for email:", userEmail);
    }

    return new Response(
      JSON.stringify({ success: true, plan: planName, amount: txData.amount / 100 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("paystack-verify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
