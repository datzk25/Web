import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const body = await req.json()
    console.log("SePay webhook received:", JSON.stringify(body))

    // SePay webhook format: { id, gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, accumulated, subAccount, referenceCode, description }
    const {
      content,
      transferAmount,
      transferType,
      accountNumber,
      referenceCode,
    } = body

    if (!content || !transferAmount || transferType !== "in") {
      return new Response(
        JSON.stringify({ success: false, message: "Not a credit transaction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Find transaction code in content (format: DH + 9 digits)
    const txCodeMatch = content.match(/DH\d{9}/i)
    if (!txCodeMatch) {
      return new Response(
        JSON.stringify({ success: false, message: "No transaction code found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const txCode = txCodeMatch[0].toUpperCase()
    console.log("Found transaction code:", txCode)

    // Find pending deposit
    const { data: deposit, error: findErr } = await supabase
      .from("deposit_transactions")
      .select("*")
      .eq("transaction_code", txCode)
      .eq("status", "pending")
      .maybeSingle()

    if (findErr || !deposit) {
      console.log("Deposit not found or already processed:", txCode)
      return new Response(
        JSON.stringify({ success: false, message: "Transaction not found or already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check amount matches (allow small variance for bank fees)
    if (Math.abs(transferAmount - deposit.amount) > 1000) {
      console.log("Amount mismatch:", transferAmount, "expected:", deposit.amount)
      // Update with partial info but don't complete
      await supabase.from("deposit_transactions").update({
        webhook_data: body,
      }).eq("id", deposit.id)
      return new Response(
        JSON.stringify({ success: false, message: "Amount mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, balance")
      .eq("id", deposit.user_id)
      .single()

    if (profileErr || !profile) {
      console.error("User not found:", deposit.user_id)
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const newBalance = profile.balance + deposit.amount
    const now = new Date().toISOString()

    // Update user balance
    const { error: balanceErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", profile.id)

    if (balanceErr) {
      console.error("Balance update failed:", balanceErr)
      throw balanceErr
    }

    // Mark deposit as completed
    await supabase.from("deposit_transactions").update({
      status: "completed",
      completed_at: now,
      webhook_data: body,
    }).eq("id", deposit.id)

    // Create wallet transaction record
    await supabase.from("wallet_transactions").insert({
      user_id: profile.id,
      type: "deposit",
      amount: deposit.amount,
      balance_before: profile.balance,
      balance_after: newBalance,
      description: `Nạp tiền qua SePay: ${txCode}`,
      reference_id: deposit.id,
    })

    // Update site stats
    await supabase.rpc("increment_revenue", { amount: deposit.amount }).catch(() => {
      // RPC might not exist, use direct update as fallback
      return supabase.from("site_stats").update({
        total_revenue: supabase.from("site_stats").select("total_revenue").eq("id", 1),
      }).eq("id", 1)
    })

    // Create notification for user
    await supabase.from("notifications").insert({
      user_id: profile.id,
      title: "Nạp tiền thành công!",
      message: `Đã cộng ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(deposit.amount)} vào ví của bạn.`,
      type: "success",
    })

    console.log("Deposit processed successfully:", txCode, "Amount:", deposit.amount, "User:", profile.id)

    return new Response(
      JSON.stringify({ success: true, message: "Transaction processed", amount: deposit.amount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Webhook error:", message)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
