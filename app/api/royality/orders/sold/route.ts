// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma-connect";

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const shop = searchParams.get("shop");

//     if (!shop) {
//       return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
//     }

//     const last30Days = new Date();
//     last30Days.setDate(last30Days.getDate() - 30);

//     // Get all products for this shop
//     const products = await prisma.productRoyalty.findMany({
//       where: { shop },
//       select: {
//         productId: true,
//         title: true,
//         image: true,
//         price: true,
//         status: true,
//         Royality: true,
//       },
//     });

//     // Get all royalty orders (with line items)
//     const orders = await prisma.royaltyOrder.findMany({
//       where: { shop },
//       select: {
//         createdAt: true,
//         lineItem: true,
//       },
//     });

//     // Aggregate per product
//     const productStats = products.map((p) => {
//       let unitSold = 0;
//       let totalSale = 0;
//       let totalRoyalty = 0;
//       let last30DaysRoyalty = 0;

//       orders.forEach((order) => {
//         order.lineItem.forEach((li) => {
//           if (li.productId === p.productId) {
//             unitSold += li.quantity;
//             totalSale += li.unitPrice * li.quantity;
//             totalRoyalty += li.productRoyalityCalculatedAmount;

//             if (order.createdAt >= last30Days) {
//               last30DaysRoyalty += li.productRoyalityCalculatedAmount;
//             }
//           }
//         });
//       });

//       return {
//         productId: p.productId,
//         title: p.title,
//         image: p.image,
//         mrpOriginal: p.price,
//         unitSold,
//         totalSale,
//         totalRoyalty,
//         royaltyPercentage: p.Royality,
//         status: p.status,
//         last30DaysRoyalty,
//       };
//     });

//     return NextResponse.json({
//       shop,
//       products: productStats,
//       totalProducts: productStats.length,
//     });
//   } catch (error) {
//     console.error("Error fetching product royalty stats:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch all royalty orders with line items
    const orders = await prisma.royaltyOrder.findMany({
      where: { shop },
      select: {
        createdAt: true,
        lineItem: true,
      },
    });

    // Aggregate product stats
    const productMap: Record<string, any> = {};

    orders.forEach((order) => {
      order.lineItem.forEach((li) => {
        if (!productMap[li.productId]) {
          productMap[li.productId] = {
            productId: li.productId,
            title: li.title,
            variantId: li.variantId,
            variantTitle: li.variantTitle,
            unitSold: 0,
            totalSale: 0,
            totalRoyalty: 0,
            royaltyPercentage: li.royaltypercentage,
            last30DaysRoyalty: 0,
          };
        }

        productMap[li.productId].unitSold += li.quantity;
        productMap[li.productId].totalSale += li.unitPrice * li.quantity;
        productMap[li.productId].totalRoyalty += li.productRoyalityCalculatedAmount;

        if (order.createdAt >= last30Days) {
          productMap[li.productId].last30DaysRoyalty += li.productRoyalityCalculatedAmount;
        }
      });
    });

    const products = Object.values(productMap);

    return NextResponse.json({
      shop,
      products,
      totalProducts: products.length,
    });
  } catch (error) {
    console.error("Error fetching product royalty stats from orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
