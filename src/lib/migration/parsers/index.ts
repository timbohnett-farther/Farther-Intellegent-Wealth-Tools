/**
 * Parser Registry Initialization
 *
 * Registers all available CRM parsers with the global registry.
 */

import { parserRegistry } from "./base-parser";
import { WealthboxParser } from "./wealthbox-parser";
import { RedtailParser } from "./redtail-parser";
import { CommonwealthParser } from "./commonwealth-parser";
import { SalesforceParser } from "./salesforce-parser";
import { AdvizonParser } from "./advizon-parser";

// Register all parsers
parserRegistry.register(new WealthboxParser());
parserRegistry.register(new RedtailParser());
parserRegistry.register(new CommonwealthParser());
parserRegistry.register(new SalesforceParser());
parserRegistry.register(new AdvizonParser());

// Export registry for use in API routes
export { parserRegistry };
export * from "./base-parser";
export { WealthboxParser } from "./wealthbox-parser";
export { RedtailParser } from "./redtail-parser";
export { CommonwealthParser } from "./commonwealth-parser";
export { SalesforceParser } from "./salesforce-parser";
export { AdvizonParser } from "./advizon-parser";
