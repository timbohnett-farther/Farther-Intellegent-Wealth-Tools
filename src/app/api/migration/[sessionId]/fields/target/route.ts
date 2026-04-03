/**
 * GET /api/migration/[sessionId]/fields/target
 *
 * Fetch HubSpot properties for Contacts and Households.
 * In production, this would use the HubSpot API to fetch real properties.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

// Mock HubSpot Contact properties (in production, fetch from HubSpot API)
const MOCK_CONTACT_PROPERTIES: HubSpotProperty[] = [
  { name: "firstname", label: "First Name", type: "string", fieldType: "text" },
  { name: "lastname", label: "Last Name", type: "string", fieldType: "text" },
  { name: "email", label: "Email", type: "string", fieldType: "text", required: true },
  { name: "phone", label: "Phone Number", type: "string", fieldType: "text" },
  { name: "mobilephone", label: "Mobile Phone", type: "string", fieldType: "text" },
  { name: "company", label: "Company Name", type: "string", fieldType: "text" },
  { name: "jobtitle", label: "Job Title", type: "string", fieldType: "text" },
  { name: "address", label: "Street Address", type: "string", fieldType: "text" },
  { name: "city", label: "City", type: "string", fieldType: "text" },
  { name: "state", label: "State/Region", type: "string", fieldType: "text" },
  { name: "zip", label: "Postal Code", type: "string", fieldType: "text" },
  { name: "country", label: "Country", type: "string", fieldType: "text" },
  { name: "lifecyclestage", label: "Lifecycle Stage", type: "enumeration", fieldType: "select", options: ["subscriber", "lead", "marketingqualifiedlead", "salesqualifiedlead", "opportunity", "customer", "evangelist", "other"] },
  { name: "hs_lead_status", label: "Lead Status", type: "enumeration", fieldType: "select", options: ["NEW", "OPEN", "IN_PROGRESS", "OPEN_DEAL", "UNQUALIFIED", "ATTEMPTED_TO_CONTACT", "CONNECTED", "BAD_TIMING"] },
];

// Mock HubSpot Household (Custom Object) properties
const MOCK_HOUSEHOLD_PROPERTIES: HubSpotProperty[] = [
  { name: "name", label: "Household Name", type: "string", fieldType: "text", required: true },
  { name: "fh_primary_contact", label: "Primary Contact", type: "string", fieldType: "text" },
  { name: "fh_aum", label: "Assets Under Management", type: "number", fieldType: "number" },
  { name: "fh_tier", label: "Household Tier", type: "enumeration", fieldType: "select", options: ["Platinum", "Gold", "Silver", "Bronze", "Prospect"] },
  { name: "fh_primary_custodian", label: "Primary Custodian", type: "enumeration", fieldType: "select", options: ["Schwab", "Fidelity", "Pershing", "Other"] },
  { name: "fh_household_type", label: "Household Type", type: "enumeration", fieldType: "select", options: ["Individual", "Joint", "Trust", "Business", "Foundation"] },
  { name: "fh_relationship_start_date", label: "Relationship Start Date", type: "date", fieldType: "date" },
  { name: "fh_health_score", label: "Health Score", type: "enumeration", fieldType: "select", options: ["Excellent (85-100)", "Good (70-84)", "Fair (55-69)", "At Risk (35-54)", "Critical (0-34)", "Unknown"] },
  { name: "fh_strategic_value", label: "Strategic Value", type: "enumeration", fieldType: "select", options: ["Very High", "High", "Medium", "Low", "Unknown"] },
  { name: "fh_churn_risk", label: "Churn Risk", type: "enumeration", fieldType: "select", options: ["High Risk", "Medium Risk", "Low Risk", "Unknown"] },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || "CONTACT";

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // In production, fetch from HubSpot API
    // For now, return mock properties
    const properties = entityType === "CONTACT"
      ? MOCK_CONTACT_PROPERTIES
      : MOCK_HOUSEHOLD_PROPERTIES;

    return NextResponse.json({
      properties,
      entityType,
      source: "mock", // In production: "hubspot_api"
    });
  } catch (error) {
    console.error("Target fields fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch target fields",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
