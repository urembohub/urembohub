/**
 * Enhanced Base Email Template
 * Matches the frontend design system with HSL colors and modern styling
 */

export interface BaseTemplateProps {
  title: string;
  preheader?: string;
  content: string;
  cta_button?: {
    text: string;
    url: string;
    style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  };
  variables?: {
    company_name?: string;
    support_email?: string;
    base_url?: string;
    logo_url?: string;
  };
  showFooter?: boolean;
  additionalStyles?: string;
}

export const generateBaseEmailHTML = ({
  title,
  preheader,
  content,
  cta_button,
  variables,
  showFooter = true,
  additionalStyles = ''
}: BaseTemplateProps): string => {
  const baseApiUrl = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000';
  const logoUrl = variables?.logo_url || `${baseApiUrl}/uploads/assets/logo.png`;
  const supportEmail = variables?.support_email || 'support@urembohub.com';
  const baseUrl = variables?.base_url || 'https://urembohub.com';
  const companyName = variables?.company_name || 'Urembo Hub';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  
  <style>
    /* Reset and base styles */
    body, table, td, p, a, li, blockquote { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    table, td { 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    img { 
      -ms-interpolation-mode: bicubic; 
      border: 0; 
      height: auto; 
      line-height: 100%; 
      outline: none; 
      text-decoration: none; 
    }
    table { 
      border-collapse: collapse !important; 
    }
    body { 
      height: 100% !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 100% !important; 
    }
    
    /* iOS BLUE LINKS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
    
    /* Design System Colors - Light Mode */
    :root {
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --title-blue: 215 25% 27%;
      --text-gray: 0 0% 25%;
      --price-red: 0 100% 48%;
      --hover-pink: 329 74% 43%;
      --footer-bg: 329 37% 71%;
    }
    
    /* Custom Button Styles */
    .btn-primary {
      background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(222.2, 47.4%, 15%) 100%);
      color: hsl(var(--primary-foreground));
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .btn-secondary {
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      border: 1px solid hsl(var(--border));
    }
    
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, hsl(var(--destructive)) 0%, #dc2626 100%);
      color: hsl(var(--destructive-foreground));
      border: none;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    
    /* Card Styles */
    .email-card {
      background: hsl(var(--background));
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    
    .header-gradient {
      background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(222.2, 47.4%, 15%) 100%);
    }
    
    .content-section {
      background: hsl(var(--background));
      border-radius: 8px;
      margin: 20px 0;
      padding: 24px;
      border: 1px solid hsl(var(--border));
    }
    
    .highlight-box {
      background: linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(210, 40%, 98%) 100%);
      border-left: 4px solid hsl(var(--primary));
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-success {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .status-info {
      background: #dbeafe;
      color: #1e40af;
    }
    
    /* Typography */
    .text-title {
      color: hsl(var(--title-blue));
      font-weight: 700;
      font-size: 28px;
      line-height: 1.2;
      margin: 0 0 16px 0;
    }
    
    .text-subtitle {
      color: hsl(var(--muted-foreground));
      font-size: 18px;
      font-weight: 500;
      line-height: 1.4;
      margin: 0 0 24px 0;
    }
    
    .text-body {
      color: hsl(var(--foreground));
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    
    .text-muted {
      color: hsl(var(--muted-foreground));
      font-size: 14px;
      line-height: 1.5;
    }
    
    .text-price {
      color: hsl(var(--price-red));
      font-weight: 700;
      font-size: 20px;
    }
    
    /* MOBILE STYLES */
    @media screen and (max-width: 600px) {
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-button { width: 100% !important; }
      .text-title { font-size: 24px !important; }
      .text-subtitle { font-size: 16px !important; }
      .content-section { padding: 16px !important; }
    }
    
    ${additionalStyles}
  </style>
</head>

<body style="background: linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(210, 40%, 98%) 100%); margin: 0; padding: 0; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
  ${preheader ? `
  <!-- Preheader text (hidden) -->
  <div style="display: none; font-size: 1px; color: hsl(var(--muted)); line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>` : ''}
  
  <!-- Main container -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email wrapper -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;" class="email-card">
          
          <!-- Header with gradient -->
          <tr>
            <td class="header-gradient" style="padding: 40px 40px 30px 40px; text-align: center;">
              <img src="${logoUrl}" alt="${companyName}" style="display: block; width: auto; max-width: 200px; height: auto; max-height: 60px; margin: 0 auto;">
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 class="text-title">
                ${title}
              </h1>
              
              <div class="text-body">
                ${content}
              </div>
              
              ${cta_button ? `
              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td align="left">
                    <a href="${cta_button.url}" style="
                      display: inline-block;
                      padding: 16px 32px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 16px;
                      transition: all 0.2s ease;
                    " class="btn-${cta_button.style || 'primary'} mobile-button">
                      ${cta_button.text}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          
          ${showFooter ? `
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: hsl(var(--muted)); border-top: 1px solid hsl(var(--border));">
              <table border="0" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p class="text-muted" style="margin: 0 0 16px 0;">
                      Best regards,<br>
                      <strong>The ${companyName} Team</strong>
                    </p>
                    <p class="text-muted" style="margin: 0 0 20px 0;">
                      Need help? Contact us at <a href="mailto:${supportEmail}" style="color: hsl(var(--primary)); text-decoration: none; font-weight: 500;">${supportEmail}</a>
                    </p>
                    <div style="border-top: 1px solid hsl(var(--border)); padding-top: 20px; margin-top: 20px;">
                      <p style="margin: 0; font-size: 12px; color: hsl(var(--muted-foreground));">
                        © ${new Date().getFullYear()} ${companyName}. All rights reserved.<br>
                        <a href="${baseUrl}/unsubscribe" style="color: hsl(var(--muted-foreground)); text-decoration: underline;">Unsubscribe</a> | 
                        <a href="${baseUrl}/privacy" style="color: hsl(var(--muted-foreground)); text-decoration: underline;">Privacy Policy</a> | 
                        <a href="${baseUrl}/terms" style="color: hsl(var(--muted-foreground)); text-decoration: underline;">Terms of Service</a>
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
