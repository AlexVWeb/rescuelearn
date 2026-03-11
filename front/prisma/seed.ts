import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du seed...');

  // 1. Création de l'organisme principal
  const organisme = await prisma.organisme.create({
    data: {
      name: 'Administration RescueLearn',
      agreementNumber: 'ADMIN-001',
    },
  });

  console.log('✅ Organisme principal créé !');
  console.log('=============================================');
  console.log(`🏢 Nom : ${organisme.name}`);
  console.log(`🔑 **CODE D'INVITATION : ${organisme.inviteCode}**`);
  console.log('=============================================');
  
  console.log('\nPour devenir SUPER_ADMIN, suivez ces étapes :');
  console.log(`1. Allez sur http://localhost:3000/login`);
  console.log(`2. Créez un compte en utilisant le code d'invitation : ${organisme.inviteCode}`);
  console.log(`3. Une fois le compte créé (vous serez FORMATEUR par défaut), ouvrez Prisma Studio.`);
  console.log(`4. Modifiez votre champ 'roles' pour y mettre : ["FORMATEUR", "SUPER_ADMIN"]`);
  console.log(`5. Vous avez désormais tous les droits locaux !`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Erreur lors du seed :', e);
    await prisma.$disconnect();
    process.exit(1);
  });
