import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma-connect";

export async function GET() {
    const shop = "karan-working.myshopify.com"; // replace with dynamic value if needed

  try {
    const topProduct = await prisma.royaltyOrder.aggregateRaw({
      pipeline: [
        { $match: { shop } },      // filter orders
        { $unwind: "$lineItem" },  // flatten line items
        {
          $group: {
            _id: "$lineItem.productId",          // group by productId
            totalOrdered: { $sum: "$lineItem.quantity" },
            lineItemExample: { $first: "$lineItem" }, // keep one lineItem for reference
          },
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "productroyalties",          // check actual collection name in MongoDB
            localField: "_id",
            foreignField: "productId",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            productId: "$_id",
            totalOrdered: 1,
            title: "$productDetails.title",
            image: "$productDetails.image",
            price: "$productDetails.price",
            Royality: "$productDetails.Royality",
            status: "$productDetails.status",
            shop: "$productDetails.shop",
          },
        },
      ],
    });

    return NextResponse.json(topProduct);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
