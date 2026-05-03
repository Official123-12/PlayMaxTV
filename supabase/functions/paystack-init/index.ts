import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

// Live secret key — stored server-side only
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_live_a9be345cef070ecdb866dac516648beda2b3742a";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userEmail = "";
    let userId = "";

    if (token) {
      const { data } = await supabaseClient.auth.getUser(token);
      userEmail = data.user?.email ?? "";
      userId = data.user?.id ?? "";
    }

    const body = await req.json();
    const { plan, amount, callbackUrl, email } = body;
    const payEmail = email || userEmail;

    if (!payEmail) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const amountKobo = Math.round(Number(amount) * 100);
    console.log(`Initializing Paystack: email=${payEmail}, plan=${plan}, amount=${amountKobo} kobo`);

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payEmail,
        amount: amountKobo,
        callback_url: callbackUrl || `${req.headers.get("origin") || "https://playmax.tv"}/premium?payment=success`,
        metadata: {
          plan,
          userId,
          custom_fields: [{ display_name: "Plan", variable_name: "plan", value: plan }],
        },
        channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
      }),
    });

    const paystackData = await paystackRes.json();
    console.log("Paystack response status:", paystackData.status, "message:", paystackData.message);

    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: `Paystack: ${paystackData.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("paystack-init error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
