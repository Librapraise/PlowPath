-- Up Migration
UPDATE organization_settings
SET settings = jsonb_set(
  settings,
  '{message_templates,email_overdue}',
  to_jsonb($$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OVERDUE ACCOUNT BALANCE INVOICE WARNING</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
    }
    .header-logo {
      color: #6366f1;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .header-logo span {
      color: #ffffff;
    }
    .content {
      padding: 32px;
    }
    .doc-meta {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #64748b;
      overflow: hidden;
    }
    .doc-meta-left {
      float: left;
    }
    .doc-meta-right {
      float: right;
    }
    .address-grid {
      width: 100%;
      margin-bottom: 24px;
      font-size: 13px;
      color: #475569;
      overflow: hidden;
    }
    .address-col-left {
      width: 48%;
      float: left;
    }
    .address-col-right {
      width: 48%;
      float: right;
      text-align: right;
    }
    .address-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .subject-line {
      font-weight: 700;
      border-left: 4px solid #ef4444;
      padding: 8px 12px;
      background-color: #fef2f2;
      color: #991b1b;
      font-size: 14px;
      margin-bottom: 20px;
      clear: both;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .summary-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .summary-card-left {
      width: 60%;
      float: left;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .summary-card-right {
      width: 38%;
      float: right;
      text-align: right;
    }
    .balance-amount {
      font-size: 24px;
      font-weight: 900;
      color: #e11d48;
    }
    .status-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 8px;
      background-color: #fecdd3;
      color: #e11d48;
      border-radius: 4px;
      margin-top: 4px;
    }
    .sign-off {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 13px;
      color: #475569;
      clear: both;
    }
    .footer {
      background-color: #f8fafc;
      padding: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Plow<span>Path</span></div>
    </div>
    <div class="content">
      <div class="doc-meta">
        <div class="doc-meta-left">Date: {{date}}</div>
        <div class="doc-meta-right">Ref: {{ref_code}}</div>
      </div>

      <div class="address-grid">
        <div class="address-col-left">
          <div class="address-title">To:</div>
          <div>{{customer_name}}</div>
          <div>{{customer_address}}</div>
        </div>
        <div class="address-col-right">
          <div class="address-title">From Operations Office:</div>
          <div>PlowPath Corporate HQ</div>
          <div>1200 Buffalo Blvd, Suite 400</div>
          <div>Buffalo, NY 14202</div>
        </div>
      </div>

      <div class="subject-line">
        Subject: OVERDUE ACCOUNT BALANCE INVOICE WARNING
      </div>

      <div class="body-text" style="clear: both; padding-top: 10px;">
        Dear {{customer_name}},
      </div>

      <div class="body-text">
        We are contacting you today regarding an outstanding overdue balance on your snow removal operations profile. Our records indicate that you have serviced plowing tasks with outstanding invoice allocations.
      </div>

      <div class="summary-card">
        <div class="summary-card-left">
          <div>Servicing Property: <strong>{{customer_address}}</strong></div>
          <div>Account Status: <span class="status-badge">{{payment_status}}</span></div>
        </div>
        <div class="summary-card-right">
          <div class="balance-amount">{{outstanding_balance}}</div>
          <div style="font-size: 10px; color: #64748b;">Gross outstanding amount</div>
        </div>
      </div>

      <div class="body-text">
        Please submit payment allocations immediately utilizing card, check, or online bank transfer methods to avoid further late penalties or temporary operational deactivation of service priorities ahead of the next snow storm.
      </div>

      <div class="body-text">
        Thank you for your prompt attention to this matter. If you have already processed this payment, please contact our dispatch operations team at (555) 000-0000.
      </div>

      <div class="sign-off">
        <p style="margin: 0 0 16px 0; font-weight: 600;">Sincerely,</p>
        <p style="margin: 0; font-weight: 700; color: #0f172a;">PlowPath Dispatch Operations Office</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Billing &amp; Customer Support Accounts Team</p>
      </div>
    </div>
    <div class="footer">
      This is an automated billing notification from PlowPath. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>$$::text),
  true
);

-- Down Migration
UPDATE organization_settings
SET settings = settings #- '{message_templates,email_overdue}';
