#!/usr/bin/env node
/**
 * Seed Documentation Collection
 *
 * Creates/updates initial documentation in the `docs_docs_public` collection.
 * Uses Firebase Admin SDK with service account credentials.
 *
 * Usage:
 *   node scripts/seedDocs.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be written without actually writing
 *   --force    Overwrite content even if doc already exists
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Load service account credentials
const serviceAccountPath = join(
  rootDir,
  "vibe-together-d2159-firebase-adminsdk-fbsvc-920807cb5c.json"
);

/** @type {import("firebase-admin").ServiceAccount} */
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

// Collection name (namespaced for docs app, _public suffix for public read access)
const COLLECTION_NAME = "docs_docs_public";

/** @type {{ slug: string; title: string; category: string; order: number; published: boolean; content: string }[]} */
const SEED_DATA = [
  // ============================================
  // GETTING STARTED
  // ============================================
  {
    slug: "what-is-basebase",
    title: "What is Basebase?",
    category: "Getting Started",
    order: 0,
    published: true,
    content: `Basebase is a development and deployment platform for building real, interactive web apps that can read and write data from multiple sources—Salesforce, HubSpot, Google Sheets, Slack, Airtable, Stripe, and many more.

## How It Works

You build Basebase apps using AI coding assistants like **Claude Code** or **Cursor**. Describe what you want, and the AI generates the app code for you. The result isn't a mockup or prototype—it's a **real, working app** with:

- Interactive UI components
- Live data from your connected sources
- User authentication and permissions
- Instant deployment with shareable links

## What the Framework Handles

The Basebase framework takes care of the hard stuff so you can focus on your app logic:

- **Authentication** — Sign-in with Google, email/password, phone number
- **Data Integrations** — OAuth connections to 100+ third-party services
- **Security** — Firestore rules, user permissions, data isolation
- **UI Components** — Pre-built React components via Mantine
- **Deployment** — One-command publish to production
- **Hosting** — Your apps run on our infrastructure

## What You Can Build

Basebase is great for building workflows and tools for your team:

- **Dashboards** — Pull data from multiple sources into one view
- **Internal Tools** — Admin panels, approval workflows, data entry forms
- **Automations** — Scheduled tasks, triggered actions, data syncs
- **Customer-Facing Apps** — Portals, trackers, self-service tools

## The Development Flow

1. **Create an app** in the Basebase Gallery
2. **Connect your data sources** via OAuth integrations
3. **Build your app** using Cursor or Claude Code with the Basebase framework
4. **Test locally** with \`npm run dev\`
5. **Deploy instantly** with \`npm run app:commit <appId>\`
6. **Share the link** with your team

## This Documentation

These docs will show you how to:

- Set up your development environment
- Build and edit apps
- Connect to data sources
- Write server functions for automations
- Deploy and share your apps

Ready to start? Check out the [Quick Start Guide](/getting-started).
`,
  },
  {
    slug: "getting-started",
    title: "Quick Start Guide",
    category: "Getting Started",
    order: 1,
    published: true,
    content: `Welcome! This guide will walk you through creating your first Basebase app in under 10 minutes.

## Step 1: Create Your Account

1. Go to [www.basebase.com](https://www.basebase.com)
2. Click **"Get Started"** and sign in with your Google account
3. You'll land in the **Basebase Gallery**—your workspace for building apps

## Step 2: Explore the Gallery

The Gallery is where you create and manage all your apps. You'll see:

- **Your Apps** — All the apps you've created
- **Templates** — Pre-built apps you can customize
- **Integrations** — Connect your existing tools

## Step 3: Create Your First App

1. Click **"Create New App"** in the Gallery
2. Give your app a name (e.g., "Sales Dashboard")
3. Choose a template or start from scratch

### Using AI to Build

You can describe what you want to build, and our AI will help:

> "I want a dashboard that shows my HubSpot deals by stage, with total values and close dates"

The AI will generate a starting point that you can customize.

## Step 4: Connect Your Data

To pull in real data, you'll need to connect your apps:

1. Go to **Settings** → **Integrations**
2. Click on the app you want to connect (e.g., HubSpot)
3. Follow the OAuth flow to authorize access

Once connected, your data will automatically sync to Basebase.

## Step 5: Share Your App

When your app is ready:

1. Click **"Share"** in the top right
2. Copy the link or invite team members by email
3. Team members can view or edit based on permissions you set

## What's Next?

- [Build New App](/build-new-app) — Deep dive into app creation
- [Edit App](/edit-app) — Learn about customizing your apps
- [Server Functions](/server-functions) — Add powerful automations
- [OAuth Integrations](/oauth) — Connect more data sources

## Need Help?

If you get stuck, don't hesitate to reach out:

- **Email**: support@basebase.com
- **Slack Community**: [Join our Slack](https://basebase.com/community)
`,
  },

  // ============================================
  // BUILDING APPS
  // ============================================
  {
    slug: "build-new-app",
    title: "Build New App",
    category: "Building Apps",
    order: 0,
    published: true,
    content: `This guide covers everything you need to know about creating new apps in Basebase.

## Creating an App

From the Gallery, click **"Create New App"** to get started. You'll need to provide:

- **App Name** — A descriptive name (e.g., "Q4 Pipeline Tracker")
- **App ID** — A unique identifier used in URLs (auto-generated from name)
- **Description** — What the app does (helps you find it later)

## Starting Points

### 1. Start from Scratch

Best for unique use cases. You get a blank canvas with:
- A default data schema
- Basic UI components
- Authentication already configured

### 2. Use a Template

Templates are pre-built apps for common use cases:
- **Deal Tracker** — Track sales pipeline with stages and values
- **Expense Approvals** — Submit and approve expense requests
- **Team Directory** — Searchable employee directory
- **Project Board** — Kanban-style project management

Click **"Use Template"** and customize to your needs.

### 3. AI-Assisted Creation

Describe what you want to build in plain English:

> "Create an app that tracks marketing campaigns with budget, spend, leads generated, and ROI calculation"

The AI will:
1. Generate an appropriate data schema
2. Create initial UI components
3. Set up basic views and filters

You can refine by continuing the conversation:

> "Add a chart showing spend vs leads by month"

## App Structure

Every Basebase app has these parts:

### Data Schema

Defines what data your app stores. For example:

| Field | Type | Description |
|-------|------|-------------|
| name | Text | Campaign name |
| budget | Number | Allocated budget |
| spend | Number | Current spend |
| leads | Number | Leads generated |
| startDate | Date | Campaign start |

### Views

How your data is displayed:
- **Table** — Spreadsheet-like view
- **Cards** — Visual grid of items
- **Kanban** — Drag-and-drop board
- **Dashboard** — Charts and metrics
- **Form** — Data entry view

### Components

Building blocks you can add:
- Text and headings
- Buttons and actions
- Charts and graphs
- Filters and search
- Custom calculations

## Data Sources

Your app can use:

### Internal Data
Data stored directly in Basebase. Great for:
- New workflows you're creating
- Data that doesn't exist elsewhere
- Prototypes and experiments

### Connected Data
Data pulled from your integrations:
- HubSpot contacts and deals
- Salesforce opportunities
- Google Sheets rows
- Airtable records

### Hybrid
Combine both—pull data from external sources and enrich it with your own fields.

## Saving and Publishing

Changes are automatically saved as you work.

When you're ready to share:
1. Click **"Publish"** to make changes live
2. Share the app URL with your team
3. Team members see the latest published version

## Best Practices

### Start Simple
Build the minimal version first, then iterate. You can always add complexity later.

### Name Things Clearly
Use descriptive names for fields, views, and apps. Future you will thank present you.

### Test with Real Data
Connect real data sources early to make sure your app works with actual data volumes.

### Get Feedback
Share early with one or two users to get feedback before rolling out broadly.

## Next Steps

- [Edit App](/edit-app) — Customize and iterate on your apps
- [Server Functions](/server-functions) — Add automations and workflows
`,
  },
  {
    slug: "edit-app",
    title: "Edit App",
    category: "Building Apps",
    order: 1,
    published: true,
    content: `Learn how to customize and improve your Basebase apps.

## Accessing the Editor

1. Go to the **Gallery**
2. Click on the app you want to edit
3. Click **"Edit"** to enter edit mode

## The Edit Interface

The editor has three main areas:

### 1. Canvas (Center)
Your app preview. Click any element to select and edit it.

### 2. Component Panel (Left)
Drag components onto the canvas:
- **Layout** — Containers, grids, columns
- **Data** — Tables, forms, lists
- **Display** — Text, images, charts
- **Input** — Buttons, fields, dropdowns
- **Navigation** — Tabs, menus, links

### 3. Properties Panel (Right)
Configure the selected element:
- Data binding
- Styling options
- Behavior settings
- Visibility rules

## Editing Data Schema

To modify your data structure:

1. Click **"Schema"** in the toolbar
2. Add, remove, or modify fields
3. Set field types and validations

### Field Types

| Type | Use For |
|------|---------|
| Text | Names, descriptions, notes |
| Number | Amounts, quantities, scores |
| Date | Dates and timestamps |
| Boolean | Yes/no toggles |
| Select | Dropdown choices |
| Multi-select | Multiple choices |
| Reference | Link to other records |
| File | Attachments and uploads |

### Calculated Fields

Create fields that compute values automatically:

\`\`\`
ROI = (Revenue - Cost) / Cost * 100
\`\`\`

Calculated fields update automatically when source data changes.

## Customizing Views

### Table View

Configure columns, sorting, and filtering:
- Reorder columns by dragging headers
- Set default sort order
- Add column-level filters
- Enable inline editing

### Dashboard View

Add charts and metrics:
- Bar, line, and pie charts
- KPI cards with totals
- Date range selectors
- Comparison views

### Form View

Create data entry forms:
- Arrange fields in sections
- Add validation rules
- Set required fields
- Create conditional logic

## Styling Your App

### Theme Settings
Set global colors, fonts, and spacing in **Settings** → **Theme**

### Component Styling
Style individual components in the Properties panel:
- Background color
- Border and radius
- Padding and margin
- Font size and weight

### Responsive Design
Your app automatically adapts to different screen sizes. Preview on mobile by clicking the device toggle.

## Adding Interactions

### Button Actions

Configure what happens when users click:
- **Navigate** — Go to another view
- **Submit** — Save form data
- **Delete** — Remove a record
- **Custom** — Run a server function

### Conditional Visibility

Show/hide elements based on conditions:

> Show "Approve" button only when Status = "Pending"

### Filters and Search

Add interactive filtering:
- Text search across fields
- Dropdown filters
- Date range pickers
- Status toggles

## Working with Connected Data

### Refreshing Data
Connected data syncs automatically. Force a refresh with the sync button.

### Mapping Fields
When connecting external data, map source fields to your schema:

| External (HubSpot) | Your App |
|-------------------|----------|
| dealname | Name |
| amount | Value |
| closedate | Close Date |

### Handling Updates
Changes made in Basebase can sync back to the source (where supported).

## Version Control

### Drafts
Changes you make are saved as drafts until published.

### Publishing
Click **"Publish"** to make changes live for all users.

### Rollback
Made a mistake? Go to **Settings** → **Versions** to restore a previous version.

## Collaboration

### Co-editing
Multiple team members can edit simultaneously. Changes sync in real-time.

### Comments
Leave comments on specific elements for feedback.

### Change History
See who changed what and when in **Settings** → **Activity**.

## Tips for Success

### Use Descriptive Labels
Help users understand what each field means.

### Validate Input
Add validation rules to prevent bad data entry.

### Test Thoroughly
Preview your app and test all workflows before publishing.

### Iterate Based on Feedback
Share with users, gather feedback, and improve.

## Next Steps

- [Server Functions](/server-functions) — Add powerful automations
- [OAuth Integrations](/oauth) — Connect more data sources
`,
  },
  {
    slug: "server-functions",
    title: "Server Functions",
    category: "Building Apps",
    order: 2,
    published: true,
    content: `Server functions let you add powerful automations and custom logic to your Basebase apps.

## What Are Server Functions?

Server functions are pieces of code that run on Basebase servers, not in the browser. They're perfect for:

- **Automations** — Send emails, post to Slack, update CRMs
- **Integrations** — Connect to APIs that require server-side auth
- **Calculations** — Complex computations on large datasets
- **Scheduled Tasks** — Run jobs at specific times

## Built-in Functions

Basebase includes ready-to-use functions:

### Communication
- **Send Email** — Send emails via your connected email account
- **Post to Slack** — Send messages to Slack channels
- **Send SMS** — Text notifications via Twilio

### AI & Analysis
- **Ask AI** — Query GPT-4 or Claude for analysis
- **Summarize** — Get summaries of long text
- **Classify** — Categorize text automatically

### Data
- **Web Search** — Search the web and get results
- **Scrape Page** — Extract data from web pages
- **Transform Data** — Reshape and combine data

## Using Functions in Your App

### Button Trigger

Add a button that runs a function:

1. Add a Button component
2. Set action to "Run Function"
3. Select the function
4. Map parameters from your app data

Example: "Send Deal to Slack" button that posts deal details to your sales channel.

### Automatic Triggers

Run functions automatically when:
- A record is created
- A field value changes
- A condition is met
- A schedule fires

Example: Send a Slack notification whenever a deal moves to "Closed Won".

### Form Submission

Run a function when a form is submitted:

1. Create a form view
2. Set "On Submit" action
3. Select function and parameters

Example: When a support ticket is submitted, run AI classification and route to the right team.

## Creating Custom Functions

For advanced use cases, you can create custom functions.

### Function Structure

Every function receives:
- **params** — Input parameters from your app
- **context** — System capabilities (secrets, API access, etc.)

### Example: Custom Notification

\`\`\`javascript
module.exports = async function(params, context) {
  const { dealName, dealValue, ownerEmail } = params;
  
  // Send email notification
  await context.callFunction('sendEmail', {
    to: ownerEmail,
    subject: \`Deal Closed: \${dealName}\`,
    body: \`Congratulations! \${dealName} closed for $\${dealValue}\`
  });
  
  // Post to Slack
  await context.callFunction('postToSlack', {
    channel: '#sales-wins',
    message: \`🎉 \${dealName} closed for $\${dealValue}!\`
  });
  
  return { success: true };
};
\`\`\`

### Accessing Data

Functions can read and write your app's data:

\`\`\`javascript
// Read records
const deals = await context.firebase
  .collection('deals')
  .where('status', '==', 'open')
  .get();

// Update a record
await context.firebase
  .collection('deals')
  .doc(dealId)
  .update({ lastContacted: new Date() });
\`\`\`

### Using Secrets

Store sensitive values (API keys, passwords) securely:

\`\`\`javascript
const apiKey = await context.getSecret('MY_API_KEY');
\`\`\`

Set secrets in **Settings** → **Secrets**.

## Scheduled Functions

Run functions on a schedule:

1. Go to **Settings** → **Schedules**
2. Create a new schedule
3. Select the function
4. Set the cron expression

### Common Schedules

| Schedule | Cron | Description |
|----------|------|-------------|
| Hourly | \`0 * * * *\` | Every hour |
| Daily 9am | \`0 9 * * *\` | Every day at 9 AM |
| Weekly Monday | \`0 9 * * 1\` | Monday at 9 AM |
| Monthly | \`0 9 1 * *\` | 1st of month at 9 AM |

### Example Use Cases

- **Daily Sync** — Pull new data from external APIs
- **Weekly Report** — Generate and email summary reports
- **Hourly Check** — Monitor for conditions and alert

## Error Handling

### Retries
Functions automatically retry on failure (up to 3 times).

### Logging
View function logs in **Settings** → **Logs** to debug issues.

### Notifications
Get notified when functions fail in **Settings** → **Alerts**.

## Best Practices

### Keep Functions Focused
Each function should do one thing well. Compose multiple functions for complex workflows.

### Validate Inputs
Always check that required parameters are provided.

### Handle Errors Gracefully
Catch errors and return meaningful messages.

### Use Secrets for Sensitive Data
Never hardcode API keys or passwords.

### Test Thoroughly
Test functions with sample data before using in production.

## Limits

| Limit | Value |
|-------|-------|
| Execution time | 5 minutes |
| Memory | 256 MB |
| Concurrent executions | 10 |
| Daily invocations (free) | 10,000 |

## Next Steps

- [OAuth Integrations](/oauth) — Connect more data sources
- [Quick Start Guide](/getting-started) — Back to basics
`,
  },

  // ============================================
  // INTEGRATIONS
  // ============================================
  {
    slug: "oauth",
    title: "OAuth Integrations",
    category: "Integrations",
    order: 0,
    published: true,
    content: `Connect your existing business tools to pull data into Basebase and push updates back.

## How Integrations Work

Basebase uses **OAuth 2.0** to securely connect to your tools. This means:

- ✅ We never see or store your passwords
- ✅ You control exactly what access we have
- ✅ You can revoke access at any time
- ✅ Enterprise-grade security standards

## Available Integrations

### CRM & Sales
| Integration | Read | Write | Status |
|-------------|------|-------|--------|
| Salesforce | ✅ | ✅ | Live |
| HubSpot | ✅ | ✅ | Live |
| Pipedrive | ✅ | ✅ | Planned |
| Zoho CRM | ✅ | ✅ | Planned |

### Productivity
| Integration | Read | Write | Status |
|-------------|------|-------|--------|
| Google Sheets | ✅ | ✅ | Live |
| Airtable | ✅ | ✅ | Live |
| Notion | ✅ | 🔄 | Live |
| Google Calendar | ✅ | ✅ | Live |

### Communication
| Integration | Read | Write | Status |
|-------------|------|-------|--------|
| Slack | ✅ | ✅ | Live |
| Gmail | ✅ | ✅ | Live |
| Microsoft Teams | ✅ | ✅ | Planned |

### Developer Tools
| Integration | Read | Write | Status |
|-------------|------|-------|--------|
| GitHub | ✅ | 🔄 | Live |
| Linear | ✅ | ✅ | Planned |
| Jira | ✅ | ✅ | Planned |

### Payments
| Integration | Read | Write | Status |
|-------------|------|-------|--------|
| Stripe | ✅ | ❌ | Live |

## Connecting an Integration

1. Go to **Settings** → **Integrations**
2. Find the service you want to connect
3. Click **"Connect"**
4. You'll be redirected to the service's login page
5. Authorize Basebase to access your data
6. You're connected! Data will start syncing.

## Managing Connections

### Viewing Connection Status

In **Settings** → **Integrations**, each connection shows:
- **Status** — Connected, Disconnected, Error
- **Last Sync** — When data was last updated
- **Permissions** — What access was granted

### Refreshing Data

Data syncs automatically, but you can force a refresh:
1. Click on the integration
2. Click **"Sync Now"**

### Disconnecting

To remove an integration:
1. Go to **Settings** → **Integrations**
2. Click on the integration
3. Click **"Disconnect"**
4. Confirm the disconnection

**Note:** Disconnecting removes Basebase's access. Your data in the original service is unchanged.

## Using Connected Data

### In Views

When building views, you can select data from connected sources:

1. Add a Table or other data component
2. Click **"Select Data Source"**
3. Choose your integration
4. Select the data type (e.g., HubSpot Contacts)
5. Configure which fields to display

### In Functions

Server functions can read from and write to connected services:

\`\`\`javascript
// Read from HubSpot
const contacts = await context.callFunction('hubspotGetContacts', {
  filters: { lifecycle_stage: 'lead' }
});

// Update Salesforce
await context.callFunction('salesforceUpdateOpportunity', {
  id: opportunityId,
  stage: 'Closed Won'
});
\`\`\`

### Mapping Fields

When connecting external data, you may need to map fields:

| External Field | Basebase Field | Notes |
|---------------|----------------|-------|
| contact_name | Name | Direct mapping |
| deal_value | Amount | Rename for clarity |
| — | Score | Calculated field |

## Sync Settings

### Sync Frequency

Choose how often data syncs:
- **Real-time** — Updates as they happen (some integrations)
- **Hourly** — Every hour
- **Daily** — Once per day
- **Manual** — Only when you click sync

### Sync Direction

- **One-way Read** — Pull data from the service
- **One-way Write** — Push data to the service
- **Two-way** — Keep both in sync

### Conflict Resolution

When the same record is edited in both places:
- **Last Write Wins** — Most recent change takes precedence
- **Source Wins** — External service is authoritative
- **Basebase Wins** — Your app data is authoritative

## Troubleshooting

### "Connection Expired"

OAuth tokens expire periodically. To fix:
1. Go to **Settings** → **Integrations**
2. Click **"Reconnect"**
3. Re-authorize access

### "Permission Denied"

You may not have access to the data you're trying to sync:
- Check your permissions in the external service
- Ask your admin to grant access
- Reconnect with appropriate permissions

### "Rate Limited"

You're making too many requests:
- Reduce sync frequency
- Filter to only the data you need
- Contact support for higher limits

### "Data Not Appearing"

If synced data isn't showing:
1. Check the connection status
2. Try a manual sync
3. Verify field mappings
4. Check filters aren't excluding data

## Security & Privacy

### What We Access

We only access:
- Data you explicitly authorize
- With the minimum permissions needed
- Never more than you specify

### Data Storage

Connected data is stored securely:
- Encrypted at rest and in transit
- Isolated per customer
- Retained per your data retention settings

### Audit Logs

Track all integration activity in **Settings** → **Activity**:
- Who connected/disconnected
- What data was synced
- When changes were made

### Compliance

Basebase integrations are compliant with:
- SOC 2 Type II
- GDPR
- CCPA
- HIPAA (on request)

## Requesting New Integrations

Don't see the integration you need?

1. Go to **www.basebase.com/integrations**
2. Vote for existing requests or submit new ones
3. Popular requests get prioritized

## Next Steps

- [Getting Started](/getting-started) — Build your first app
- [Server Functions](/server-functions) — Automate with connected data
`,
  },
];

/**
 * @param {{ dryRun: boolean; force: boolean }} options
 */
async function seedDocs({ dryRun, force }) {
  console.log(chalk.cyan(`\n📚 Seeding ${COLLECTION_NAME} collection...\n`));

  if (dryRun) {
    console.log(chalk.yellow("🔍 DRY RUN — no changes will be written\n"));
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of SEED_DATA) {
    // Query by slug to find existing doc
    const querySnapshot = await db
      .collection(COLLECTION_NAME)
      .where("slug", "==", doc.slug)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.log(chalk.green(`  ➕ CREATE: ${doc.title} (${doc.slug})`));
      created += 1;

      if (!dryRun) {
        await db.collection(COLLECTION_NAME).add({
          slug: doc.slug,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          order: doc.order,
          published: doc.published,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: "admin-script",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "admin-script",
        });
      }
      continue;
    }

    // Document exists
    const existingDoc = querySnapshot.docs[0];
    const existingData = existingDoc.data();

    if (force) {
      console.log(chalk.blue(`  🔄 UPDATE: ${doc.title} (${doc.slug})`));
      updated += 1;

      if (!dryRun) {
        await existingDoc.ref.update({
          title: doc.title,
          content: doc.content,
          category: doc.category,
          order: doc.order,
          published: doc.published,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "admin-script",
        });
      }
    } else {
      // Check if we need to update anything
      const needsUpdate =
        existingData.title !== doc.title ||
        existingData.category !== doc.category ||
        existingData.order !== doc.order ||
        existingData.published !== doc.published ||
        (existingData.content || "").trim() === "";

      if (needsUpdate) {
        console.log(
          chalk.blue(`  🔄 UPDATE (metadata): ${doc.title} (${doc.slug})`)
        );
        updated += 1;

        if (!dryRun) {
          /** @type {Record<string, unknown>} */
          const patch = {
            title: doc.title,
            category: doc.category,
            order: doc.order,
            published: doc.published,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: "admin-script",
          };

          // Only update content if it's empty
          if ((existingData.content || "").trim() === "") {
            patch.content = doc.content;
          }

          await existingDoc.ref.update(patch);
        }
      } else {
        console.log(chalk.gray(`  ⏭️  SKIP:   ${doc.title} (${doc.slug})`));
        skipped += 1;
      }
    }
  }

  console.log(chalk.cyan("\n─".repeat(40)));
  console.log(
    chalk.white(
      `\n✅ Done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}\n`
    )
  );

  if (dryRun) {
    console.log(chalk.yellow("Re-run without --dry-run to apply changes.\n"));
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

// Main
(async () => {
  try {
    await seedDocs({ dryRun, force });
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
})();
