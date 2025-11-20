const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('Available roles in database:');
    console.log('');
    roles.forEach(role => {
      console.log(`  - ${role.name}`);
      console.log(`    ID: ${role.id}`);
      console.log(`    Description: ${role.description || 'N/A'}`);
      console.log('');
    });

    console.log(`Total roles: ${roles.length}`);

    // Find a default role for registration (Staff or Viewer)
    const defaultRole = roles.find(r => r.name === 'Staff' || r.name === 'Viewer');
    if (defaultRole) {
      console.log('\nSuggested default role for registration:');
      console.log(`  Role: ${defaultRole.name}`);
      console.log(`  ID: ${defaultRole.id}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
