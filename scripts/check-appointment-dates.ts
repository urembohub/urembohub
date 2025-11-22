import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppointmentDates() {
  try {
    console.log('🔍 Checking appointment dates in database...\n');

    // Check regular appointments
    console.log('📅 Regular Appointments:');
    const regularAppointments = await prisma.appointment.findMany({
      take: 10,
      orderBy: { appointmentDate: 'desc' },
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        service: {
          select: {
            name: true,
          },
        },
        vendor: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (regularAppointments.length === 0) {
      console.log('  No regular appointments found.\n');
    } else {
      regularAppointments.forEach((apt) => {
        const date = apt.appointmentDate;
        const dateStr = date instanceof Date ? date.toISOString() : String(date);
        console.log(`  ID: ${apt.id}`);
        console.log(`  Service: ${apt.service?.name || 'N/A'}`);
        console.log(`  Vendor: ${apt.vendor?.fullName || 'N/A'}`);
        console.log(`  Status: ${apt.status}`);
        console.log(`  Raw Date: ${dateStr}`);
        console.log(`  Date Type: ${typeof date}`);
        console.log(`  Formatted: ${date instanceof Date ? date.toLocaleString() : new Date(dateStr).toLocaleString()}`);
        console.log(`  ISO String: ${date instanceof Date ? date.toISOString() : new Date(dateStr).toISOString()}`);
        console.log('  ---');
      });
    }

    // Check service appointments from orders
    console.log('\n📅 Service Appointments (from Orders):');
    const serviceAppointments = await prisma.serviceAppointment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        service: {
          select: {
            name: true,
          },
        },
        vendor: {
          select: {
            fullName: true,
          },
        },
        order: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    if (serviceAppointments.length === 0) {
      console.log('  No service appointments found.\n');
    } else {
      serviceAppointments.forEach((apt) => {
        const date = apt.appointmentDate;
        const dateStr = date instanceof Date ? date.toISOString() : String(date);
        console.log(`  ID: ${apt.id}`);
        console.log(`  Service: ${apt.service?.name || 'N/A'}`);
        console.log(`  Vendor: ${apt.vendor?.fullName || 'N/A'}`);
        console.log(`  Status: ${apt.status}`);
        console.log(`  Order ID: ${apt.order?.id || 'N/A'}`);
        console.log(`  Order Created: ${apt.order?.createdAt ? new Date(apt.order.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`  Raw Date: ${dateStr}`);
        console.log(`  Date Type: ${typeof date}`);
        console.log(`  Formatted: ${date instanceof Date ? date.toLocaleString() : new Date(dateStr).toLocaleString()}`);
        console.log(`  ISO String: ${date instanceof Date ? date.toISOString() : new Date(dateStr).toISOString()}`);
        console.log('  ---');
      });
    }

    // Check for dates in 2025
    console.log('\n🔍 Checking for dates in 2025...');
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: new Date('2025-01-01'),
        },
      },
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`  Found ${futureAppointments.length} regular appointments in 2025 or later`);
    if (futureAppointments.length > 0) {
      futureAppointments.forEach((apt) => {
        console.log(`    - ID: ${apt.id}, Date: ${apt.appointmentDate.toISOString()}, Service: ${apt.service?.name || 'N/A'}`);
      });
    }

    const futureServiceAppointments = await prisma.serviceAppointment.findMany({
      where: {
        appointmentDate: {
          gte: new Date('2025-01-01'),
        },
      },
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`  Found ${futureServiceAppointments.length} service appointments in 2025 or later`);
    if (futureServiceAppointments.length > 0) {
      futureServiceAppointments.forEach((apt) => {
        console.log(`    - ID: ${apt.id}, Date: ${apt.appointmentDate.toISOString()}, Service: ${apt.service?.name || 'N/A'}`);
      });
    }

    // Check current date range
    console.log('\n📊 Date Range Summary:');
    const allRegularDates = await prisma.appointment.findMany({
      select: {
        appointmentDate: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    if (allRegularDates.length > 0) {
      const dates = allRegularDates.map((apt) => apt.appointmentDate);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      console.log(`  Regular Appointments:`);
      console.log(`    Earliest: ${minDate instanceof Date ? minDate.toISOString() : new Date(minDate).toISOString()}`);
      console.log(`    Latest: ${maxDate instanceof Date ? maxDate.toISOString() : new Date(maxDate).toISOString()}`);
    }

    const allServiceDates = await prisma.serviceAppointment.findMany({
      select: {
        appointmentDate: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    if (allServiceDates.length > 0) {
      const dates = allServiceDates.map((apt) => apt.appointmentDate);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      console.log(`  Service Appointments:`);
      console.log(`    Earliest: ${minDate instanceof Date ? minDate.toISOString() : new Date(minDate).toISOString()}`);
      console.log(`    Latest: ${maxDate instanceof Date ? maxDate.toISOString() : new Date(maxDate).toISOString()}`);
    }

  } catch (error) {
    console.error('❌ Error checking appointment dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointmentDates();


