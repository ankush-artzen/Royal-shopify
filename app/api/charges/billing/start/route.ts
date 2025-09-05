import "@shopify/shopify-api/adapters/node";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { findSessionsByShop } from "@/lib/db/session-storage";
import prisma from "@/lib/db/prisma-connect";

const API_VERSION = "2025-07";

export async function POST(req: NextRequest) {
  console.log("===== 🟢 Royalty Create Handler START =====");
  console.log("➡️ Incoming request URL:", req.url);

  let body: any = {};
  try {
    body = await req.json();
    console.log("📦 Parsed request body:", JSON.stringify(body, null, 2));
  } catch {
    console.warn("⚠️ No JSON body found, falling back to query params only");
  }

  try {
    const { name, price, cappedAmount, terms, test } = body;
    const url = new URL(req.url);
    const queryShop = url.searchParams.get("shop");
    const queryHost = url.searchParams.get("host");
    const bodyShop = body?.shop;

    console.log("🔎 Params extracted:", {
      bodyShop,
      queryShop,
      queryHost,
      name,
      price,
      cappedAmount,
      terms,
      test,
    });

    // Get cookie store
    const cookieStore = cookies();
    console.log("🍪 Cookie store keys:", Array.from(cookieStore.getAll()).map(c => c.name));

    // Resolve shop
    const shop = bodyShop || queryShop || cookieStore.get("shop")?.value;
    console.log("🏪 Resolved shop:", shop);

    if (!shop) {
      console.error("❌ No shop provided in body/query/cookie");
      return NextResponse.json({ error: "shop is required" }, { status: 400 });
    }

    // Resolve token
    const dbSessions = await findSessionsByShop(shop);
    console.log("🗄️ DB sessions:", dbSessions);
    let token =
      dbSessions?.[0]?.accessToken ||
      cookieStore.get("accessToken")?.value;
    console.log("🔑 Token source:", token ? "✅ Found" : "❌ Missing");

    if (!token) {
      return NextResponse.json(
        { error: "No access token available for shop" },
        { status: 401 }
      );
    }

    if (!name || price === undefined) {
      console.error("❌ Missing name/price:", { name, price });
      return NextResponse.json(
        { error: "name and price are required" },
        { status: 400 }
      );
    }

    // Ensure host param
    let hostParam = queryHost;
    if (!hostParam) {
      hostParam = Buffer.from(`${shop}/admin`, "utf8")
        .toString("base64")
        .replace(/=/g, "");
      console.log("ℹ️ Generated fallback host:", hostParam);
    }

    // Build Shopify payload
    const bodyPayload: any = {
      recurring_application_charge: {
        name,
        price,
        return_url: `${process.env.HOST?.replace(/\/$/, "")}/api/royality/callback?shop=${shop}&host=${hostParam}`,
        test: test ?? true,
      },
    };

    if (parseFloat(String(price)) === 0.0) {
      console.log("ℹ️ Free plan detected → cappedAmount + terms required");
      if (!cappedAmount || !terms) {
        console.error("❌ Missing cappedAmount/terms for free plan");
        return NextResponse.json(
          {
            error: "For price=0.00, cappedAmount and terms are required",
          },
          { status: 400 }
        );
      }
      bodyPayload.recurring_application_charge.capped_amount = cappedAmount;
      bodyPayload.recurring_application_charge.terms = terms;
    }

    console.log(
      "📤 Sending request to Shopify:",
      JSON.stringify(bodyPayload, null, 2)
    );

    // Call Shopify API
    const shopifyUrl = `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges.json`;
    console.log("🌐 Shopify API endpoint:", shopifyUrl);

    const resp = await fetch(shopifyUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    console.log("📡 Shopify response status:", resp.status);
    const data = await resp.json();
    console.log("📥 Shopify response JSON:", JSON.stringify(data, null, 2));

    if (!resp.ok) {
      console.error("❌ Shopify API returned error");
      return NextResponse.json(
        { error: "Shopify error", details: data },
        { status: resp.status }
      );
    }

    const rac = data?.recurring_application_charge;
    console.log("📊 Parsed RAC object:", rac);

    const confirmationUrl = rac?.confirmation_url;
    if (!confirmationUrl) {
      console.error("❌ Missing confirmation_url in response");
      return NextResponse.json(
        { error: "Missing confirmation_url from Shopify" },
        { status: 502 }
      );
    }

    console.log("✅ Charge created successfully:", confirmationUrl);

    // Save/Update subscription
    try {
      console.log("🗄️ Upserting subscription in DB for shop:", shop);
      const saved = await prisma.royaltySubscription.upsert({
        where: { shop },
        update: {
          chargeId: String(rac.id),
          planName: rac.name,
          cappedAmount: rac.capped_amount
            ? parseFloat(rac.capped_amount)
            : null,
          currency: rac.currency || "USD",
          status: rac.status,
          test: rac.test,
        },
        create: {
          shop,
          chargeId: String(rac.id),
          planName: rac.name,
          cappedAmount: rac.capped_amount
            ? parseFloat(rac.capped_amount)
            : null,
          currency: rac.currency || "USD",
          status: rac.status,
          test: rac.test,
        },
      });
      console.log("✅ Subscription saved in DB:", saved);
    } catch (dbErr) {
      console.error("💥 Failed to save subscription in DB:", dbErr);
    }

    console.log("===== 🟢 Royalty Create Handler END =====");
    return NextResponse.json({ confirmationUrl, rac });
  } catch (e: any) {
    console.error("💥 Unexpected error:", e?.message || e);
    console.error("🛑 Full error object:", e);
    console.log("===== 🔴 Royalty Create Handler CRASH =====");
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
