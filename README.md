# Transaction Reconciliation Engine

A production-grade reconciliation engine built with Bun and MongoDB to match crypto transactions across user and exchange exports.

## Setup

1. **Install Dependencies**:
   \`\`\`sh
   bun install
   \`\`\`

2. **Environment Variables**:
   Create a \`.env\` file with the following:
   \`\`\`env
   MONGODB_URI=mongodb://localhost:27017/recon_engine
   PORT=3000
   TIMESTAMP_TOLERANCE_SECONDS=300
   QUANTITY_TOLERANCE_PCT=0.01
   \`\`\`

3. **Run the Server**:
   \`\`\`sh
   bun run start
   \`\`\`

## API Endpoints

- \`POST /reconcile\`: Trigger reconciliation.
  - Request Body (Optional): \`{ "userFilePath": "...", "exchangeFilePath": "...", "timestampTolerance": 300, "quantityTolerance": 0.01 }\`
  - Default files used: \`data/user_transactions.csv\`, \`data/exchange_transactions.csv\`.
- \`GET /report/:runId\`: Download the full reconciliation report as CSV.
- \`GET /report/:runId/summary\`: Get counts of matched, conflicting, and unmatched transactions.
- \`GET /report/:runId/unmatched\`: Get a list of unmatched transactions.

## Key Design Decisions

### 1. Data Quality Handling
Instead of silently dropping "messy" data, we implement a two-stage ingestion. Every row is stored in MongoDB. If a row fails validation (e.g., invalid date or quantity), it is marked as \`INVALID\` with a specific \`invalidReason\`. This ensures full auditability and allows users to identify exactly why certain data was excluded from the matching process.

### 2. Matching Logic
The matching engine uses a multi-stage filter:
- **Asset Normalization**: Case-insensitive matching and alias resolution (e.g., "Bitcoin" $\rightarrow$ "BTC") via a mapping utility.
- **Perspective Mapping**: Handles the opposite nature of reports (User's \`TRANSFER_OUT\` is Exchange's \`TRANSFER_IN\`).
- **Tolerances**: Implements configurable time and quantity windows to account for discrepancies between different system clocks and rounding differences.
- **Optimal Match**: If multiple candidates satisfy the tolerances, the one with the minimum timestamp difference is selected to reduce false positives.

### 3. Performance and Scalability
- **Streaming Ingestion**: Uses \`csv-parser\` for streaming large files to avoid memory overflows.
- **MongoDB Indexing**: Uses a document-based store to efficiently query transactions by \`runId\` and \`source\`.
- **Asynchronous Processing**: The API is built on \`Bun.serve()\`, leveraging the fast Bun runtime for high-performance I/O.

## Example Workflow
1. Place CSV files in \`data/\`.
2. Call \`POST /reconcile\`.
3. Use the returned \`runId\` to fetch the summary and the final CSV report.
