"use client";

import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  Badge,
  BlockStack,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card padding="600" >
          {/* // background="avatar-bg-fill" */}
            <BlockStack gap="400" align="center">
              <Text variant="headingXl" as="h1" alignment="center">
                Welcome to Royalty App
              </Text>

              <Text
                as="p"
                variant="bodyLg"
                fontWeight="semibold"
                tone="subdued"
                alignment="center"
              >
                Effortlessly manage products, assign royalties, and track
                performance 
              </Text>

              
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h1" fontWeight="bold">
              Quick Insights
            </Text>
            <Card>
              <BlockStack gap="200">
                <Text as="p">
                  Products: <Badge tone="info">0</Badge>
                </Text>
                <Text as="p">
                  Total Royalties: <Badge tone="success">$0</Badge>
                </Text>
              </BlockStack>
            </Card>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h1" fontWeight="bold">
              Recent Activity
            </Text>
            <Card>
              <Text as="p" tone="subdued">
                No recent activity yet. Add a product to get started.
              </Text>
            </Card>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
