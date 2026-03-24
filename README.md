# 🔗 AWS URL Shortener

A fully serverless URL shortener with click analytics, built on AWS. Create short links instantly and track how many times each link has been clicked — no servers to manage.
## 🏗️ Architecture Diagram

![Architecture Diagram](https://github.com/Naveen15github/AWS-URL-Shortener/blob/3badf75f278b461745c55d219fc1a80555d1f1a7/Gemini_Generated_Image_f5tb3vf5tb3vf5tb.png)

---

## 📸 Screenshots

### Frontend — Create & Track Links
![URL Shortener Frontend](https://github.com/Naveen15github/AWS-URL-Shortener/blob/3badf75f278b461745c55d219fc1a80555d1f1a7/Screenshot%20(524).png)
> The S3-hosted frontend showing shortened links for YouTube, GitHub, Netflix, and Google with live click counts.

### DynamoDB — Items Table
![DynamoDB Items](https://github.com/Naveen15github/AWS-URL-Shortener/blob/3badf75f278b461745c55d219fc1a80555d1f1a7/Screenshot%20(525).png)
> All 4 links stored in DynamoDB with `code`, `click_count`, `created_at`, and `target_url` attributes.

### API Gateway — Routes
![API Gateway Routes](https://github.com/Naveen15github/AWS-URL-Shortener/blob/3badf75f278b461745c55d219fc1a80555d1f1a7/Screenshot%20(526).png)
> API Gateway configured with `$default` route pointing to the Lambda function.

---

## ✨ Features

- **Instant URL shortening** — paste any long URL and get a short code in milliseconds
- **Click analytics** — every redirect increments the click counter in DynamoDB
- **All links dashboard** — see all created links, their original URLs, click counts, and creation dates
- **Copy to clipboard** — one-click copy of any short link
- **Fully serverless** — no EC2, no servers, no maintenance
- **Pay-per-use** — costs near zero for low traffic (DynamoDB on-demand + Lambda free tier)

---

## 🛠️ Tech Stack

| Layer | Service | Purpose |
|---|---|---|
| Frontend | Amazon S3 (Static Website) | Hosts the HTML/CSS/JS frontend |
| API | Amazon API Gateway (HTTP API) | Routes POST /links, GET /admin/links, GET /{code} |
| Backend | AWS Lambda (Node.js 20.x) | Business logic — create links, redirect, list links |
| Database | Amazon DynamoDB | Stores links with click counts |
| IAM | AWS IAM Role | Grants Lambda permission to read/write DynamoDB |

---

## 📁 Project Structure

```
aws-url-shortener/
├── lambda/
│   ├── index.mjs          # Lambda handler (all routes)
│   ├── package.json       # Node.js dependencies
│   ├── node_modules/      # @aws-sdk/client-dynamodb, nanoid
│   └── function.zip       # Deployment package
├── index.html             # S3 frontend
├── ownership.json         # S3 bucket ownership config
├── publicaccess.json      # S3 public access config
└── README.md
```

---

## 🗄️ DynamoDB Schema

**Table name:** `links`

| Attribute | Type | Description |
|---|---|---|
| `code` | String (PK) | The short code, e.g. `0l6r50` |
| `target_url` | String | The original long URL |
| `created_at` | String | ISO timestamp of creation |
| `click_count` | Number | Number of times this link was visited |

---

## 🔌 API Endpoints

Base URL: `https://os81p4yzp7.execute-api.ap-south-1.amazonaws.com`

### POST `/links` — Create a short link

**Request:**
```json
{
  "url": "https://www.google.com"
}
```

**Response:**
```json
{
  "code": "0l6r50",
  "short_url": "https://os81p4yzp7.execute-api.ap-south-1.amazonaws.com/0l6r50"
}
```

---

### GET `/{code}` — Redirect to original URL

Visiting a short link (e.g. `/0l6r50`) redirects the browser to the original URL and increments `click_count` in DynamoDB.

---

### GET `/admin/links` — List all links

**Response:**
```json
[
  {
    "code": "0l6r50",
    "target_url": "https://www.google.com",
    "created_at": "2026-03-24T18:30:00Z",
    "click_count": 1
  }
]
```

---

## 🚀 Deployment Guide

### Prerequisites

- AWS CLI configured (`aws configure`)
- Node.js 18+ installed
- An AWS account with IAM permissions to create Lambda, DynamoDB, API Gateway, S3, and IAM roles

---

### Step 1 — Create DynamoDB Table

```powershell
aws dynamodb create-table `
  --table-name links `
  --attribute-definitions AttributeName=code,AttributeType=S `
  --key-schema AttributeName=code,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST
```

Wait for status to become `ACTIVE` before proceeding.

---

### Step 2 — Set Up Lambda Function

```powershell
# Navigate to lambda folder
cd lambda

# Install dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb nanoid

# Create deployment zip
Compress-Archive -Force -Path ".\index.mjs", ".\package.json", ".\node_modules" -DestinationPath ".\function.zip"
```

Create the Lambda function in AWS Console:
- Runtime: **Node.js 20.x**
- Handler: `index.handler`
- Upload `function.zip` as the deployment package

---

### Step 3 — Create IAM Role for Lambda

```powershell
# Create the role
aws iam create-role `
  --role-name lambda-dynamodb-role `
  --assume-role-policy-document '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}'

# Attach DynamoDB access
aws iam attach-role-policy `
  --role-name lambda-dynamodb-role `
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Attach basic Lambda execution (CloudWatch logs)
aws iam attach-role-policy `
  --role-name lambda-dynamodb-role `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Assign the role to your Lambda function
aws lambda update-function-configuration `
  --function-name url-shortener-handler `
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/lambda-dynamodb-role
```

---

### Step 4 — Create API Gateway

```powershell
aws apigatewayv2 create-api `
  --name url-shortener-api `
  --protocol-type HTTP `
  --target arn:aws:lambda:ap-south-1:<YOUR_ACCOUNT_ID>:function:url-shortener-handler
```

Grant API Gateway permission to invoke Lambda:

```powershell
aws lambda add-permission `
  --function-name url-shortener-handler `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:ap-south-1:<YOUR_ACCOUNT_ID>:<API_ID>/*"
```

---

### Step 5 — Deploy S3 Frontend

```powershell
# Create bucket
aws s3 mb s3://your-url-shortener-bucket

# Set ownership controls (save to file first to avoid PowerShell quoting issues)
'{"Rules":[{"ObjectOwnership":"ObjectWriter"}]}' | Out-File -FilePath ownership.json -Encoding ascii
'{"BlockPublicAcls":false,"IgnorePublicAcls":false,"BlockPublicPolicy":false,"RestrictPublicBuckets":false}' | Out-File -FilePath publicaccess.json -Encoding ascii

aws s3api put-bucket-ownership-controls --bucket your-url-shortener-bucket --ownership-controls file://ownership.json
aws s3api put-public-access-block --bucket your-url-shortener-bucket --public-access-block-configuration file://publicaccess.json

# Enable static website hosting
aws s3 website s3://your-url-shortener-bucket --index-document index.html

# Upload frontend
aws s3 cp index.html s3://your-url-shortener-bucket --acl public-read
```

Your site is live at:
```
http://your-url-shortener-bucket.s3-website.ap-south-1.amazonaws.com
```

---

## 🧪 Testing

### Test via PowerShell

**Create a short link:**
```powershell
Invoke-WebRequest -Uri "https://<API_ID>.execute-api.ap-south-1.amazonaws.com/links" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"url":"https://www.google.com"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected response:
```json
{"code":"abc123","short_url":"https://<API_ID>.execute-api.ap-south-1.amazonaws.com/abc123"}
```

**List all links:**
```powershell
Invoke-WebRequest -Uri "https://<API_ID>.execute-api.ap-south-1.amazonaws.com/admin/links" `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Test a redirect:**
Open in browser: `https://<API_ID>.execute-api.ap-south-1.amazonaws.com/abc123`

---

## ⚠️ Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `not authorized to perform: dynamodb:PutItem` | Lambda role missing DynamoDB policy | Attach `AmazonDynamoDBFullAccess` to the Lambda IAM role |
| `does not have scope` on `delete-role-permissions-boundary` | Auto-created role has restrictions | Create a fresh IAM role manually (Step 3 above) |
| `AccessControlListNotSupported` on S3 upload | ACLs not enabled on bucket | Run `put-bucket-ownership-controls` with `ObjectWriter` first |
| PowerShell JSON quoting errors | PowerShell escapes curly braces | Write JSON to a file using `Out-File`, then reference with `file://` |
| `Internal Server Error` from API | Lambda code error | Check CloudWatch logs: `aws logs get-log-events ...` |

---

## 💰 Cost Estimate

For a personal project with ~1,000 requests/month:

| Service | Cost |
|---|---|
| Lambda | Free (1M requests/month free tier) |
| DynamoDB | Free (25 GB + 25 WCU/RCU free tier) |
| API Gateway | ~$0.001 (1M requests = $1) |
| S3 | ~$0.00 (minimal storage) |
| **Total** | **~$0 / month** |

---

## 🔮 Possible Improvements

- [ ] Custom domain name via Route 53 + ACM (HTTPS)
- [ ] QR code generation for each short link
- [ ] Password-protected links
- [ ] Link expiry / TTL using DynamoDB TTL attribute
- [ ] CloudFront CDN in front of S3 for global performance
- [ ] Authentication for the admin dashboard

---

## 👤 Author

**Naveen G**
- Built: March 2026

---

## 📄 License

MIT License — free to use and modify.
