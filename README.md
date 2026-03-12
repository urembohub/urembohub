# Urembo Hub API

A comprehensive NestJS API for the Urembo Hub beauty services and e-commerce platform, migrated from Supabase with Prisma and PostgreSQL.

## Features Included

- **Multi-role User Management**: Client, Vendor, Retailer, Manufacturer, Admin roles
- **E-commerce**: Products, services, orders, and order management
- **Appointment System**: Service bookings with scheduling
- **Commission System**: Automated commission tracking and payments
- **Payment Processing**: Paystack integration for payments
- **Support System**: Tickets and conversations for customer support
- **Shipping Management**: Order tracking and delivery management
- **CMS**: Content management settings and configuration
- **Authentication**: JWT-based authentication with role-based access control

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: Class-validator and class-transformer
- **Environment**: ConfigModule for environment management

## Database Schema

The application includes the following main entities:

### Core Entities
- **Profiles**: User profiles with role-based access
- **Products**: E-commerce products from retailers/manufacturers
- **Services**: Beauty services from vendors
- **Orders**: Order management with items and appointments
- **Appointments**: Service booking system

### Business Logic
- **Commission Settings**: Configurable commission rates by role
- **Commission Transactions**: Real-time commission tracking
- **Payment Methods**: Stored payment methods for business users
- **Payment Provider Settings**: Multi-provider payment configuration

### Support & Management
- **Tickets**: Customer support ticket system
- **Ticket Categories**: Organized support categories
- **Staff Assignments**: Role-based staff permissions
- **Audit Logs**: Comprehensive audit trail

### Shipping & Tracking
- **Shipments**: Order delivery tracking
- **Shipment Status Updates**: Real-time delivery status
- **Delivery Partners**: Multiple delivery provider support

### CMS & Configuration
- **CMS Settings**: Dynamic content management
- **Admin Currency Settings**: Multi-currency support
- **Vendor Schedule Slots**: Dynamic appointment scheduling

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd urembo-hub-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/urembo_hub?schema=public"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   
   # Application
   PORT=3000
   NODE_ENV=development
   
   # External Services
   PAYSTACK_SECRET_KEY="your-paystack-secret-key"
   PAYSTACK_PUBLIC_KEY="your-paystack-public-key"
   RESEND_API_KEY="your-resend-api-key"
   
   # Email
   FROM_EMAIL="noreply@urembohub.com"
   FROM_NAME="Urembo Hub"
   ```

4. **Database Setup**:
   ```bash
   # Create the database (run this in your PostgreSQL client)
   CREATE DATABASE urembo_hub;
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Start the application**:
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run start:prod
   ```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile (protected)

### Users
- `GET /users` - Get all users (with pagination and filtering)
- `GET /users/:id` - Get user by ID
- `PUT /users/profile` - Update user profile (protected)
- `PATCH /users/:id/verify` - Verify user (admin only)
- `DELETE /users/:id` - Delete user (admin only)

### Products
- `GET /products` - Get all products (with pagination and filtering)
- `GET /products/:id` - Get product by ID
- `POST /products` - Create product (retailers/manufacturers only)
- `PUT /products/:id` - Update product (owner/admin only)
- `DELETE /products/:id` - Delete product (owner/admin only)
- `GET /products/my/products` - Get user's products (protected)

### Services
- `GET /services` - Get all services (with pagination and filtering)
- `GET /services/:id` - Get service by ID
- `POST /services` - Create service (vendors only)
- `PUT /services/:id` - Update service (owner/admin only)
- `DELETE /services/:id` - Delete service (owner/admin only)
- `GET /services/my/services` - Get user's services (protected)

### Orders
- `GET /orders` - Get all orders (with pagination and filtering)
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create order (guest users)
- `POST /orders/authenticated` - Create order (authenticated users)
- `PUT /orders/:id` - Update order (owner/admin/related business users)
- `GET /orders/my/orders` - Get user's orders (protected)

### Appointments
- `GET /appointments` - Get all appointments

### Payments
- `POST /payments/process` - Process payment

### Tickets
- `GET /tickets` - Get all tickets

### Commission
- `GET /commission/settings` - Get commission settings

### CMS
- `GET /cms/settings` - Get CMS settings

## Database Migration from Supabase

This NestJS application was created by analyzing the existing Supabase application and migrating the database schema and business logic. The migration includes:

1. **Schema Migration**: All tables, relationships, and constraints from Supabase
2. **Business Logic**: Core functionality from Supabase Edge Functions
3. **Authentication**: JWT-based auth replacing Supabase Auth
4. **API Structure**: RESTful endpoints matching Supabase API patterns

## Key Differences from Supabase

1. **Authentication**: Uses JWT instead of Supabase Auth
2. **Database Access**: Prisma ORM instead of direct Supabase client
3. **Serverless Functions**: NestJS controllers instead of Edge Functions
4. **Real-time**: No built-in real-time subscriptions (can be added with WebSockets)
5. **Storage**: No built-in file storage (can be integrated with AWS S3, etc.)

## Development

### Running in Development Mode
```bash
npm run start:dev
```

### Database Management
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Deploy migrations
npx prisma migrate deploy
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database**: Set up production PostgreSQL database
3. **Migrations**: Run `npx prisma migrate deploy`
4. **Build**: `npm run build`
5. **Start**: `npm run start:prod`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
